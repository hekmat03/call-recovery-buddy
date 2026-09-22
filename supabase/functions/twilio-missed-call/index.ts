// Supabase Edge Function: receives Twilio's voice status callback and logs a
// missed call. This is the real entry point — Twilio calls this URL directly,
// it is not part of the app's normal client/server-fn code path.
//
// Deploy: supabase functions deploy twilio-missed-call --no-verify-jwt
// Set as the "Status Callback URL" on your Twilio number, for these events:
// no-answer, busy, failed (Twilio Console > Phone Numbers > your number > Voice Configuration).
//
// Required secrets (supabase secrets set):
//   TWILIO_AUTH_TOKEN      - from your Twilio console, used to verify the request is really from Twilio
//   SUPABASE_URL           - usually auto-provided
//   SUPABASE_SERVICE_ROLE_KEY - service role key (server-only, never expose client-side)

import { createClient } from "jsr:@supabase/supabase-js@2";

const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/** Verify the request genuinely came from Twilio (X-Twilio-Signature header). */
async function verifyTwilioSignature(req: Request, url: string, params: Record<string, string>): Promise<boolean> {
  const signature = req.headers.get("X-Twilio-Signature");
  if (!signature || !TWILIO_AUTH_TOKEN) return false;

  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) data += key + params[key];

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(TWILIO_AUTH_TOKEN),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === signature;
}

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";

/** Sends a real SMS via Twilio's REST API. */
async function sendSms(to: string, from: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  if (!res.ok) {
    console.error("Twilio send failed", res.status, await res.text());
  }
}

/** Same "looks like spam" heuristic used in createMissedCall — kept in sync manually for now. */
function looksLikeSpamNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return true;
  if (/^(\d)\1+$/.test(digits)) return true;
  const asc = "0123456789";
  const desc = "9876543210";
  if (asc.includes(digits.slice(0, Math.min(6, digits.length)))) return true;
  if (desc.includes(digits.slice(0, Math.min(6, digits.length)))) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) params[key] = String(value);

  const isValid = await verifyTwilioSignature(req, req.url, params);
  if (!isValid) {
    return new Response("Invalid signature", { status: 403 });
  }

  const callStatus = params["CallStatus"]; // e.g. "no-answer", "busy", "failed", "completed"
  const from = params["From"]; // customer's number
  const to = params["To"]; // your business Twilio number
  const callSid = params["CallSid"];

  // Only act on genuinely missed calls, not completed/answered ones.
  const missedStatuses = new Set(["no-answer", "busy", "failed"]);
  if (!missedStatuses.has(callStatus)) {
    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });
  }

  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("id, company_name")
    .eq("phone_number", to)
    .maybeSingle();

  if (bizError || !business) {
    console.error("No business found for Twilio number", to, bizError);
    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });
  }

  const spam = looksLikeSpamNumber(from);

  const windowStart = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("missed_calls")
    .select("id")
    .eq("business_id", business.id)
    .eq("customer_phone", from)
    .gte("date_time", windowStart)
    .limit(1);
  const isDuplicate = Boolean(recent && recent.length > 0);

  const noteParts = [`Twilio CallSid: ${callSid}`];
  if (spam) noteParts.push("Flagged as likely spam (invalid/pattern number)");
  if (isDuplicate) noteParts.push("Duplicate of a call already logged in the last 30 minutes");

  const { data: call, error: callError } = await supabase
    .from("missed_calls")
    .insert({
      business_id: business.id,
      customer_phone: from,
      date_time: new Date().toISOString(),
      source: "twilio",
      status: spam ? "lost" : "new",
      notes: noteParts.join(" · "),
    })
    .select("id")
    .single();

  if (callError) {
    console.error("Failed to insert missed call", callError);
    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });
  }

  if (!spam && !isDuplicate) {
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        business_id: business.id,
        customer_phone: from,
        lead_source: "missed_call",
        status: "new",
        notes: `Auto-created from missed call (Twilio ${callSid})`,
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("Failed to create lead", leadError);
    } else if (lead) {
      await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        business_id: business.id,
        kind: "created",
        to_status: "new",
        note: "Lead created from real missed call (Twilio)",
      });
      await supabase.from("notifications").insert({
        business_id: business.id,
        lead_id: lead.id,
        type: "new_missed_lead",
        title: "New missed call",
        body: `Missed call from ${from}`,
        link: `/leads/${lead.id}`,
      });

      const opening = `Hi, this is ${business.company_name}. Sorry we missed your call! How can we help — and what's going on? Reply STOP to opt out at any time.`;
      await sendSms(from, to, opening);
      await supabase.from("conversations").insert({
        lead_id: lead.id,
        business_id: business.id,
        sender: "ai",
        message: opening,
      });
      await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        business_id: business.id,
        kind: "ai_followup",
        note: "Real opening SMS sent via Twilio",
      });
    }
  }

  // Twilio expects TwiML back; empty response = no further call action.
  return new Response("<Response/>", {
    headers: { "Content-Type": "text/xml" },
  });
});
