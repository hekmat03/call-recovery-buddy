import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Bot, CalendarClock, Clock, History, Send, Sparkles, StickyNote, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AppShell, useMyBusiness } from "@/components/app/shell";
import { EmptyState, StatusPill, sourceLabel, statusLabel, timeAgo } from "@/components/app/bits";
import {
  appendLeadNote,
  getLead,
  listLeadActivity,
  listMessages,
  sendFollowUpReminder,
  sendMessage,
  simulateAiFollowUp,
  updateLead,
  updateLeadStatus,
} from "@/lib/dashboard.functions";
import { confirmAppointment, listAppointments, requestAppointmentFromLead } from "@/lib/appointments.functions";

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  head: () => ({
    meta: [
      { title: "Lead detail — MissedCall AI" },
      { name: "description", content: "Full customer record, notes, status history, and AI follow-up conversation." },
      { property: "og:title", content: "Lead detail — MissedCall AI" },
      { property: "og:description", content: "Edit lead details, log notes, and run simulated AI follow-ups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadDetailPage,
});

const STATUSES = ["new", "contacted", "qualified", "booked", "closed", "lost"] as const;
const SOURCES = ["missed_call", "website_chat", "manual_entry", "referral"] as const;

function LeadDetailPage() {
  const business = useMyBusiness();
  const { leadId } = Route.useParams();
  const fetchLead = useServerFn(getLead);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => fetchLead({ data: { leadId } }),
  });

  return (
    <AppShell
      title={lead?.customer_name ?? "Lead detail"}
      subtitle={lead?.customer_phone ?? "Customer record"}
      business={business}
      action={
        <Link to="/leads" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to leads
        </Link>
      }
    >
      {isLoading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading lead…</div>
      ) : !lead ? (
        <div className="p-10">
          <EmptyState title="Lead not found" hint="It may have been deleted or belongs to another workspace." />
        </div>
      ) : (
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.1fr] lg:p-8">
          <div className="space-y-5">
            <DetailsCard lead={lead} />
            <AppointmentCard lead={lead} />
            <NotesCard lead={lead} />
            <ActivityCard leadId={lead.id} />
          </div>
          <Conversation leadId={lead.id} businessId={lead.business_id} />
        </div>
      )}
    </AppShell>
  );
}

type Lead = NonNullable<Awaited<ReturnType<typeof getLead>>>;

function DetailsCard({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const save = useServerFn(updateLead);
  const setStatus = useServerFn(updateLeadStatus);
  const [form, setForm] = useState({
    customerName: lead.customer_name ?? "",
    customerPhone: lead.customer_phone,
    customerEmail: lead.customer_email ?? "",
    leadSource: lead.lead_source,
    estimatedValue: String(lead.estimated_value ?? 0),
  });

  useEffect(() => {
    setForm({
      customerName: lead.customer_name ?? "",
      customerPhone: lead.customer_phone,
      customerEmail: lead.customer_email ?? "",
      leadSource: lead.lead_source,
      estimatedValue: String(lead.estimated_value ?? 0),
    });
  }, [lead]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["lead-activity", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          leadId: lead.id,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail,
          leadSource: form.leadSource,
          estimatedValue: Number(form.estimatedValue) || 0,
        },
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Lead details saved");
    },
    onError: (e: unknown) => toast.error("Could not save", { description: String(e) }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: (typeof STATUSES)[number]) => setStatus({ data: { leadId: lead.id, status } }),
    onSuccess: () => {
      invalidate();
      toast.success("Status updated");
    },
    onError: (e: unknown) => toast.error("Could not update status", { description: String(e) }),
  });

  return (
    <Card className="space-y-4 border-border/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Customer details</h2>
          <p className="text-xs text-muted-foreground">
            Created {timeAgo(lead.created_at)} · {sourceLabel(lead.lead_source)}
          </p>
        </div>
        <StatusPill status={lead.status} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
        </Field>
        <Field label="Estimated value ($)">
          <Input
            type="number"
            min={0}
            value={form.estimatedValue}
            onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
          />
        </Field>
        <Field label="Source">
          <select
            value={form.leadSource}
            onChange={(e) => setForm({ ...form, leadSource: e.target.value as (typeof SOURCES)[number] })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>{sourceLabel(s)}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={lead.status}
            onChange={(e) => statusMutation.mutate(e.target.value as (typeof STATUSES)[number])}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
        </Field>
      </div>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">
        {saveMutation.isPending ? "Saving…" : "Save details"}
      </Button>
    </Card>
  );
}

function AppointmentCard({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const fetchAppts = useServerFn(listAppointments);
  const requestAppt = useServerFn(requestAppointmentFromLead);
  const confirmAppt = useServerFn(confirmAppointment);
  const [when, setWhen] = useState("");

  const { data: appts = [] } = useQuery({
    queryKey: ["appointments", lead.business_id],
    queryFn: () => fetchAppts({ data: { businessId: lead.business_id } }),
  });

  const appt = appts.find((a) => a.lead_id === lead.id && (a.status === "requested" || a.status === "scheduled"));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["appointments", lead.business_id] });
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["lead-activity", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };

  const create = useMutation({
    mutationFn: () => requestAppt({ data: { leadId: lead.id, businessId: lead.business_id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Appointment request created");
    },
    onError: (e: unknown) => toast.error("Could not create appointment", { description: String(e) }),
  });

  const confirm = useMutation({
    mutationFn: () => confirmAppt({ data: { appointmentId: appt!.id, businessId: lead.business_id, preferredAt: new Date(when).toISOString() } }),
    onSuccess: () => {
      invalidate();
      toast.success("Appointment confirmed");
    },
    onError: (e: unknown) => toast.error("Could not confirm", { description: String(e) }),
  });

  // Only relevant once a lead is qualified, or an appointment already exists.
  if (lead.status !== "qualified" && lead.status !== "booked" && !appt) return null;

  return (
    <Card className="space-y-4 border-border/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Appointment</h2>
        </div>
        {appt && (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
            {appt.status}
          </span>
        )}
      </div>

      {!appt ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            This lead is qualified — create an appointment request to move it toward booked.
          </p>
          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create appointment request"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {lead.customer_name ?? "Customer"} · {lead.customer_phone}
          </p>
          {appt.status === "scheduled" && appt.preferred_at ? (
            <p className="text-sm">
              Confirmed for <span className="font-medium">{new Date(appt.preferred_at).toLocaleString()}</span>
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Confirm date & time">
                <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              </Field>
              <Button size="sm" onClick={() => confirm.mutate()} disabled={!when || confirm.isPending}>
                {confirm.isPending ? "Confirming…" : "Confirm appointment"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const NOTE_LINE = /^\[([^\]]+)\]\s?([\s\S]*)$/;

function NotesCard({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const addNote = useServerFn(appendLeadNote);
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => addNote({ data: { leadId: lead.id, note } }),
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["lead-activity", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Note added");
    },
    onError: (e: unknown) => toast.error("Could not add note", { description: String(e) }),
  });

  const entries = (lead.notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse();

  return (
    <Card className="space-y-4 border-border/60 p-5">
      <div className="flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Notes</h2>
      </div>

      <div className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Add a note — it's appended with a timestamp, never overwritten."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button size="sm" onClick={() => mutation.mutate()} disabled={!note.trim() || mutation.isPending}>
          {mutation.isPending ? "Adding…" : "Append note"}
        </Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState title="No notes yet" hint="Notes you append here stay on the customer record." />
      ) : (
        <ul className="space-y-3">
          {entries.map((line, i) => {
            const match = NOTE_LINE.exec(line);
            const stamp = match?.[1];
            const body = match?.[2] ?? line;
            return (
              <li key={`${i}-${line.slice(0, 12)}`} className="border-l-2 border-primary/40 pl-3">
                <p className="text-sm">{body}</p>
                <p className="text-[11px] text-muted-foreground">
                  {stamp ? new Date(stamp).toLocaleString() : "Earlier note"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ActivityCard({ leadId }: { leadId: string }) {
  const fetchActivity = useServerFn(listLeadActivity);
  const { data: rows = [] } = useQuery({
    queryKey: ["lead-activity", leadId],
    queryFn: () => fetchActivity({ data: { leadId } }),
  });

  return (
    <Card className="space-y-4 border-border/60 p-5">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold">Activity timeline</h2>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No activity yet" hint="Status changes, notes, and AI follow-ups appear here." />
      ) : (
        <ol className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-sm">{activityText(r)}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function activityText(r: {
  kind: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
}) {
  if (r.kind === "status_change") {
    return `Status changed from ${statusLabel(r.from_status ?? "")} to ${statusLabel(r.to_status ?? "")}`;
  }
  if (r.kind === "note") return `Note added: ${r.note ?? ""}`;
  if (r.kind === "ai_followup") return "AI follow-up message sent";
  if (r.kind === "created") return r.note ?? "Lead created";
  return r.note ?? "Lead updated";
}

function Conversation({ leadId, businessId }: { leadId: string; businessId: string }) {
  const qc = useQueryClient();
  const fetchMessages = useServerFn(listMessages);
  const send = useServerFn(sendMessage);
  const simulate = useServerFn(simulateAiFollowUp);
  const remind = useServerFn(sendFollowUpReminder);
  const [text, setText] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", leadId],
    queryFn: () => fetchMessages({ data: { leadId } }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["messages", leadId] });
    qc.invalidateQueries({ queryKey: ["lead-activity", leadId] });
    qc.invalidateQueries({ queryKey: ["recent-conversations"] });
  };

  const businessMsg = useMutation({
    mutationFn: () => send({ data: { leadId, businessId, body: text } }),
    onSuccess: () => {
      setText("");
      refresh();
    },
    onError: (e: unknown) => toast.error("Could not send", { description: String(e) }),
  });

  const aiSim = useMutation({
    mutationFn: () => simulate({ data: { leadId, businessId, customerMessage: text } }),
    onSuccess: () => {
      setText("");
      refresh();
      toast.success("AI follow-up simulated");
    },
    onError: (e: unknown) => toast.error("Simulation failed", { description: String(e) }),
  });

  const followUp = useMutation({
    mutationFn: () => remind({ data: { leadId, businessId } }),
    onSuccess: (res) => {
      refresh();
      if (res.sent) toast.success(`Reminder #${res.stage} sent (simulated no reply)`);
      else toast.message(res.reason ?? "No reminder sent");
    },
    onError: (e: unknown) => toast.error("Could not simulate follow-up", { description: String(e) }),
  });

  const pending = businessMsg.isPending || aiSim.isPending || followUp.isPending;

  return (
    <Card className="flex h-[640px] flex-col border-border/60 p-0">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Conversation</h2>
          <p className="text-xs text-muted-foreground">AI follow-up simulator — nothing is sent to a real phone.</p>
        </div>
        <Sparkles className="h-4 w-4 text-accent" />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <EmptyState title="No messages yet" hint="Type a customer message below and simulate the AI reply." />
        )}
        {messages.map((m) => {
          const mine = m.sender !== "customer";
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && (
                <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
                  <User className="h-3 w-3" />
                </span>
              )}
              <div className="max-w-[78%]">
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm ${
                    m.sender === "customer"
                      ? "bg-secondary text-foreground"
                      : m.sender === "ai"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent/20 text-foreground"
                  }`}
                >
                  {m.message}
                </div>
                <p className={`mt-1 text-[11px] text-muted-foreground ${mine ? "text-right" : ""}`}>
                  {m.sender === "ai" ? "AI agent" : m.sender === "customer" ? "Customer" : "You"} ·{" "}
                  {new Date(m.created_at).toLocaleTimeString()} · {timeAgo(m.created_at)}
                </p>
              </div>
              {mine && (
                <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
                  <Bot className="h-3 w-3" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-border/50 p-4">
        <Input
          placeholder="Type a customer message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim() && !pending) aiSim.mutate();
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => aiSim.mutate()} disabled={!text.trim() || pending}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Send as cus
