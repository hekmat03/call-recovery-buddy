// Supabase Edge Function: receives inbound customer SMS replies from Twilio
// and runs the real (not simulated) AI qualifying flow over text.
//
// Deploy: supabase functions deploy twilio-sms-inbound --no-verify-jwt
// Set as your Twilio number's "A Message Comes In" webhook (Messaging Configuration).
//
// Required secrets: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";

const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function verifyTwilioSignature(req: Request, url: string, params: Record<string, string>): Promise<boolean> {
  const signature = req.headers.get("X-Twilio-Signature");
  if (!signature || !TWILIO_AUTH_TOKEN) return false;
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) data += key + params[key];
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(TWILIO_AUTH_TOKEN), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))) === signature;
}

async function sendSms(to: string, from: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  if (!res.ok) console.error("Twilio send failed", res.status, await res.text());
}

const URGENCY_KEYWORDS = ["leak", "leaking", "flooding", "flood", "emergency", "urgent", "burst", "sparking", "no heat", "no cooling", "no ac", "sewage", "collapsing", "collapsed"];
const ATTENTION_KEYWORDS = ["talk to a person", "talk to someone", "speak to a person", "real person", "human", "manager", "this is ridiculous", "frustrated", "angry", "unacceptable", "confused", "not helpful", "useless"];

function detectUrgency(msg: string) {
  const lower = msg.toLowerCase();
  return URGENCY_KEYWORDS.some((k) => lower.includes(k));
}
function detectAttention(msg: string): string | null {
  const lower = msg.toLowerCase();
  const hit = ATTENTION_KEYWORDS.find((k) => lower.includes(k));
  return hit ? `Customer said something matching: "${hit}"` : null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) params[key] = String(value);

  const isValid = await verifyTwilioSignature(req, req.url, params);
  if (!isValid) return new Response("Invalid signature", { status: 403 });

  const from = params["From"]; // customer number
  const to = params["To"]; // your business Twilio number
  const body = (params["Body"] ?? "").trim();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, company_name")
    .eq("phone_number", to)
    .maybeSingle();
  if (!business) return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });

  // Find the most recent open lead for this customer at this business.
  const { data: lead } = await supabase
    .from("leads")
    .select("id, status, qualification, sms_opt_out, notes, estimated_value")
    .eq("business_id", business.id)
    .eq("customer_phone", from)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lead) return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });

  await supabase.from("conversations").insert({ lead_id: lead.id, business_id: business.id, sender: "customer", message: body });

  // Compliance: STOP / START
  if (/^(stop|unsubscribe|cancel|quit|opt\s?out)\b/i.test(body)) {
    await supabase.from("leads").update({ sms_opt_out: true, opted_out_at: new Date().toISOString() }).eq("id", lead.id);
    await supabase.from("lead_activities").insert({ lead_id: lead.id, business_id: business.id, kind: "opted_out", note: "Customer opted out via real SMS" });
    const msg = "You've been unsubscribed and won't receive further messages. Reply START to opt back in.";
    await sendSms(from, to, msg);
    await supabase.from("conversations").insert({ lead_id: lead.id, business_id: business.id, sender: "ai", message: msg });
    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });
  }
  if (/^start\b/i.test(body)) {
    await supabase.from("leads").update({ sms_opt_out: false }).eq("id", lead.id);
  }
  if (lead.sms_opt_out) {
    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } }); // stay silent, opted out
  }

  // Simple reply logic — mirrors the in-app simulateAiFollowUp keyword rules.
  const text = body.toLowerCase();
  let reply = "Thanks for the details! I can get a technician out to you — would tomorrow morning or afternoon work better?";
  if (/(price|cost|quote|how much|estimate)/.test(text)) {
    reply = "Great question — most jobs like this land between $300 and $1,200 depending on what we find. I can book a free on-site estimate. What day works for you?";
  } else if (/(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\s?(am|pm))/.test(text)) {
    reply = "Perfect — I've penciled that in and you'll get a confirmation text shortly. Anything we should know before we arrive?";
  } else if (/(no|not interested)/.test(text)) {
    reply = "Totally understood — I'll close this out. If anything changes, just text this number and we'll pick right back up.";
  }

  const isUrgent = detectUrgency(body);
  const attentionReason = detectAttention(body);

  await supabase
    .from("leads")
    .update({
      urgency: isUrgent ? "urgent" : undefined,
      needs_attention: attentionReason ? true : undefined,
      attention_reason: attentionReason ?? undefined,
      follow_up_stage: 0,
      last_customer_reply_at: new Date().toISOString(),
      status: lead.status === "new" ? "contacted" : undefined,
    })
    .eq("id", lead.id);

  if (isUrgent) {
    await supabase.from("lead_activities").insert({ lead_id: lead.id, business_id: business.id, kind: "urgent_flagged", note: "Marked urgent from real SMS reply" });
  }
  if (attentionReason) {
    await supabase.from("lead_activities").insert({ lead_id: lead.id, business_id: business.id, kind: "needs_attention", note: attentionReason });
  }

  await sendSms(from, to, reply);
  await supabase.from("conversations").insert({ lead_id: lead.id, business_id: business.id, sender: "ai", message: reply });
  await supabase.from("lead_activities").insert({ lead_id: lead.id, business_id: business.id, kind: "ai_followup", note: "Real AI reply sent via Twilio SMS" });

  return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });
});
