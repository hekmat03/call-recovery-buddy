import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { detectHumanAttentionNeeded, detectUrgency } from "@/lib/industry-templates";

// Every function below runs as the signed-in user via requireSupabaseAuth,
// so RLS enforces "only the owner of a business can see its data". No manual
// ownership checks needed in application code — RLS is the boundary.

export const listMyBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("businesses")
      .select("id, company_name, industry, phone_number, service_area, business_hours")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((b) => ({
      role: "owner" as const,
      business: {
        id: b.id,
        name: b.company_name,
        industry: b.industry,
        phone: b.phone_number,
        serviceArea: b.service_area,
        businessHours: b.business_hours,
      },
    }));
  });

const BusinessScope = z.object({ businessId: z.string().uuid() });

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BusinessScope.parse(input))
  .handler(async ({ context, data }) => {
    const { data: leads, error } = await context.supabase
      .from("leads")
      .select(
        "id, customer_name, customer_phone, customer_email, lead_source, status, estimated_value, notes, created_at, urgency, needs_attention, attention_reason",
      )
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return leads ?? [];
  });

export const getStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BusinessScope.parse(input))
  .handler(async ({ context, data }) => {
    // Fetch every lead for this business so totals are real, not 7-day-limited.
    const { data: leads, error } = await context.supabase
      .from("leads")
      .select("status, estimated_value, created_at, urgency, needs_attention")
      .eq("business_id", data.businessId);
    if (error) throw error;

    const rows = leads ?? [];
    const totalLeads = rows.length;
    const newLeads = rows.filter((r) => r.status === "new").length;
    const followUpsPending = rows.filter(
      (r) => r.status === "contacted" || r.status === "qualified",
    ).length;
    const urgentLeads = rows.filter((r) => r.urgency === "urgent").length;
    const needsAttentionLeads = rows.filter((r) => r.needs_attention).length;
    const booked = rows.filter((r) => r.status === "booked");
    const revenueRecovered = rows
      .filter((r) => r.status === "booked" || r.status === "closed")
      .reduce((s, r) => s + (r.estimated_value ?? 0), 0);

    // 7-day recovered-revenue series for the trend chart
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recent = rows.filter((r) => r.created_at >= since);
    const days: { d: string; recovered: number; revenue: number }[] = [];
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const inDay = recent.filter(
        (r) => new Date(r.created_at) >= day && new Date(r.created_at) < next,
      );
      const dayBooked = inDay.filter((r) => r.status === "booked");
      days.push({
        d: names[day.getDay()],
        recovered: dayBooked.length,
        revenue: dayBooked.reduce((s, r) => s + (r.estimated_value ?? 0), 0),
      });
    }

    return {
      totalLeads,
      newLeads,
      followUpsPending,
      urgentLeads,
      needsAttentionLeads,
      booked: booked.length,
      revenueRecovered,
      // 30-day leads-over-time series + status distribution
      leadsSeries: (() => {
        const out: { date: string; label: string; leads: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const day = new Date();
          day.setHours(0, 0, 0, 0);
          day.setDate(day.getDate() - i);
          const next = new Date(day);
          next.setDate(next.getDate() + 1);
          out.push({
            date: day.toISOString().slice(0, 10),
            label: `${day.getMonth() + 1}/${day.getDate()}`,
            leads: rows.filter(
              (r) => new Date(r.created_at) >= day && new Date(r.created_at) < next,
            ).length,
          });
        }
        return out;
      })(),
      statusDistribution: (
        ["new", "contacted", "qualified", "booked", "closed", "lost"] as const
      ).map((s) => ({ status: s, count: rows.filter((r) => r.status === s).length })),
      // Back-compat aliases kept for any existing consumers
      missed: totalLeads,
      conversations: rows.filter(
        (r) =>
          r.status === "contacted" ||
          r.status === "qualified" ||
          r.status === "booked" ||
          r.status === "closed",
      ).length,
      revenue: revenueRecovered,
      series: days,
    };
  });

const LeadIdInput = z.object({ leadId: z.string().uuid() });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LeadIdInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: msgs, error } = await context.supabase
      .from("conversations")
      .select("id, sender, message, created_at")
      .eq("lead_id", data.leadId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return msgs ?? [];
  });

const SendMessageInput = z.object({
  leadId: z.string().uuid(),
  businessId: z.string().uuid(),
  body: z.string().trim().min(1).max(1000),
});

export const listRecentConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BusinessScope.parse(input))
  .handler(async ({ context, data }) => {
    const { data: msgs, error } = await context.supabase
      .from("conversations")
      .select("id, sender, message, created_at, lead_id, leads(customer_name, customer_phone)")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    return (msgs ?? []).map((m) => ({
      id: m.id,
      leadId: m.lead_id,
      sender: m.sender,
      message: m.message,
      createdAt: m.created_at,
      customerName: (m.leads as { customer_name: string | null } | null)?.customer_name ?? null,
      customerPhone: (m.leads as { customer_phone: string | null } | null)?.customer_phone ?? null,
    }));
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendMessageInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: msg, error } = await context.supabase
      .from("conversations")
      .insert({
        lead_id: data.leadId,
        business_id: data.businessId,
        sender: "business" as const,
        message: data.body,
      })
      .select("id, sender, message, created_at")
      .single();
    if (error) throw error;
    return msg;
  });

const CreateBusinessInput = z.object({
  name: z.string().trim().min(1).max(120),
  industry: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(40).optional(),
  serviceArea: z.string().trim().max(160).optional(),
  businessHours: z.string().trim().max(160).optional(),
});

export const createBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateBusinessInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: biz, error } = await context.supabase
      .from("businesses")
      .insert({
        company_name: data.name,
        industry: data.industry ?? null,
        phone_number: data.phone ?? null,
        service_area: data.serviceArea ?? null,
        business_hours: data.businessHours ?? null,
        user_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return biz;
  });

const MissedCallScope = z.object({ businessId: z.string().uuid() });

export const listMissedCalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MissedCallScope.parse(input))
  .handler(async ({ context, data }) => {
    const { data: calls, error } = await context.supabase
      .from("missed_calls")
      .select("id, customer_name, customer_phone, date_time, source, status, notes")
      .eq("business_id", data.businessId)
      .order("date_time", { ascending: false })
      .limit(50);
    if (error) throw error;
    return calls ?? [];
  });

const UpdateBusinessInput = z.object({
  businessId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  industry: z.string().trim().max(60).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  serviceArea: z.string().trim().max(160).nullable().optional(),
  businessHours: z.string().trim().max(160).nullable().optional(),
});

export const updateBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateBusinessInput.parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("businesses")
      .update({
        company_name: data.name,
        industry: data.industry ?? null,
        phone_number: data.phone ?? null,
        service_area: data.serviceArea ?? null,
        business_hours: data.businessHours ?? null,
      })
      .eq("id", data.businessId);
    if (error) throw error;
    return { ok: true };
  });

const UpdateLeadStatusInput = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["new", "contacted", "qualified", "booked", "closed", "lost"]),
});

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateLeadStatusInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: prev } = await context.supabase
      .from("leads")
      .select("status, business_id")
      .eq("id", data.leadId)
      .single();
    const { error } = await context.supabase
      .from("leads")
      .update({ status: data.status })
      .eq("id", data.leadId);
    if (error) throw error;
    if (prev && prev.status !== data.status) {
      await context.supabase.from("lead_activities").insert({
        lead_id: data.leadId,
        business_id: prev.business_id,
        kind: "status_change",
        from_status: prev.status,
        to_status: data.status,
      });
    }
    return { ok: true };
  });

const UpdateCallStatusInput = z.object({
  callId: z.string().uuid(),
  status: z.enum(["new", "contacted", "qualified", "booked", "closed", "lost"]),
});

export const updateMissedCallStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateCallStatusInput.parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("missed_calls")
      .update({ status: data.status })
      .eq("id", data.callId);
    if (error) throw error;
    return { ok: true };
  });

const CreateMissedCallInput = z.object({
  businessId: z.string().uuid(),
  customerName: z.string().trim().max(120).optional(),
  customerPhone: z.string().trim().min(3).max(40),
  dateTime: z.string().optional(),
  source: z.string().trim().min(1).max(40).default("phone"),
  status: z.enum(["new", "contacted", "qualified", "booked", "closed", "lost"]).default("new"),
  notes: z.string().trim().max(1000).optional(),
  createLead: z.boolean().default(true),
});

export const createMissedCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateMissedCallInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: call, error } = await context.supabase
      .from("missed_calls")
      .insert({
        business_id: data.businessId,
        customer_name: data.customerName || null,
        customer_phone: data.customerPhone,
        date_time: data.dateTime ? new Date(data.dateTime).toISOString() : new Date().toISOString(),
        source: data.source,
        status: data.status,
        notes: data.notes || null,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (data.createLead) {
      const { data: lead } = await context.supabase
        .from("leads")
        .insert({
          business_id: data.businessId,
          customer_name: data.customerName || null,
          customer_phone: data.customerPhone,
          lead_source: "missed_call" as const,
          status: data.status,
          notes: data.notes || null,
        })
        .select("id")
        .single();
      if (lead) {
        await context.supabase.from("lead_activities").insert({
          lead_id: lead.id,
          business_id: data.businessId,
          kind: "created",
          to_status: data.status,
          note: "Lead created from missed call",
        });
      }
    }
    return call;
  });

export const getLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LeadIdInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: lead, error } = await context.supabase
      .from("leads")
      .select(
        "id, business_id, customer_name, customer_phone, customer_email, lead_source, status, estimated_value, notes, created_at, updated_at, urgency, needs_attention, attention_reason, follow_up_stage, last_customer_reply_at",
      )
      .eq("id", data.leadId)
      .maybeSingle();
    if (error) throw error;
    return lead;
  });

export const listLeadActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LeadIdInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("lead_activities")
      .select("id, kind, from_status, to_status, note, created_at")
      .eq("lead_id", data.leadId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

const UpdateLeadInput = z.object({
  leadId: z.string().uuid(),
  customerName: z.string().trim().max(120).nullable().optional(),
  customerPhone: z.string().trim().min(3).max(40),
  customerEmail: z.string().trim().max(160).nullable().optional(),
  leadSource: z.enum(["missed_call", "website_chat", "manual_entry", "referral"]),
  estimatedValue: z.number().min(0).max(10_000_000),
});

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateLeadInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: lead, error } = await context.supabase
      .from("leads")
      .update({
        customer_name: data.customerName || null,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail || null,
        lead_source: data.leadSource,
        estimated_value: data.estimatedValue,
      })
      .eq("id", data.leadId)
      .select("business_id")
      .single();
    if (error) throw error;
    await context.supabase.from("lead_activities").insert({
      lead_id: data.leadId,
      business_id: lead.business_id,
      kind: "details_updated",
      note: "Customer details updated",
    });
    return { ok: true };
  });

const AppendNoteInput = z.object({
  leadId: z.string().uuid(),
  note: z.string().trim().min(1).max(2000),
});

export const appendLeadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AppendNoteInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: lead, error: readError } = await context.supabase
      .from("leads")
      .select("notes, business_id")
      .eq("id", data.leadId)
      .single();
    if (readError) throw readError;

    const stamp = new Date().toISOString();
    const entry = `[${stamp}] ${data.note}`;
    const next = lead.notes ? `${lead.notes}\n${entry}` : entry;

    const { error } = await context.supabase
      .from("leads")
      .update({ notes: next })
      .eq("id", data.leadId);
    if (error) throw error;

    await context.supabase.from("lead_activities").insert({
      lead_id: data.leadId,
      business_id: lead.business_id,
      kind: "note",
      note: data.note,
    });
    return { notes: next };
  });

const SimulateInput = z.object({
  leadId: z.string().uuid(),
  businessId: z.string().uuid(),
  customerMessage: z.string().trim().min(1).max(1000),
});

// Simulated AI follow-up: no external API calls. A deterministic reply is
// picked from local templates and stored in the conversations table.
export const simulateAiFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SimulateInput.parse(input))
  .handler(async ({ context, data }) => {
    const { error: custError } = await context.supabase.from("conversations").insert({
      lead_id: data.leadId,
      business_id: data.businessId,
      sender: "customer" as const,
      message: data.customerMessage,
    });
    if (custError) throw custError;

    const text = data.customerMessage.toLowerCase();
    let reply =
      "Thanks for the details! I can get a technician out to you — would tomorrow morning or afternoon work better?";
    if (/(price|cost|quote|how much|estimate)/.test(text)) {
      reply =
        "Great question — most jobs like this land between $300 and $1,200 depending on what we find. I can book a free on-site estimate. What day works for you?";
    } else if (/(emergency|urgent|asap|leak|flood|now)/.test(text)) {
      reply =
        "That sounds urgent — I'm flagging this as priority. Can someone be on site in the next 2 hours? Reply YES and I'll dispatch right away.";
    } else if (/(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\s?(am|pm))/.test(text)) {
      reply =
        "Perfect — I've penciled that in and you'll get a confirmation text shortly. Anything we should know before we arrive?";
    } else if (/(no|not interested|stop)/.test(text)) {
      reply =
        "Totally understood — I'll close this out. If anything changes, just text this number and we'll pick right back up.";
    }

    const { data: aiMsg, error: aiError } = await context.supabase
      .from("conversations")
      .insert({
        lead_id: data.leadId,
        business_id: data.businessId,
        sender: "ai" as const,
        message: reply,
      })
      .select("id, sender, message, created_at")
      .single();
    if (aiError) throw aiError;

    await context.supabase.from("lead_activities").insert({
      lead_id: data.leadId,
      business_id: data.businessId,
      kind: "ai_followup",
      note: "AI follow-up simulated",
    });

    // Urgency + human-attention detection, and follow-up tracking, on every reply.
    const { data: leadRow } = await context.supabase
      .from("leads")
      .select("urgency, needs_attention, status, customer_name, customer_phone")
      .eq("id", data.leadId)
      .single();

    const isUrgent = leadRow?.urgency === "urgent" || detectUrgency(data.customerMessage);
    const attentionReason = detectHumanAttentionNeeded(data.customerMessage);
      
