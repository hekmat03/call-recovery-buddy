import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AppShell, NoBusiness, useMyBusiness } from "@/components/app/shell";
import { StatusPill, timeAgo } from "@/components/app/bits";
import { listLeads, updateLeadStatus } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/leads")({
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

function LeadsPage() {
  const business = useMyBusiness();
  return (
    <AppShell title="Leads" subtitle="All captured leads for this workspace" business={business}>
      {business ? <LeadsTable businessId={business.id} /> : <NoBusiness />}
    </AppShell>
  );
}

function LeadsTable({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const fetchLeads = useServerFn(listLeads);
  const setStatus = useServerFn(updateLeadStatus);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

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
    return leads.filter((l) => {
      if (filter !== "all" && l.status !== filter) return false;
      if (!q) return true;
      return (
        (l.customer_name ?? "").toLowerCase().includes(q) ||
        l.customer_phone.toLowerCase().includes(q) ||
        (l.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, query, filter]);

  return (
    <div className="space-y-4 p-5 lg:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, phone, notes…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <Card className="overflow-x-auto border-border/60 p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <div className="font-medium">{l.customer_name ?? "Unknown caller"}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{l.notes ?? "—"}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div>{l.customer_phone}</div>
                  <div className="text-xs">{l.customer_email ?? "—"}</div>
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{l.lead_source ?? "—"}</td>
                <td className="px-4 py-3">${l.estimated_value.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{timeAgo(l.created_at)}</td>
                <td className="px-4 py-3">
                  <select
                    value={l.status}
                    onChange={(e) => mutation.mutate({ leadId: l.id, status: e.target.value as (typeof STATUSES)[number] })}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs capitalize"
                    aria-label={`Status for ${l.customer_name ?? "lead"}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
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