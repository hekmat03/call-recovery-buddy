import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  MessageSquareText,
  PhoneMissed,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  Building2,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { listMyBusinesses } from "@/lib/dashboard.functions";

export type Business = Awaited<ReturnType<typeof listMyBusinesses>>[number]["business"];

export function useMyBusiness() {
  const fetchBiz = useServerFn(listMyBusinesses);
  const { data } = useSuspenseQuery({
    queryKey: ["my-businesses"],
    queryFn: () => fetchBiz(),
  });
  return data[0]?.business ?? null;
}

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/conversations", label: "Conversations", icon: MessageSquareText },
  { to: "/missed-calls", label: "Missed Calls", icon: PhoneMissed },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({
  title,
  subtitle,
  business,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  business: Business | null;
  children: ReactNode;
  action?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[248px_1fr]">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <main className="flex min-h-screen min-w-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" /> {business?.name ?? "No business"}
              </div>
              <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {action}
            <Badge className="border border-accent/40 bg-accent/10 text-accent">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-accent" /> AI agent online
            </Badge>
          </div>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </main>
    </div>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col gap-1 border-r border-border/50 bg-card p-4 transition-transform lg:static lg:translate-x-0 lg:bg-card/40 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link to="/" className="mb-6 flex items-center gap-2 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
            <PhoneMissed className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">MissedCall AI</span>
        </Link>

        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm bg-primary/10 text-primary" }}
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </Link>
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
    </>
  );
}

function SignOutButton() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function onSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
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

export function NoBusiness() {
  return (
    <div className="grid place-items-center p-12">
      <Card className="max-w-md p-8 text-center">
        <h2 className="text-lg font-semibold">No business found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account isn't linked to a business workspace yet.
        </p>
      </Card>
    </div>
  );
}