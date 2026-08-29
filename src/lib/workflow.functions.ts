import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { deriveWorkflow, type WorkflowLeadInput, type WorkflowRow } from "@/lib/workflow";

export const listWorkflows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<WorkflowRow[]> => {
    const { data: leads, error } = await context.supabase
      .from("leads")
      .select(
        "id,customer_name,customer_phone,lead_source,status,estimated_value,qualification,is_demo,created_at,updated_at",
      )
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const ids = (leads ?? []).map((l) => l.id);
    let msgs: { lead_id: string; sender: string }[] = [];
    if (ids.length) {
      const { data: rows, error: msgErr } = await context.supabase
        .from("conversations")
        .select("lead_id,sender")
        .eq("business_id", data.businessId)
        .in("lead_id", ids);
      if (msgErr) throw msgErr;
      msgs = rows ?? [];
    }

    const byLead = new Map<string, { sender: string }[]>();
    for (const m of msgs) {
      const list = byLead.get(m.lead_id) ?? [];
      list.push({ sender: m.sender });
      byLead.set(m.lead_id, list);
    }

    return (leads ?? []).map((l) =>
      deriveWorkflow(l as unknown as WorkflowLeadInput, byLead.get(l.id) ?? []),
    );
  });
