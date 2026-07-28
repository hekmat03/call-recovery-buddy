import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PhoneMissed,
  MessageSquareText,
  CalendarCheck,
  Zap,
  ShieldCheck,
  BarChart3,
  Bot,
  Clock,
  ArrowRight,
  Check,
  Star,
  Wrench,
  Stethoscope,
  Home as HomeIcon,
  Flame,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MissedCall AI — Recover lost customers from missed calls" },
      {
        name: "description",
        content:
          "AI answers every missed call with an instant SMS, qualifies the lead, and books the job — so roofers, plumbers, HVAC pros, electricians and dentists stop losing revenue.",
      },
      { property: "og:title", content: "MissedCall AI — Turn missed calls into booked jobs" },
      {
        property: "og:description",
        content:
          "Every missed call gets an instant AI text-back. Recover 30–40% of lost leads on autopilot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <LogoBar />
      <HowItWorks />
      <Features />
      <Industries />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
            <PhoneMissed className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">MissedCall AI</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
          <Link to="/dashboard" className="transition-colors hover:text-foreground">Dashboard</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/dashboard">
            <Button
              size="sm"
              className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"
            >
              Start free trial
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:py-32">
        <div className="flex flex-col justify-center">
          <Badge className="w-fit border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15">
            <Zap className="mr-1 h-3 w-3" /> Answers in under 12 seconds
          </Badge>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Every missed call
            <br />
            is a lost{" "}
            <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
              customer.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            MissedCall AI answers the ones you miss with an instant text-back, qualifies the
            lead, and books the job — so roofers, plumbers, HVAC pros and dentists stop leaving
            money on the table.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/dashboard">
              <Button
                size="lg"
                className="bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90"
              >
                See a live demo <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-border">Watch 90-sec video</Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> 14-day free trial</div>
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> No credit card</div>
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Setup in 8 min</div>
          </div>
        </div>
        <div className="relative"><PhonePreview /></div>
      </div>
    </section>
  );
}

function PhonePreview() {
  return (
    <div className="relative mx-auto max-w-sm">
      <div className="absolute inset-0 -z-10 blur-3xl" style={{ background: "var(--gradient-primary)", opacity: 0.25 }} />
      <Card className="overflow-hidden border-border/60 bg-[image:var(--gradient-card)] p-0 shadow-[var(--shadow-elegant)]">
        <div className="flex items-center gap-3 border-b border-border/50 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/15 text-destructive">
            <PhoneMissed className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-medium">Missed call · (415) 555-0132</div>
            <div className="text-xs text-muted-foreground">Just now</div>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <Bubble side="out">Hi! This is Ava from Ridgeline Roofing — sorry we missed your call. What can we help you with today?</Bubble>
          <Bubble side="in">My roof is leaking after last night's storm 😩 need someone out asap</Bubble>
          <Bubble side="out">Got it — sounds urgent. What's your address, and would 2–4pm today work for a free inspection?</Bubble>
          <Bubble side="in">2pm works. 482 Oak St, Berkeley</Bubble>
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-accent">
              <CalendarCheck className="h-4 w-4" /> Job booked · Tue 2:00 PM
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Added to calendar · Owner notified</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Bubble({ side, children }: { side: "in" | "out"; children: React.ReactNode }) {
  const isOut = side === "out";
  return (
    <div className={`flex ${isOut ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
          isOut
            ? "rounded-tl-sm bg-secondary text-secondary-foreground"
            : "rounded-tr-sm bg-[image:var(--gradient-primary)] text-primary-foreground"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function LogoBar() {
  const stats = [
    { k: "38%", v: "avg lead recovery" },
    { k: "12s", v: "response time" },
    { k: "$4,200", v: "monthly revenue recovered" },
    { k: "24/7", v: "always answering" },
  ];
  return (
    <section className="border-y border-border/50 bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.v} className="text-center">
            <div className="bg-[image:var(--gradient-primary)] bg-clip-text text-3xl font-bold text-transparent">{s.k}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: PhoneMissed, title: "Call is missed", body: "We detect any unanswered call to your business line in real time." },
    { icon: MessageSquareText, title: "AI texts back instantly", body: "Within seconds, the caller gets a natural SMS trained on your services." },
    { icon: Bot, title: "Lead is qualified", body: "Ava asks the right questions, captures address, urgency, and job type." },
    { icon: CalendarCheck, title: "Job is booked", body: "Straight into your calendar. You get a summary — no manual follow-up." },
  ];
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="border-border">How it works</Badge>
        <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">From missed call to booked job — automatically</h2>
        <p className="mt-4 text-muted-foreground">Set it up once. MissedCall AI runs quietly in the background, recovering leads you didn't even know you were losing.</p>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Card key={s.title} className="relative overflow-hidden border-border/60 bg-[image:var(--gradient-card)] p-6">
            <div className="absolute right-4 top-4 text-6xl font-bold text-muted/30">0{i + 1}</div>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
              <s.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Zap, title: "12-second response", body: "Leads that get a reply in under a minute convert 100x higher than those who wait an hour." },
    { icon: Bot, title: "AI trained on your business", body: "Upload your services, pricing, and FAQs. Ava sounds like your best receptionist." },
    { icon: CalendarCheck, title: "Calendar & CRM sync", body: "Google Calendar, Jobber, Housecall Pro, ServiceTitan — booked jobs land where you work." },
    { icon: Clock, title: "Multi-step follow-ups", body: "No reply? Ava sends a friendly nudge at 1 hour, 24 hours, and 3 days." },
    { icon: ShieldCheck, title: "TCPA-compliant", body: "Every reply respects opt-out rules. Full audit log of every message sent." },
    { icon: BarChart3, title: "Revenue dashboard", body: "See exactly how many leads recovered and dollars won each week." },
  ];
  return (
    <section id="features" className="border-t border-border/50 bg-card/30">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="border-border">Features</Badge>
          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">Built for how service businesses actually run</h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="border-border/60 bg-background/60 p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Industries() {
  const items = [
    { icon: HomeIcon, name: "Roofing" },
    { icon: Wrench, name: "Plumbing" },
    { icon: Flame, name: "HVAC" },
    { icon: Zap, name: "Electrical" },
    { icon: Stethoscope, name: "Dental" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Trusted by local service pros</h2>
        <p className="mt-3 text-muted-foreground">Tuned for the trades and healthcare practices that live on the phone.</p>
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        {items.map((i) => (
          <div key={i.name} className="flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-5 py-2.5 text-sm">
            <i.icon className="h-4 w-4 text-primary" />
            {i.name}
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { quote: "We were missing 20+ calls a week. Ava recovered $18k in booked jobs the first month. It pays for itself in a day.", name: "Marcus Reed", role: "Owner, Ridgeline Roofing" },
    { quote: "The texts actually sound like a real person. Customers don't even realize it's AI — they just get taken care of.", name: "Priya Shah", role: "Ops Manager, Delta Plumbing" },
    { quote: "I stopped losing patients to voicemail. Every missed call gets rebooked. Best software we've bought in years.", name: "Dr. Alan Foster", role: "Foster Family Dental" },
  ];
  return (
    <section className="border-t border-border/50 bg-card/30">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {t.map((x) => (
            <Card key={x.name} className="border-border/60 bg-background/60 p-6">
              <div className="flex text-primary">
                {Array.from({ length: 5 }).map((_, i) => (<Star key={i} className="h-4 w-4 fill-current" />))}
              </div>
              <p className="mt-4 text-sm leading-relaxed">"{x.quote}"</p>
              <div className="mt-6">
                <div className="text-sm font-semibold">{x.name}</div>
                <div className="text-xs text-muted-foreground">{x.role}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Starter", price: "$79", desc: "For solo operators just getting off voicemail.", features: ["Up to 100 recovered leads/mo", "AI text-back", "Google Calendar sync", "Email support"] },
    { name: "Growth", price: "$199", desc: "For growing crews that live on the phone.", features: ["Up to 500 recovered leads/mo", "Multi-step follow-ups", "CRM integrations (Jobber, HCP)", "Custom AI training", "Priority support"], featured: true },
    { name: "Scale", price: "$449", desc: "Multi-location shops and franchises.", features: ["Unlimited leads", "Multiple business lines", "ServiceTitan integration", "Dedicated success manager"] },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="border-border">Pricing</Badge>
        <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">One booked job pays for the year</h2>
        <p className="mt-4 text-muted-foreground">Simple, flat pricing. Cancel anytime. 14-day free trial on every plan.</p>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <Card key={t.name} className={`relative border-border/60 p-8 ${t.featured ? "bg-[image:var(--gradient-card)] shadow-[var(--shadow-glow)] ring-1 ring-primary/40" : "bg-background/60"}`}>
            {t.featured && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[image:var(--gradient-primary)] text-primary-foreground">Most popular</Badge>
            )}
            <div className="text-sm font-medium text-muted-foreground">{t.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-5xl font-bold tracking-tight">{t.price}</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
            <ul className="mt-6 space-y-3 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{f}</li>
              ))}
            </ul>
            <Link to="/dashboard" className="mt-8 block">
              <Button className={`w-full ${t.featured ? "bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90" : ""}`} variant={t.featured ? "default" : "outline"}>Start free trial</Button>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <Card className="overflow-hidden border-border/60 p-12 text-center" style={{ background: "var(--gradient-hero)" }}>
        <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Stop losing customers to voicemail.</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">See how many leads you'd recover this month. Free 14-day trial, no card required.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/dashboard">
            <Button size="lg" className="bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90">
              Start free trial <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline">Book a demo</Button>
        </div>
      </Card>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-[image:var(--gradient-primary)] text-primary-foreground">
            <PhoneMissed className="h-3 w-3" />
          </div>
          <span className="font-medium text-foreground">MissedCall AI</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Contact</a>
        </div>
      </div>
    </footer>
  );
}