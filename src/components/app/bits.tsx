import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-secondary text-secondary-foreground",
    contacted: "bg-primary/15 text-primary",
    qualified: "bg-accent/15 text-accent",
    booked: "bg-primary text-primary-foreground",
    closed: "bg-secondary text-secondary-foreground",
    lost: "bg-destructive/15 text-destructive",
    pending: "bg-secondary text-secondary-foreground",
    recovered: "bg-accent/15 text-accent",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusLabel(status)} ${map[status] ?? "bg-secondary"}`}>
      {statusLabel(status)}
    </span>
  );
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    booked: "Appointment booked",
    closed: "Closed",
    lost: "Lost",
    pending: "New",
    recovered: "Booked",
  };
  return labels[status] ?? status;
}

export function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    missed_call: "Missed call",
    website_chat: "Website chat",
    manual_entry: "Manual entry",
    referral: "Referral",
  };
  return labels[source] ?? source;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  tone?: "primary" | "accent" | "destructive";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary bg-primary/15"
      : tone === "accent"
        ? "text-accent bg-accent/15"
        : "text-destructive bg-destructive/15";
  return (
    <Card className="border-border/60 bg-[image:var(--gradient-card)] p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

export function timeAgo(ts: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}