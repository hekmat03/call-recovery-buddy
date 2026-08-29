import { QUALIFICATION_KEYS } from "@/lib/industry-templates";

export type StepState = "waiting" | "in_progress" | "completed" | "failed";

export const WORKFLOW_STEPS = [
  { key: "missed_call", label: "Missed call" },
  { key: "first_response", label: "First response" },
  { key: "collect_details", label: "Collect details" },
  { key: "qualify", label: "Qualify" },
  { key: "notify_owner", label: "Notify owner" },
] as const;

export type WorkflowStepKey = (typeof WORKFLOW_STEPS)[number]["key"];

export const STEP_STATE_LABELS: Record<StepState, string> = {
  waiting: "Waiting",
  in_progress: "In progress",
  completed: "Completed",
  failed: "Failed",
};

export const STEP_STATE_CLASSES: Record<StepState, string> = {
  waiting: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-accent/15 text-accent",
  failed: "bg-destructive/15 text-destructive",
};

export type WorkflowLeadInput = {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  lead_source: string;
  status: string;
  estimated_value: number;
  qualification: unknown;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkflowRow = {
  leadId: string;
  customerName: string;
  customerPhone: string;
  source: string;
  leadStatus: string;
  estimatedValue: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  answered: number;
  totalQuestions: number;
  overall: StepState;
  steps: { key: WorkflowStepKey; label: string; state: StepState }[];
};

function answeredCount(qualification: unknown) {
  if (!qualification || typeof qualification !== "object") return 0;
  const q = qualification as Record<string, unknown>;
  return QUALIFICATION_KEYS.filter((k) => typeof q[k] === "string" && (q[k] as string).trim().length > 0).length;
}

export function deriveWorkflow(
  lead: WorkflowLeadInput,
  messages: { sender: string }[],
): WorkflowRow {
  const lost = lead.status === "lost";
  const aiCount = messages.filter((m) => m.sender === "ai").length;
  const customerCount = messages.filter((m) => m.sender === "customer").length;
  const answered = answeredCount(lead.qualification);
  const total = QUALIFICATION_KEYS.length;
  const qualifiedOrBetter = ["qualified", "booked", "closed"].includes(lead.status);

  const missedCall: StepState = "completed";

  let firstResponse: StepState;
  if (aiCount > 0) firstResponse = "completed";
  else if (lost) firstResponse = "failed";
  else firstResponse = "waiting";

  let collect: StepState;
  if (answered >= total) collect = "completed";
  else if (lost) collect = answered > 0 || customerCount > 0 ? "failed" : "failed";
  else if (answered > 0 || customerCount > 0) collect = "in_progress";
  else if (aiCount > 0) collect = "in_progress";
  else collect = "waiting";

  let qualify: StepState;
  if (qualifiedOrBetter) qualify = "completed";
  else if (lost) qualify = "failed";
  else if (collect === "in_progress") qualify = "in_progress";
  else qualify = "waiting";

  let notify: StepState;
  if (qualifiedOrBetter) notify = "completed";
  else if (lost) notify = "failed";
  else if (qualify === "in_progress") notify = "waiting";
  else notify = "waiting";

  const steps = [
    { key: "missed_call" as const, label: "Missed call", state: missedCall },
    { key: "first_response" as const, label: "First response", state: firstResponse },
    { key: "collect_details" as const, label: "Collect details", state: collect },
    { key: "qualify" as const, label: "Qualify", state: qualify },
    { key: "notify_owner" as const, label: "Notify owner", state: notify },
  ];

  const states = steps.map((s) => s.state);
  const overall: StepState = states.includes("failed")
    ? "failed"
    : states.every((s) => s === "completed")
      ? "completed"
      : states.some((s) => s === "in_progress" || s === "completed") && firstResponse !== "waiting"
        ? "in_progress"
        : "waiting";

  return {
    leadId: lead.id,
    customerName: lead.customer_name ?? "Unknown caller",
    customerPhone: lead.customer_phone,
    source: lead.lead_source,
    leadStatus: lead.status,
    estimatedValue: Number(lead.estimated_value ?? 0),
    isDemo: lead.is_demo,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
    answered,
    totalQuestions: total,
    overall,
    steps,
  };
}
