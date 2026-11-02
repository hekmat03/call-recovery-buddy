import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Appointments run as the signed-in user via requireSupabaseAuth, so RLS
// ("only the owner of a business can see its appointments") is the boundary.
// No manual ownership checks needed in application code.

const BusinessScope = z.object({ businessId: z.string().uuid() });

export const listAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BusinessScope.parse(input))
  .handler(async ({ context, data }) => {
    const { data: appts, error } = await context.supabase
      .from("appointments")
      .select("id, lead_id, customer_name, customer_phone, preferred_at, notes, status, created_at")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return appts ?? [];
  });

const RequestAppointmentInput = z.object({
  leadId: z.string().uuid(),
  businessId: z.string().uuid(),
});

/** Creates an appointment request (status "requested") for an existing lead. */
export const requestAppointmentFromLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RequestAppointmentInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: lead, error: leadError } = await context.supabase
      .from("leads")
      .select("customer_name, customer_phone")
      .eq("id", data.leadId)
      .single();
    if (leadError) throw leadError;

    const { data: appt, error } = await context.supabase
      .from("appointments")
      .insert({
        business_id: data.businessId,
        lead_id: data.leadId,
        customer_name: lead.customer_name,
        customer_phone: lead.customer_phone,
        notes: "Appointment request created from lead detail",
        status: "requested" as const,
      })
      .select("id, lead_id, customer_name, customer_phone, preferred_at, notes, status, created_at")
      .single();
    if (error) throw error;

    await context.supabase.from("lead_activities").insert({
      lead_id: data.leadId,
      business_id: data.businessId,
      kind: "appointment_requested",
      note: "Appointment request created",
    });

    return appt;
  });

const ConfirmAppointmentInput = z.object({
  appointmentId: z.string().uuid(),
  businessId: z.string().uuid(),
  preferredAt: z.string().datetime(),
});

/** Confirms an appointment for a date/time and moves its lead to "booked". */
export const confirmAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ConfirmAppointmentInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: appt, error } = await context.supabase
      .from("appointments")
      .update({ status: "scheduled" as const, preferred_at: data.preferredAt })
      .eq("id", data.appointmentId)
      .eq("business_id", data.businessId)
      .select("id, lead_id")
      .single();
    if (error) throw error;

    // Confirming the visit is what books the lead, so keep the lead in step
    // with the appointment (the UI invalidates lead/stats after confirming).
    if (appt.lead_id) {
      const { data: lead } = await context.supabase
        .from("leads")
        .select("status")
        .eq("id", appt.lead_id)
        .single();
      if (lead && lead.status !== "booked") {
        await context.supabase.from("leads").update({ status: "booked" }).eq("id", appt.lead_id);
        await context.supabase.from("lead_activities").insert({
          lead_id: appt.lead_id,
          business_id: data.businessId,
          kind: "status_change",
          from_status: lead.status,
          to_status: "booked",
          note: "Appointment confirmed",
        });
      }
    }

    return { ok: true };
  });
