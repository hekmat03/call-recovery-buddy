import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PhoneMissed, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AppShell, NoBusiness, useMyBusiness } from "@/components/app/shell";
import { StatCard } from "@/components/app/bits";
import { listMissedCalls, updateMissedCallStatus } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/missed-calls")({
  head: () => ({
    meta: [
      { title: "Missed Calls — MissedCall AI" },
      { name: "description", content: "Every missed call logged with recovery status so nothing slips through." },
      { property: "og:title", content: "Missed Calls — MissedCall AI" },
      { property: "og:description", content: "Track missed calls from ring to recovered job." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MissedCallsPage,
});

const CALL_STATUSES = ["pending", "contacted", "recovered", "lost"] as const;

function MissedCallsPage() {
  const business = useMyBusiness();
  return (
    <AppShell title="Missed Calls" subtitle="Call log and recovery pipeline" business={business}>
      {business ? <CallLog businessId={business.id} /> : <NoBusiness />}
    </AppShell>
  );
}

function CallLog({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const fetchCalls = useServerFn(listMissedCalls);
  const setStatus = useServerFn(updateMissedCallStatus);
  const [query, setQuery] = useState("");

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["missed-calls", businessId],
    queryFn: () => fetchCalls({ data: { businessId } }),
  });

  const mutation = useMutation({
    mutationFn: (v: { callId: string; status: (typeof CALL_STATUSES)[number] }) => setStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missed-calls", businessId] });
      toast.success("Call updated");
    },
    onError: (e: unknown) => toast.error("Update failed", { description: String(e) }),
  });

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return calls.filter((c) =>
      !q || (c.customer_name ?? "").toLowerCase().includes(q) || c.customer_phone.toLowerCase().includes(q),
    );
  }, [calls, query]);

  const recovered = calls.filter((c) => c.status === "recovered").length;
  const pending = calls.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-4 p-5 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={PhoneMissed} label="Missed calls logged" value={calls.length} tone="destructive" />
        <StatCard icon={PhoneMissed} label="Awaiting follow-up" value={pending} tone="primary" />
        <StatCard icon={PhoneMissed} label="Recovered" value={recovered} tone="accent" />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search caller or number…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      <Card className="overflow-x-auto border-border/60 p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Caller</th>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3 font-medium">{c.customer_name ?? "Unknown caller"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.customer_phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(c.date_time).toLocaleString()}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{c.source ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground"><span className="line-clamp-1">{c.notes ?? "—"}</span></td>
                <td className="px-4 py-3">
                  <select
                    value={c.status}
                    onChange={(e) => mutation.mutate({ callId: c.id, status: e.target.value as (typeof CALL_STATUSES)[number] })}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs capitalize"
                    aria-label={`Status for call from ${c.customer_phone}`}
                  >
                    {CALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <div className="p-10 text-center text-sm text-muted-foreground">Loading calls…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">No missed calls logged yet.</div>
        )}
      </Card>
    </div>
  );
}