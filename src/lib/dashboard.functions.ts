import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Every function below runs as the signed-in user via requireSupabaseAuth,
// so RLS enforces "only members of a business can see its data". No manual
// business-membership checks needed in application code — RLS is the boundary.

export const listMyBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("business_members")
      .select("role, businesses:business_id ( id, name, industry, phone )")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      role: r.role as "owner" | "admin" | "agent",
      business: r.businesses as {
        id: string;
        name: string;
        industry: string | null;
        phone: string | null;
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
      .select("id, name, phone, issue, status, estimated_value, created_at")
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
    const engaged = rows.filter((r) => r.status === "engaged" || r.status === "booked");
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
      .from("messages")
      .select("id, direction, body, created_at")
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
      .from("messages")
      .insert({
        lead_id: data.leadId,
        business_id: data.businessId,
        direction: "out",
        body: data.body,
      })
      .select("id, direction, body, created_at")
      .single();
    if (error) throw error;
    return msg;
  });

const CreateBusinessInput = z.object({
  name: z.string().trim().min(1).max(120),
  industry: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(40).optional(),
});

export const createBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateBusinessInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: biz, error } = await context.supabase
      .from("businesses")
      .insert({
        name: data.name,
        industry: data.industry ?? null,
        phone: data.phone ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    const { error: memErr } = await context.supabase
      .from("business_members")
      .insert({ business_id: biz.id, user_id: context.userId, role: "owner" });
    if (memErr) throw memErr;
    return biz;
  });