import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Workflow as WorkflowIcon, Clock, Loader2, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppShell, NoBusiness, useMyBusiness } from "@/components/app/shell";
import { EmptyState, StatCard, statusLabel, timeAgo } from "@/components/app/bits";
import { listWorkflows } from "@/lib/workflow.functions";
import { STEP_STATE_CLASSES, STEP_STATE_LABELS, WORKFLOW_STEPS, type StepState } from "@/lib/workflow";

export const Route = createFileRoute("/_authenticated/workflow")({
  head: () => ({
    meta: [
      { title: "Follow-up Workflow — MissedCall AI" },
      {
        name: "description",
        content:
          "Track every missed-call recovery from first AI response through qualification and owner notification.",
      },
      { property: "og:title", content: "Follow-up Workflow — MissedCall AI" },
      {
        property: "og:description",
        content: "Waiting, in progress, completed and failed follow-ups across your pipeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkflowPage,
});

const FILTERS: { value: "all" | StepState; label: string }[] = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

function WorkflowPage() {
  const business = useMyBusiness();
  const fetchWorkflows = useServerFn(listWorkflows);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | StepState>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["workflows", business?.id],
    queryFn: () => fetchWorkflows({ data: { businessId: business!.id } }),
    enabled: !!business?.id,
  });

  const rows = data ?? [];
  const counts = useMemo(
    () => ({
      waiting: rows.filter((r) => r.overall === "waiting").length,
      in_progress: rows.filter((r) => r.overall === "in_progress").length,
      completed: rows.filter((r) => r.overall === "completed").length,
      failed: rows.filter((r) => r.overall === "failed").length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.overall !== filter) return false;
      if (!term) return true;
      return (
        r.customerName.toLowerCase().includes(term) || r.customerPhone.toLowerCase().includes(term)
      );
    });
  }, [rows, q, filter]);

  if (!business) {
    return (
      <AppShell title="Follow-up workflow" business={null}>
        <NoBusiness />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Follow-up workflow"
      subtitle="Missed call → first response → collect details → qualify → notify owner"
      business={business}
    >
      <div className="space-y-6 p-5 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Clock} label="Waiting" value={counts.waiting} />
          <StatCard icon={Loader2} label="In progress" value={counts.in_progress} />
          <StatCard icon={CheckCircle2} label="Completed" value={counts.completed} tone="accent" />
          <StatCard icon={AlertTriangle} label="Failed" value={counts.failed} tone="destructive" />
        </div>

        <Card className="border-border/60 bg-[image:var(--gradient-card)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-border/50 p-4">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or phone"
              className="h-9 max-w-xs"
            />
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={filter === f.value ? "default" : "outline"}
                  onClick={() => setFilter(f.value)}
                  className="h-8"
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading workflow runs…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={WorkflowIcon}
              title={rows.length === 0 ? "No follow-up runs yet" : "No runs match these filters"}
              hint={
                rows.length === 0
                  ? "Every missed call and lead starts a follow-up run automatically."
                  : "Try a different status or clear the search."
              }
            />
          ) : (
            <ul className="divide-y divide-border/50">
              {filtered.map((r) => (
                <li key={r.leadId} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{r.customerName}</span>
                        {r.isDemo && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            DEMO
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STEP_STATE_CLASSES[r.overall]}`}
                        >
                          {STEP_STATE_LABELS[r.overall]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.customerPhone} · Lead {statusLabel(r.leadStatus)} · {r.answered}/
                        {r.totalQuestions} details · started {timeAgo(r.createdAt)}
                      </p>
                    </div>
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: r.leadId }}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open lead <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-5">
                    {r.steps.map((s, i) => (
                      <div
                        key={s.key}
                        className="rounded-lg border border-border/50 bg-background/40 px-3 py-2"
                      >
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {i + 1}. {WORKFLOW_STEPS[i].label}
                        </div>
                        <div
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STEP_STATE_CLASSES[s.state]}`}
                        >
                          {STEP_STATE_LABELS[s.state]}
                        </div>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
