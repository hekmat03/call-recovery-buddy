import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Sparkles,
  Clock,
  CalendarCheck,
  DollarSign,
  ArrowRight,
  MessageSquareText,
  PhoneMissed,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { AppShell, NoBusiness, useMyBusiness } from "@/components/app/shell";
import { EmptyState, StatCard, StatusPill, statusLabel, timeAgo } from "@/components/app/bits";
import {
  getStats,
  listLeads,
  listMissedCalls,
  listRecentConversations,
} from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MissedCall AI" },
      { name: "description", content: "Your MissedCall AI overview: missed calls, AI conversations, booked jobs, and recovered revenue." },
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
  const business = useMyBusiness();
  return (
    <AppShell title="Dashboard" subtitle="Last 7 days at a glance" business={business}>
      {business ? <Overview businessId={business.id} /> : <NoBusiness />}
    </AppShell>
  );
}

function Overview({ businessId }: { businessId: string }) {
  const fetchStats = useServerFn(getStats);
  const fetchLeads = useServerFn(listLeads);
  const fetchCalls = useServerFn(listMissedCalls);
  const fetchRecentMsgs = useServerFn(listRecentConversations);

  const { data: stats } = useQuery({ queryKey: ["stats", businessId], queryFn: () => fetchStats({ data: { businessId } }) });
  const { data: leads = [] } = useQuery({ queryKey: ["leads", businessId], queryFn: () => fetchLeads({ data: { businessId } }) });
  const { data: calls = [] } = useQuery({ queryKey: ["missed-calls", businessId], queryFn: () => fetchCalls({ data: { businessId } }) });
  const { data: recentMsgs = [] } = useQuery({
    queryKey: ["recent-conversations", businessId],
    queryFn: () => fetchRecentMsgs({ data: { businessId } }),
  });

  const hasLeads = (stats?.totalLeads ?? 0) > 0;
  const statusDist = (stats?.statusDistribution ?? []).map((s) => ({
    label: statusLabel(s.status),
    count: s.count,
  }));

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Total leads" value={stats?.totalLeads ?? "—"} />
        <StatCard icon={Sparkles} label="New leads" value={stats?.newLeads ?? "—"} tone="accent" />
        <StatCard icon={Clock} label="Follow-ups pending" value={stats?.followUpsPending ?? "—"} tone="destructive" />
        <StatCard icon={CalendarCheck} label="Appointments booked" value={stats?.booked ?? "—"} />
        <StatCard icon={DollarSign} label="Revenue recovered" value={stats ? `$${stats.revenueRecovered.toLocaleString()}` : "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 p-6">
          <h2 className="text-sm font-semibold">Leads over time · last 30 days</h2>
          {hasLeads ? (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.leadsSeries ?? []}>
                  <defs>
                    <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} interval={4} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="leads" stroke="var(--primary)" fill="url(#dashGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={BarChart3} title="No leads yet" hint="Once calls and chats come in, your 30-day trend appears here." />
          )}
        </Card>

        <Card className="border-border/60 p-6">
          <h2 className="text-sm font-semibold">Lead status distribution</h2>
          {hasLeads ? (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={Users} title="Nothing to break down yet" hint="Lead statuses show up here as your pipeline fills." />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent leads</h2>
            <Link to="/leads" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {leads.length > 0 ? (
            <ul className="mt-4 divide-y divide-border/50">
              {leads.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{l.customer_name ?? "Unknown caller"}</div>
                    <div className="truncate text-xs text-muted-foreground">{l.customer_phone} · {timeAgo(l.created_at)}</div>
                  </div>
                  <StatusPill status={l.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Users} title="No leads yet" hint="New leads from missed calls and website chats land here." />
          )}
        </Card>

        <Card className="border-border/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent conversations</h2>
            <Link to="/conversations" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentMsgs.length > 0 ? (
            <ul className="mt-4 divide-y divide-border/50">
              {recentMsgs.map((m) => (
                <li key={m.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-medium">{m.customerName ?? m.customerPhone ?? "Unknown caller"}</div>
                    <div className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(m.createdAt)}</div>
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    <span className="text-foreground/70">{m.sender === "customer" ? "Customer" : m.sender === "ai" ? "AI" : "You"}:</span>{" "}
                    {m.message}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={MessageSquareText} title="No conversations yet" hint="AI follow-up threads will appear here." />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Latest missed calls</h2>
            <Link to="/missed-calls" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {calls.length > 0 ? (
            <ul className="mt-4 divide-y divide-border/50">
              {calls.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.customer_name ?? "Unknown caller"}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.customer_phone} · {new Date(c.date_time).toLocaleString()}
                    </div>
                  </div>
                  <StatusPill status={c.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={PhoneMissed} title="No missed calls logged" hint="Missed calls sync here automatically." />
          )}
        </Card>
      </div>
    </div>
  );
}
