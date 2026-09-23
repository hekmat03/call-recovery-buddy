// Supabase Edge Function: Stripe webhook. Keeps businesses.plan and
// businesses.subscription_status in sync with what actually happened in Stripe.
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// In Stripe Dashboard > Developers > Webhooks, add an endpoint pointing at
// this function's URL, listening for: checkout.session.completed,
// customer.subscription.updated, customer.subscription.deleted.
//
// Required secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Maps a Stripe Price ID back to our internal plan name. Fill these in with
// the same Price IDs used in billing.functions.ts (STRIPE_PRICE_STARTER, etc).
const PRICE_TO_PLAN: Record<string, "starter" | "growth" | "pro"> = {
  [Deno.env.get("STRIPE_PRICE_STARTER") ?? "starter_placeholder"]: "starter",
  [Deno.env.get("STRIPE_PRICE_GROWTH") ?? "growth_placeholder"]: "growth",
  [Deno.env.get("STRIPE_PRICE_PRO") ?? "pro_placeholder"]: "pro",
};

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? "", STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const businessId = session.metadata?.business_id;
      const plan = session.metadata?.plan as "starter" | "growth" | "pro" | undefined;
      if (businessId) {
        await supabase
          .from("businesses")
          .update({
            stripe_subscription_id: (session.subscription as string) ?? null,
            plan: plan ?? "trial",
            subscription_status: "active",
          })
          .eq("id", businessId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const plan = priceId ? PRICE_TO_PLAN[priceId] : undefined;
      const status = mapStripeStatus(sub.status);
      await supabase
        .from("businesses")
        .update({ subscription_status: status, ...(plan ? { plan } : {}) })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("businesses")
        .update({ subscription_status: "canceled", plan: "trial" })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
    default:
      break; // ignore events we don't care about
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

function mapStripeStatus(status: Stripe.Subscription.Status): "trialing" | "active" | "past_due" | "canceled" | "inactive" {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled") return "canceled";
  return "inactive";
}
