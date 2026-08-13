import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppShell, NoBusiness, useMyBusiness, type Business } from "@/components/app/shell";
import { updateBusiness } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MissedCall AI" },
      { name: "description", content: "Update your business profile, phone number, service area, and hours." },
      { property: "og:title", content: "Settings — MissedCall AI" },
      { property: "og:description", content: "Configure how the AI agent represents your business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const business = useMyBusiness();
  return (
    <AppShell title="Settings" subtitle="Business profile and AI agent details" business={business}>
      {business ? <SettingsForm business={business} /> : <NoBusiness />}
    </AppShell>
  );
}

const INDUSTRIES = ["roofing", "plumbing", "hvac", "electrical", "dental", "other"];

function SettingsForm({ business }: { business: Business }) {
  const qc = useQueryClient();
  const save = useServerFn(updateBusiness);
  const [name, setName] = useState(business.name);
  const [industry, setIndustry] = useState(business.industry ?? "other");
  const [phone, setPhone] = useState(business.phone ?? "");
  const [serviceArea, setServiceArea] = useState(business.serviceArea ?? "");
  const [businessHours, setBusinessHours] = useState(business.businessHours ?? "");

  useEffect(() => {
    setName(business.name);
    setIndustry(business.industry ?? "other");
    setPhone(business.phone ?? "");
    setServiceArea(business.serviceArea ?? "");
    setBusinessHours(business.businessHours ?? "");
  }, [business]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          businessId: business.id,
          name: name.trim(),
          industry,
          phone: phone.trim() || null,
          serviceArea: serviceArea.trim() || null,
          businessHours: businessHours.trim() || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-businesses"] });
      toast.success("Settings saved");
    },
    onError: (e: unknown) => toast.error("Couldn't save", { description: String(e) }),
  });

  return (
    <div className="max-w-2xl space-y-6 p-5 lg:p-8">
      <Card className="border-border/60 p-6">
        <h2 className="text-sm font-semibold">Business profile</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The AI agent uses these details when following up with customers.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="biz-name">Company name</Label>
            <Input id="biz-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="biz-industry">Industry</Label>
            <select
              id="biz-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm capitalize"
            >
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="biz-phone">Business phone number</Label>
            <Input id="biz-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 010 2030" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="biz-area">Service area</Label>
            <Input id="biz-area" value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="Greater Denver, CO" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="biz-hours">Business hours</Label>
            <Input id="biz-hours" value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} placeholder="Mon–Fri 7am–6pm" />
          </div>
          <Button
            type="submit"
            disabled={mutation.isPending || !name.trim()}
            className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>

      <Card className="border-border/60 p-6">
        <h2 className="text-sm font-semibold">Workspace</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-xs text-muted-foreground">Workspace ID</dt>
            <dd className="font-mono text-xs">{business.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-xs text-muted-foreground">Data isolation</dt>
            <dd className="text-xs">Private to this account</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}