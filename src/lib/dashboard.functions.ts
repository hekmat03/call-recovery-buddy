import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
        "id, customer_name, customer_phone, customer_email, lead_source, status, estimated_value, notes, created_at",
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
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: leads, error } = await context.supabase
      .from("leads")
      .select("status, estimated_value, created_at")
      .eq("business_id", data.businessId)
      .gte("created_at", since);
    if (error) throw error;

    const rows = leads ?? [];
    const booked = rows.filter((r) => r.status === "booked");
    const engaged = rows.filter((r) =>
      r.status === "contacted" || r.status === "qualified" || r.status === "booked" || r.status === "closed",
    );
    const revenue = booked.reduce((s, r) => s + (r.estimated_value ?? 0), 0);

    // Build a 7-day series
    const days: { d: string; recovered: number; revenue: number }[] = [];
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const inDay = rows.filter(
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
      missed: rows.length,
      conversations: engaged.length,
      booked: booked.length,
      revenue,
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
  status: z.enum(["new", "engaged", "booked", "lost"]),
});

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateLeadStatusInput.parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("leads")
      .update({ status: data.status })
      .eq("id", data.leadId);
    if (error) throw error;
    return { ok: true };
  });

const UpdateCallStatusInput = z.object({
  callId: z.string().uuid(),
  status: z.enum(["pending", "contacted", "recovered", "lost"]),
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