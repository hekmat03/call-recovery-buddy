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
import { Card } from "@/components/ui/card";
import { AppShell, NoBusiness, useMyBusiness } from "@/components/app/shell";
import { StatCard, StatusPill, timeAgo } from "@/components/app/bits";
import { getStats, listLeads, listMissedCalls } from "@/lib/dashboard.functions";

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

  const { data: stats } = useQuery({ queryKey: ["stats", businessId], queryFn: () => fetchStats({ data: { businessId } }) });
  const { data: leads = [] } = useQuery({ queryKey: ["leads", businessId], queryFn: () => fetchLeads({ data: { businessId } }) });
  const { data: calls = [] } = useQuery({ queryKey: ["missed-calls", businessId], queryFn: () => fetchCalls({ data: { businessId } }) });

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Total leads" value={stats?.totalLeads ?? "—"} />
        <StatCard icon={Sparkles} label="New leads" value={stats?.newLeads ?? "—"} tone="accent" />
        <StatCard icon={Clock} label="Follow-ups pending" value={stats?.followUpsPending ?? "—"} tone="destructive" />
        <StatCard icon={CalendarCheck} label="Appointments booked" value={stats?.booked ?? "—"} />
        <StatCard icon={DollarSign} label="Revenue recovered" value={stats ? `$${stats.revenueRecovered.toLocaleString()}` : "—"} />
      </div>

      <Card className="border-border/60 p-6">
        <h2 className="text-sm font-semibold">Revenue recovered · last 7 days</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.series ?? []}>
              <defs>
                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--primary)" fill="url(#dashGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent leads</h2>
            <Link to="/leads" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
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
            {leads.length === 0 && <li className="py-6 text-sm text-muted-foreground">No leads yet.</li>}
          </ul>
        </Card>

        <Card className="border-border/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Latest missed calls</h2>
            <Link to="/missed-calls" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
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
            {calls.length === 0 && <li className="py-6 text-sm text-muted-foreground">No missed calls logged.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
