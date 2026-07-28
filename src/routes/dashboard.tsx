import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  PhoneMissed,
  MessageSquareText,
  CalendarCheck,
  TrendingUp,
  DollarSign,
  Users,
  Search,
  Send,
  Sparkles,
  Bot,
  Bell,
  Settings,
  LayoutDashboard,
  Inbox,
  Zap,
  ArrowUpRight,
  Circle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MissedCall AI" },
      { name: "description", content: "Live lead recovery dashboard: missed calls, AI conversations, booked jobs, and revenue recovered." },
      { property: "og:title", content: "Dashboard — MissedCall AI" },
      { property: "og:description", content: "Live lead recovery dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Status = "new" | "engaged" | "booked" | "lost";

type Lead = {
  id: string;
  name: string;
  phone: string;
  issue: string;
  status: Status;
  value: number;
  time: string;
  channel: "roofing" | "plumbing" | "hvac" | "electrical" | "dental";
};

const LEADS: Lead[] = [
  { id: "L-1042", name: "Jenna Ruiz", phone: "(415) 555-0132", issue: "Roof leak after storm", status: "booked", value: 4200, time: "2m ago", channel: "roofing" },
  { id: "L-1041", name: "Derek Malone", phone: "(415) 555-0119", issue: "AC not cooling", status: "engaged", value: 780, time: "11m ago", channel: "hvac" },
  { id: "L-1040", name: "Aisha Patel", phone: "(510) 555-0173", issue: "Kitchen sink clog", status: "booked", value: 320, time: "24m ago", channel: "plumbing" },
  { id: "L-1039", name: "Mike Chen", phone: "(408) 555-0198", issue: "Panel upgrade quote", status: "engaged", value: 2400, time: "42m ago", channel: "electrical" },
  { id: "L-1038", name: "Lena Osei", phone: "(650) 555-0141", issue: "Chipped molar, urgent", status: "booked", value: 950, time: "1h ago", channel: "dental" },
  { id: "L-1037", name: "Rob Sinclair", phone: "(415) 555-0184", issue: "Water heater replacement", status: "new", value: 1800, time: "1h ago", channel: "plumbing" },
  { id: "L-1036", name: "Sam Rivera", phone: "(415) 555-0107", issue: "Estimate for reroof", status: "lost", value: 0, time: "3h ago", channel: "roofing" },
  { id: "L-1035", name: "Ella Thompson", phone: "(510) 555-0162", issue: "Furnace inspection", status: "engaged", value: 240, time: "3h ago", channel: "hvac" },
  { id: "L-1034", name: "Marco Bianchi", phone: "(415) 555-0155", issue: "Outlet sparking", status: "booked", value: 380, time: "5h ago", channel: "electrical" },
];

const CHART = [
  { d: "Mon", recovered: 6, revenue: 2200 },
  { d: "Tue", recovered: 9, revenue: 3800 },
  { d: "Wed", recovered: 7, revenue: 2900 },
  { d: "Thu", recovered: 12, revenue: 5200 },
  { d: "Fri", recovered: 14, revenue: 6100 },
  { d: "Sat", recovered: 5, revenue: 1600 },
  { d: "Sun", recovered: 4, revenue: 1400 },
];

function Dashboard() {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string>(LEADS[0].id);
  const filtered = useMemo(
    () =>
      LEADS.filter((l) =>
        [l.name, l.issue, l.phone].join(" ").toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );
  const selected = LEADS.find((l) => l.id === selectedId) ?? LEADS[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <TopBar />
          <div className="mx-auto max-w-[1400px] px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Recovery dashboard</h1>
                <p className="text-sm text-muted-foreground">Live view of missed calls, AI conversations and booked jobs.</p>
              </div>
              <Badge className="border border-success/30 bg-success/10 text-success">
                <Circle className="mr-1 h-2 w-2 fill-current" /> Ava is online
              </Badge>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Stat icon={PhoneMissed} label="Missed calls (7d)" value="57" trend="+12%" />
              <Stat icon={MessageSquareText} label="AI conversations" value="49" trend="+18%" tone="accent" />
              <Stat icon={CalendarCheck} label="Jobs booked" value="23" trend="+31%" tone="success" />
              <Stat icon={DollarSign} label="Revenue recovered" value="$23,200" trend="+42%" tone="primary" />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <Card className="border-border/60 bg-card p-6 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Revenue recovered</div>
                    <div className="text-2xl font-semibold">$23,200 <span className="text-sm font-normal text-success">▲ 42% vs last week</span></div>
                  </div>
                  <Tabs defaultValue="7d">
                    <TabsList>
                      <TabsTrigger value="7d">7d</TabsTrigger>
                      <TabsTrigger value="30d">30d</TabsTrigger>
                      <TabsTrigger value="90d">90d</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={CHART}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                      <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--foreground)",
                        }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#rev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="border-border/60 bg-card p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div className="text-sm font-medium">Ava's insights</div>
                </div>
                <ul className="mt-4 space-y-4 text-sm">
                  <Insight text="Fridays 3–5pm see 2.4x your missed calls. Consider a second line." />
                  <Insight text="Storm damage keywords up 210%. Boosting roofing follow-ups." />
                  <Insight text="Avg response time dropped from 18s to 11s this week." />
                </ul>
              </Card>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <Card className="border-border/60 bg-card p-0 lg:col-span-2">
                <div className="flex items-center justify-between border-b border-border/60 p-5">
                  <div className="flex items-center gap-3">
                    <Inbox className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium">Recovered leads</div>
                    <Badge variant="secondary">{filtered.length}</Badge>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search leads…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="w-64 pl-8"
                    />
                  </div>
                </div>
                <div className="divide-y divide-border/60">
                  {filtered.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedId(l.id)}
                      className={`flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-secondary/50 ${
                        l.id === selectedId ? "bg-secondary/60" : ""
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs">
                          {l.name.split(" ").map((s) => s[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{l.name}</span>
                          <span className="text-xs text-muted-foreground">· {l.phone}</span>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{l.issue}</div>
                      </div>
                      <div className="hidden text-right md:block">
                        <div className="text-sm font-medium">${l.value.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{l.time}</div>
                      </div>
                      <StatusPill status={l.status} />
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="flex flex-col border-border/60 bg-card p-0">
                <div className="flex items-center gap-3 border-b border-border/60 p-4">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs">
                      {selected.name.split(" ").map((s) => s[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{selected.name}</div>
                    <div className="text-xs text-muted-foreground">{selected.phone}</div>
                  </div>
                  <StatusPill status={selected.status} />
                </div>
                <div className="flex-1 space-y-3 p-4">
                  <div className="text-center text-xs text-muted-foreground">Today · {selected.time}</div>
                  <Msg who="ava">Hi {selected.name.split(" ")[0]}, this is Ava — sorry we missed your call. What's going on?</Msg>
                  <Msg who="lead">{selected.issue}</Msg>
                  <Msg who="ava">Got it — is this an emergency, or can we schedule for the next day or two?</Msg>
                  {selected.status === "booked" ? (
                    <>
                      <Msg who="lead">Tomorrow morning would be great</Msg>
                      <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm">
                        <div className="flex items-center gap-2 font-medium text-accent">
                          <CalendarCheck className="h-4 w-4" /> Booked — Tomorrow 9:00 AM
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Est. value ${selected.value.toLocaleString()} · Synced to calendar</div>
                      </div>
                    </>
                  ) : (
                    <Msg who="lead">Waiting on quote…</Msg>
                  )}
                </div>
                <div className="flex items-center gap-2 border-t border-border/60 p-3">
                  <Input placeholder="Reply as Ava…" className="flex-1" />
                  <Button size="icon" className="bg-[image:var(--gradient-primary)] text-primary-foreground">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  const items = [
    { icon: LayoutDashboard, label: "Overview", active: true },
    { icon: Inbox, label: "Leads" },
    { icon: MessageSquareText, label: "Conversations" },
    { icon: CalendarCheck, label: "Calendar" },
    { icon: Bot, label: "Ava (AI)" },
    { icon: TrendingUp, label: "Reports" },
    { icon: Settings, label: "Settings" },
  ];
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-card/40 md:block">
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
          <PhoneMissed className="h-4 w-4" />
        </div>
        <Link to="/" className="font-semibold tracking-tight">MissedCall AI</Link>
      </div>
      <nav className="p-3">
        {items.map((i) => (
          <button
            key={i.label}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              i.active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <i.icon className="h-4 w-4" />
            {i.label}
          </button>
        ))}
      </nav>
      <div className="mx-3 mt-6 rounded-lg border border-border/60 bg-[image:var(--gradient-card)] p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Zap className="h-4 w-4 text-primary" /> Trial · 9 days left
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Upgrade to keep Ava answering 24/7.</p>
        <Button size="sm" className="mt-3 w-full bg-[image:var(--gradient-primary)] text-primary-foreground">
          Upgrade
        </Button>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <div className="flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-6 backdrop-blur">
      <div className="relative w-96 max-w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search calls, leads, jobs…" className="pl-8" />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button>
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-2 py-1">
          <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">MR</AvatarFallback></Avatar>
          <div className="pr-2 text-sm">Marcus · Ridgeline</div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  trend,
  tone = "primary",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  trend: string;
  tone?: "primary" | "accent" | "success";
}) {
  const toneClass =
    tone === "accent"
      ? "bg-accent/15 text-accent"
      : tone === "success"
      ? "bg-success/15 text-success"
      : "bg-primary/15 text-primary";
  return (
    <Card className="border-border/60 bg-card p-5">
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1 text-xs text-success">
          <ArrowUpRight className="h-3 w-3" /> {trend}
        </div>
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

function Insight({ text }: { text: string }) {
  return (
    <li className="flex gap-3">
      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span className="text-muted-foreground">{text}</span>
    </li>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    new: { label: "New", cls: "border-primary/30 bg-primary/10 text-primary" },
    engaged: { label: "Engaged", cls: "border-accent/30 bg-accent/10 text-accent" },
    booked: { label: "Booked", cls: "border-success/30 bg-success/10 text-success" },
    lost: { label: "Lost", cls: "border-destructive/30 bg-destructive/10 text-destructive" },
  };
  const m = map[status];
  return <Badge variant="outline" className={`shrink-0 border ${m.cls}`}>{m.label}</Badge>;
}

function Msg({ who, children }: { who: "ava" | "lead"; children: React.ReactNode }) {
  const isAva = who === "ava";
  return (
    <div className={`flex ${isAva ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
          isAva
            ? "rounded-tl-sm bg-secondary text-secondary-foreground"
            : "rounded-tr-sm bg-[image:var(--gradient-primary)] text-primary-foreground"
        }`}
      >
        {children}
      </div>
    </div>
  );
}