import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Real billing via Stripe Checkout. No Stripe SDK dependency required — we
// call Stripe's REST API directly with fetch, same pattern as the Twilio
// edge functions, so there's one less package to install/manage.

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";

// Set these to the real Stripe Price IDs after creating the 3 products in
// your Stripe Dashboard (Products > Add product > add a recurring price).
const PRICE_IDS: Record<"starter" | "growth" | "pro", string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? "",
  growth: process.env.STRIPE_PRICE_GROWTH ?? "",
  pro: process.env.STRIPE_PRICE_PRO ?? "",
};

async function stripeRequest(path: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Stripe request failed");
  return json;
}

const CheckoutInput = z.object({
  businessId: z.string().uuid(),
  plan: z.enum(["starter", "growth", "pro"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckoutInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: biz } = await context.supabase
      .from("businesses")
      .select("stripe_customer_id, company_name")
      .eq("id", data.businessId)
      .single();

    let customerId = biz?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripeRequest("customers", {
        name: biz?.company_name ?? "MissedCall AI customer",
        "metadata[business_id]": data.businessId,
      });
      customerId = customer.id;
      await context.supabase.from("businesses").update({ stripe_customer_id: customerId }).eq("id", data.businessId);
    }

    const session = await stripeRequest("checkout/sessions", {
      customer: customerId!,
      mode: "subscription",
      "line_items[0][price]": PRICE_IDS[data.plan],
      "line_items[0][quantity]": "1",
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      "metadata[business_id]": data.businessId,
      "metadata[plan]": data.plan,
    });

    return { url: session.url as string };
  });

const PortalInput = z.object({ businessId: z.string().uuid(), returnUrl: z.string().url() });

/** Lets an existing customer manage/cancel/upgrade their own subscription. */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PortalInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: biz } = await context.supabase
      .from("businesses")
      .select("stripe_customer_id")
      .eq("id", data.businessId)
      .single();
    if (!biz?.stripe_customer_id) throw new Error("No billing account yet — start a checkout first.");

    const session = await stripeRequest("billing_portal/sessions", {
      customer: biz.stripe_customer_id,
      return_url: data.returnUrl,
    });
    return { url: session.url as string };
  });
