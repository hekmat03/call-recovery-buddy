import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AppShell, NoBusiness, useMyBusiness } from "@/components/app/shell";
import { StatusPill, sourceLabel, statusLabel, timeAgo } from "@/components/app/bits";
import { listLeads, updateLeadStatus } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({
    meta: [
      { title: "Leads — MissedCall AI" },
      { name: "description", content: "Every recovered lead with source, value, and status in one place." },
      { property: "og:title", content: "Leads — MissedCall AI" },
      { property: "og:description", content: "Track and qualify recovered missed-call leads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadsPage,
});

const STATUSES = ["new", "contacted", "qualified", "booked", "closed", "lost"] as const;
const SOURCES = ["missed_call", "website_chat", "manual_entry", "referral"] as const;
const DATE_RANGES = [
  { value: "all", label: "Any date" },
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

function LeadsPage() {
  const business = useMyBusiness();
  return (
    <AppShell title="Leads" subtitle="All captured leads for this workspace" business={business}>
      {business ? <LeadsTable businessId={business.id} /> : <NoBusiness />}
    </AppShell>
  );
}

const selectClass = "h-9 rounded-md border border-input bg-transparent px-3 text-sm";

function LeadsTable({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const fetchLeads = useServerFn(listLeads);
  const setStatus = useServerFn(updateLeadStatus);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [range, setRange] = useState<string>("all");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", businessId],
    queryFn: () => fetchLeads({ data: { businessId } }),
  });

  const mutation = useMutation({
    mutationFn: (v: { leadId: string; status: (typeof STATUSES)[number] }) => setStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", businessId] });
      qc.invalidateQueries({ queryKey: ["stats", businessId] });
      toast.success("Lead updated");
    },
    onError: (e: unknown) => toast.error("Update failed", { description: String(e) }),
  });

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const cutoff =
      range === "all" ? null : Date.now() - Number(range) * 24 * 60 * 60 * 1000;
    return leads.filter((l) => {
      if (filter !== "all" && l.status !== filter) return false;
      if (source !== "all" && l.lead_source !== source) return false;
      if (cutoff && new Date(l.created_at).getTime() < cutoff) return false;
      if (!q) return true;
      return (
        (l.customer_name ?? "").toLowerCase().includes(q) ||
        l.customer_phone.toLowerCase().includes(q) ||
        (l.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, query, filter, source, range]);

  return (
    <div className="space-y-4 p-5 lg:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, phone, notes…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selectClass} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClass} aria-label="Filter by source">
          <option value="all">All sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{sourceLabel(s)}</option>
          ))}
        </select>
        <select value={range} onChange={(e) => setRange(e.target.value)} className={selectClass} aria-label="Filter by date">
          {DATE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <Card className="overflow-x-auto border-border/60 p-0">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <Link to="/leads/$leadId" params={{ leadId: l.id }} className="font-medium hover:text-primary">
                    {l.customer_name ?? "Unknown caller"}
                  </Link>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{l.notes ?? "—"}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div>{l.customer_phone}</div>
                  <div className="text-xs">{l.customer_email ?? "—"}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{l.lead_source ? sourceLabel(l.lead_source) : "—"}</td>
                <td className="px-4 py-3">${l.estimated_value.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{timeAgo(l.created_at)}</td>
                <td className="px-4 py-3">
                  <select
                    value={l.status}
                    onChange={(e) => mutation.mutate({ leadId: l.id, status: e.target.value as (typeof STATUSES)[number] })}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                    aria-label={`Status for ${l.customer_name ?? "lead"}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{statusLabel(s)}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to="/leads/$leadId"
                    params={{ leadId: l.id }}
                    className="inline-flex items-center gap-1 text-xs text-primary"
                  >
                    Open <ChevronRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">No leads match your filters.</div>
        )}
        {isLoading && <div className="p-10 text-center text-sm text-muted-foreground">Loading leads…</div>}
      </Card>
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {leads.length} leads. <StatusPill status="booked" /> means the job is on the calendar.
      </p>
    </div>
  );
}
