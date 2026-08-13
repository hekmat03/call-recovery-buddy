import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppShell, NoBusiness, useMyBusiness } from "@/components/app/shell";
import { StatusPill, timeAgo } from "@/components/app/bits";
import { listLeads, listMessages, sendMessage } from "@/lib/dashboard.functions";

type Lead = Awaited<ReturnType<typeof listLeads>>[number];

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({
    meta: [
      { title: "Conversations — MissedCall AI" },
      { name: "description", content: "Read AI follow-up threads and reply to customers from one inbox." },
      { property: "og:title", content: "Conversations — MissedCall AI" },
      { property: "og:description", content: "Every AI-led SMS thread with your missed-call leads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConversationsPage,
});

function ConversationsPage() {
  const business = useMyBusiness();
  return (
    <AppShell title="Conversations" subtitle="AI follow-ups and your replies" business={business}>
      {business ? <Inbox businessId={business.id} /> : <NoBusiness />}
    </AppShell>
  );
}

function Inbox({ businessId }: { businessId: string }) {
  const fetchLeads = useServerFn(listLeads);
  const { data: leads = [] } = useQuery({
    queryKey: ["leads", businessId],
    queryFn: () => fetchLeads({ data: { businessId } }),
  });

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return leads.filter((l) =>
      !q ||
      (l.customer_name ?? "").toLowerCase().includes(q) ||
      l.customer_phone.toLowerCase().includes(q),
    );
  }, [leads, query]);

  const selected = leads.find((l) => l.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="grid min-h-[calc(100vh-73px)] grid-cols-1 lg:grid-cols-[340px_1fr]">
      <div className="flex flex-col border-b border-border/50 lg:border-b-0 lg:border-r">
        <div className="border-b border-border/50 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search conversations…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="max-h-[420px] flex-1 overflow-y-auto lg:max-h-none">
          {filtered.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelectedId(l.id)}
              className={`block w-full border-b border-border/50 p-4 text-left transition-colors hover:bg-secondary/50 ${
                selected?.id === l.id ? "bg-secondary/70" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{l.customer_name ?? "Unknown caller"}</span>
                <StatusPill status={l.status} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{l.customer_phone}</div>
              <div className="mt-2 line-clamp-1 text-sm text-muted-foreground">{l.notes ?? ""}</div>
              <div className="mt-2 text-[11px] text-muted-foreground">{timeAgo(l.created_at)}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No conversations yet.</div>
          )}
        </div>
      </div>
      <Thread lead={selected} businessId={businessId} />
    </div>
  );
}

function Thread({ lead, businessId }: { lead: Lead | null; businessId: string }) {
  const qc = useQueryClient();
  const fetchMessages = useServerFn(listMessages);
  const send = useServerFn(sendMessage);
  const [draft, setDraft] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", lead?.id],
    queryFn: () => (lead ? fetchMessages({ data: { leadId: lead.id } }) : Promise.resolve([])),
    enabled: !!lead,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      return send({ data: { leadId: lead.id, businessId, body: draft.trim() } });
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["messages", lead?.id] });
    },
    onError: (e: unknown) => toast.error("Couldn't send", { description: String(e) }),
  });

  if (!lead) {
    return (
      <div className="grid place-items-center p-12 text-sm text-muted-foreground">
        Select a conversation to view the thread.
      </div>
    );
  }

  return (
    <div className="flex min-h-[480px] flex-col">
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div>
          <div className="font-medium">{lead.customer_name ?? "Unknown caller"}</div>
          <div className="text-xs text-muted-foreground">{lead.customer_phone}</div>
        </div>
        <StatusPill status={lead.status} />
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            No messages yet. Start a follow-up.
          </div>
        )}
        {messages.map((m) => {
          const inbound = m.sender === "customer";
          return (
            <div key={m.id} className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  inbound
                    ? "rounded-tl-sm bg-secondary text-secondary-foreground"
                    : "rounded-tr-sm bg-[image:var(--gradient-primary)] text-primary-foreground"
                }`}
              >
                {m.message}
                <div className="mt-1 text-[10px] opacity-70">{m.sender === "ai" ? "AI agent" : m.sender === "business" ? "You" : "Customer"}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) mutation.mutate();
        }}
        className="flex items-center gap-2 border-t border-border/50 p-4"
      >
        <Input placeholder="Type a follow-up message…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" disabled={!draft.trim() || mutation.isPending} className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
          <Send className="mr-1 h-4 w-4" /> Send
        </Button>
      </form>
    </div>
  );
}