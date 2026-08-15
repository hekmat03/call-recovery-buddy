import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
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
import { CalendarCheck, DollarSign, MessageSquareText, Percent } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AppShell, NoBusiness, useMyBusiness } from "@/components/app/shell";
import { StatCard } from "@/components/app/bits";
import { getStats, listLeads } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — MissedCall AI" },
      { name: "description", content: "Recovery rate, revenue trends, and lead source performance for your business." },
      { property: "og:title", content: "Analytics — MissedCall AI" },
      { property: "og:description", content: "Measure how much revenue AI follow-ups recovered." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const business = useMyBusiness();
  return (
    <AppShell title="Analytics" subtitle="Performance over the last 7 days" business={business}>
      {business ? <AnalyticsBody businessId={business.id} /> : <NoBusiness />}
    </AppShell>
  );
}

function AnalyticsBody({ businessId }: { businessId: string }) {
  const fetchStats = useServerFn(getStats);
  const fetchLeads = useServerFn(listLeads);

  const { data: stats } = useQuery({ queryKey: ["stats", businessId], queryFn: () => fetchStats({ data: { businessId } }) });
  const { data: leads = [] } = useQuery({ queryKey: ["leads", businessId], queryFn: () => fetchLeads({ data: { businessId } }) });

  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) map.set(l.lead_source ?? "unknown", (map.get(l.lead_source ?? "unknown") ?? 0) + 1);
    return [...map.entries()].map(([source, count]) => ({ source, count }));
  }, [leads]);

  const byStatus = useMemo(() => {
    const order = ["new", "contacted", "qualified", "booked", "closed", "lost"];
    return order.map((s) => ({ status: s, count: leads.filter((l) => l.status === s).length }));
  }, [leads]);

  const recoveryRate = stats && stats.missed > 0 ? Math.round((stats.booked / stats.missed) * 100) : 0;

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={MessageSquareText} label="Conversations (7d)" value={stats?.conversations ?? "—"} />
        <StatCard icon={CalendarCheck} label="Jobs booked (7d)" value={stats?.booked ?? "—"} tone="accent" />
        <StatCard icon={DollarSign} label="Revenue recovered" value={stats ? `$${stats.revenue.toLocaleString()}` : "—"} />
        <StatCard icon={Percent} label="Recovery rate" value={`${recoveryRate}%`} tone="accent" />
      </div>

      <Card className="border-border/60 p-6">
        <h2 className="text-sm font-semibold">Revenue recovered · last 7 days</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.series ?? []}>
              <defs>
                <linearGradient id="anaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--primary)" fill="url(#anaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 p-6">
          <h2 className="text-sm font-semibold">Leads by source</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySource}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="source" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="border-border/60 p-6">
          <h2 className="text-sm font-semibold">Pipeline by status</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="status" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}