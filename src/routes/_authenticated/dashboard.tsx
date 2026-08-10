import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  PhoneMissed,
  MessageSquareText,
  CalendarCheck,
  DollarSign,
  Search,
  Send,
  Bot,
  Users,
  Settings,
  LogOut,
  Sparkles,
  Building2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyBusinesses,
  listLeads,
  listMessages,
  sendMessage,
  getStats,
} from "@/lib/dashboard.functions";

type Lead = Awaited<ReturnType<typeof listLeads>>[number];

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MissedCall AI" },
      { name: "description", content: "Your MissedCall AI lead recovery dashboard." },
      { property: "og:title", content: "Dashboard — MissedCall AI" },
      { property: "og:description", content: "Track recovered leads, AI conversations, and booked jobs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const fetchBiz = useServerFn(listMyBusinesses);
  const { data: memberships } = useSuspenseQuery({
    queryKey: ["my-businesses"],
    queryFn: () => fetchBiz(),
  });

  const [activeBizId, setActiveBizId] = useState<string | null>(
    memberships[0]?.business.id ?? null,
  );
  const activeBiz = memberships.find((m) => m.business.id === activeBizId) ?? memberships[0];

  if (!activeBiz) return <EmptyState />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[240px_1fr]">
        <Sidebar memberships={memberships} activeBizId={activeBiz.business.id} onSelect={setActiveBizId} />
        <main className="flex flex-col overflow-hidden">
          <TopBar businessName={activeBiz.business.name} />
          <DashboardBody businessId={activeBiz.business.id} />
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-screen place-items-center bg-background text-foreground">
      <Card className="max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold">No business found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Contact support — your account isn't linked to a business yet.
        </p>
      </Card>
    </div>
  );
}

function Sidebar({
  memberships,
  activeBizId,
  onSelect,
}: {
  memberships: Awaited<ReturnType<typeof listMyBusinesses>>;
  activeBizId: string;
  onSelect: (id: string) => void;
}) {
  const nav = [
    { icon: MessageSquareText, label: "Inbox", active: true },
    { icon: Users, label: "Leads" },
    { icon: Bot, label: "AI Agent" },
    { icon: CalendarCheck, label: "Calendar" },
    { icon: Settings, label: "Settings" },
  ];
  return (
    <aside className="flex flex-col gap-1 border-r border-border/50 bg-card/40 p-4">
      <Link to="/" className="mb-6 flex items-center gap-2 px-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
          <PhoneMissed className="h-4 w-4" />
        </div>
        <span className="font-semibold tracking-tight">MissedCall AI</span>
      </Link>

      {memberships.length > 1 && (
        <div className="mb-3 px-2">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Business</label>
          <select
            value={activeBizId}
            onChange={(e) => onSelect(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {memberships.map((m) => (
              <option key={m.business.id} value={m.business.id}>{m.business.name}</option>
            ))}
          </select>
        </div>
      )}

      {nav.map((n) => (
        <button
          key={n.label}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
            n.active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <n.icon className="h-4 w-4" />
          {n.label}
        </button>
      ))}

      <div className="mt-auto">
        <Card className="border-border/60 bg-[image:var(--gradient-card)] p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Trial: 12 days left
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Upgrade to keep recovering leads.</p>
          <Button size="sm" className="mt-3 w-full bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90">
            Upgrade plan
          </Button>
        </Card>
        <SignOutButton />
      </div>
    </aside>
  );
}

function SignOutButton() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function onSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <button
      onClick={onSignOut}
      className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  );
}

function TopBar({ businessName }: { businessName: string }) {
  return (
    <div className="flex h-16 items-center justify-between border-b border-border/50 px-8">
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3" /> {businessName}
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
      </div>
      <Badge className="border border-accent/40 bg-accent/10 text-accent">
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-accent" /> AI agent online
      </Badge>
    </div>
  );
}

function DashboardBody({ businessId }: { businessId: string }) {
  const fetchStats = useServerFn(getStats);
  const fetchLeads = useServerFn(listLeads);

  const { data: stats } = useQuery({
    queryKey: ["stats", businessId],
    queryFn: () => fetchStats({ data: { businessId } }),
  });
  const { data: leads = [] } = useQuery({
    queryKey: ["leads", businessId],
    queryFn: () => fetchLeads({ data: { businessId } }),
  });

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        const q = query.toLowerCase();
        if (!q) return true;
        return (
          (l.customer_name ?? "").toLowerCase().includes(q) ||
          l.customer_phone.toLowerCase().includes(q) ||
          (l.notes ?? "").toLowerCase().includes(q)
        );
      }),
    [leads, query],
  );

  const selected = leads.find((l) => l.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="grid flex-1 grid-rows-[auto_1fr] overflow-hidden">
      <div className="grid gap-4 border-b border-border/50 px-8 py-6 md:grid-cols-4">
        <StatCard icon={PhoneMissed} label="Missed calls (7d)" value={stats?.missed ?? "—"} tone="destructive" />
        <StatCard icon={MessageSquareText} label="AI conversations" value={stats?.conversations ?? "—"} tone="primary" />
        <StatCard icon={CalendarCheck} label="Jobs booked" value={stats?.booked ?? "—"} tone="accent" />
        <StatCard
          icon={DollarSign}
          label="Revenue recovered"
          value={stats ? `$${stats.revenue.toLocaleString()}` : "—"}
          tone="primary"
        />
      </div>

      <div className="grid flex-1 grid-cols-[360px_1fr_400px] overflow-hidden">
        {/* Leads list */}
        <div className="flex flex-col overflow-hidden border-r border-border/50">
          <div className="border-b border-border/50 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                className={`block w-full border-b border-border/50 p-4 text-left transition-colors hover:bg-secondary/50 ${
                  selected?.id === l.id ? "bg-secondary/70" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{l.customer_name ?? "Unknown caller"}</div>
                  <StatusPill status={l.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{l.customer_phone}</div>
                <div className="mt-2 line-clamp-1 text-sm text-muted-foreground">{l.notes ?? ""}</div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {timeAgo(l.created_at)}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No leads match your search.</div>
            )}
          </div>
        </div>

        <ConversationPane lead={selected} businessId={businessId} />

        <div className="flex flex-col overflow-hidden border-l border-border/50 bg-card/20 p-6">
          <h3 className="text-sm font-semibold">Revenue recovered · last 7 days</h3>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.series ?? []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {selected && <LeadDetail lead={selected} />}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  tone: "primary" | "accent" | "destructive";
}) {
  const toneClass =
    tone === "primary" ? "text-primary bg-primary/15" :
    tone === "accent" ? "text-accent bg-accent/15" :
    "text-destructive bg-destructive/15";
  return (
    <Card className="border-border/60 bg-[image:var(--gradient-card)] p-4">
      <div className="flex items-center justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

function StatusPill({ status }: { status: Lead["status"] }) {
  const map: Record<string, string> = {
    new: "bg-secondary text-secondary-foreground",
    engaged: "bg-primary/15 text-primary",
    booked: "bg-accent/15 text-accent",
    lost: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

function ConversationPane({ lead, businessId }: { lead: Lead | null; businessId: string }) {
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
      <div className="grid place-items-center text-sm text-muted-foreground">
        Select a lead to see the conversation.
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{lead.customer_name ?? "Unknown caller"}</div>
            <div className="text-xs text-muted-foreground">{lead.customer_phone} · {lead.notes}</div>
          </div>
          <StatusPill status={lead.status} />
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            No messages yet. Start a follow-up.
          </div>
        )}
        {messages.map((m) => {
          const isOut = m.sender !== "customer";
          return (
            <div key={m.id} className={`flex ${isOut ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  isOut
                    ? "rounded-tl-sm bg-secondary text-secondary-foreground"
                    : "rounded-tr-sm bg-[image:var(--gradient-primary)] text-primary-foreground"
                }`}
              >
                {m.message}
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
        <Input
          placeholder="Type a follow-up message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          type="submit"
          disabled={!draft.trim() || mutation.isPending}
          className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
        >
          <Send className="mr-1 h-4 w-4" /> Send
        </Button>
      </form>
    </div>
  );
}

function LeadDetail({ lead }: { lead: Lead }) {
  return (
    <div className="mt-8 border-t border-border/50 pt-6">
      <h3 className="text-sm font-semibold">Lead details</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <Row k="Phone" v={lead.customer_phone} />
        <Row k="Issue" v={lead.notes ?? "—"} />
        <Row k="Status" v={<StatusPill status={lead.status} />} />
        <Row k="Est. value" v={`$${lead.estimated_value.toLocaleString()}`} />
        <Row k="Received" v={timeAgo(lead.created_at)} />
      </dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="text-right text-sm">{v}</dd>
    </div>
  );
}

function timeAgo(ts: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}