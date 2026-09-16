import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
  ArrowUpRight,
  Check,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Never Lose Another Customer From a Missed Call | MissedCall AI" },
      {
        name: "description",
        content:
          "MissedCall AI captures missed calls, organises them as leads, and runs simulated AI follow-ups for roofing, plumbing, HVAC, electrical and dental businesses.",
      },
      { property: "og:title", content: "Never Lose Another Customer From a Missed Call" },
      {
        property: "og:description",
        content:
          "Capture missed calls, follow up automatically, and keep every lead in one place. Built for local service businesses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

/* ---------- primitives ---------- */

function Reveal({
  children,
  delay = 0,
  y = 40,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
      <span className="size-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
      {children}
    </div>
  );
}

/* ---------- hero backdrop: animated gradient mesh + grid ---------- */

function HeroBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  return (
    <motion.div ref={ref} style={{ y, opacity }} className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* radial mesh */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_60%_50%_at_50%_0%,oklch(0.68_0.24_295/0.55),transparent_70%)]" />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_40%_40%_at_80%_30%,oklch(0.78_0.22_320/0.35),transparent_70%)]" />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_40%_40%_at_15%_60%,oklch(0.65_0.22_260/0.30),transparent_70%)]" />
      {/* animated orbs */}
      <motion.div
        animate={{ x: [0, 60, -30, 0], y: [0, -40, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 size-[520px] rounded-full bg-primary/20 blur-[120px]"
      />
      <motion.div
        animate={{ x: [0, -80, 40, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/4 size-[380px] rounded-full bg-fuchsia-500/15 blur-[100px]"
      />
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(1 0 0 / 0.15) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.15) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent 80%)",
        }}
      />
      {/* noise */}
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence baseFrequency=%220.9%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.7%22/></svg>')]" />
    </motion.div>
  );
}

/* ---------- cursor spotlight ---------- */

function useCursorSpotlight() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 120, damping: 20 });
  const sy = useSpring(y, { stiffness: 120, damping: 20 });
  useEffect(() => {
    const h = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, [x, y]);
  return { sx, sy };
}

/* ---------- nav ---------- */

function Nav() {
  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-4 inset-x-0 z-50 flex justify-center px-4"
    >
      <nav className="w-full max-w-6xl flex items-center justify-between px-5 py-3 rounded-full border border-white/10 bg-background/60 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-[0_0_20px_var(--primary)] grid place-items-center">
            <PhoneMissed className="size-3.5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight">MissedCall<span className="text-primary">.AI</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors px-3">Sign in</Link>
          <Link to="/signup">
            <Button size="sm" className="rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90 shadow-[0_0_30px_-5px_var(--primary)]">
              Start free <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}

/* ---------- hero ---------- */

function Hero() {
  const { sx, sy } = useCursorSpotlight();
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      <HeroBackdrop />
      <motion.div
        style={{
          background:
            "radial-gradient(400px circle at var(--x) var(--y), oklch(0.68 0.24 295 / 0.15), transparent 60%)",
          // @ts-expect-error css var
          "--x": sx.get() + "px",
          "--y": sy.get() + "px",
        }}
        className="pointer-events-none absolute inset-0"
      />
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-24 text-center">
        <Reveal delay={0.1}>
          <Eyebrow>
            <Sparkles className="size-3" /> Missed call recovery for local trades
          </Eyebrow>
        </Reveal>

        <Reveal delay={0.2}>
          <h1 className="mt-8 text-[clamp(2.5rem,7.5vw,5.5rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
            Never Lose Another Customer
            <br />
            <span className="bg-gradient-to-br from-white via-primary-glow to-primary bg-clip-text text-transparent">
              From a Missed Call
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.35}>
          <p className="mt-8 max-w-xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed">
            Every missed call becomes a lead you can see, follow up on, and close.
            MissedCall AI logs the call, drafts the follow-up conversation, asks the
            qualifying questions, and keeps your pipeline organised.
          </p>
        </Reveal>

        <Reveal delay={0.5}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="rounded-full h-12 px-7 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[0_0_60px_-10px_var(--primary)] hover:scale-[1.02] transition-transform">
                Create your workspace <ArrowRight className="size-4 ml-1" />
              </Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="ghost" className="rounded-full h-12 px-6 text-foreground hover:bg-white/5">
                See how it works
              </Button>
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.7}>
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
            <span>Simulated follow-ups</span>
            <span className="size-1 rounded-full bg-muted-foreground/40" />
            <span>Your data stays private</span>
            <span className="size-1 rounded-full bg-muted-foreground/40" />
            <span>No phone setup needed</span>
          </div>
        </Reveal>
      </div>

      {/* floating device preview */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:block absolute right-[6%] bottom-[8%] w-[280px] rotate-[6deg]"
      >
        <div className="rounded-[36px] border border-white/10 bg-card/70 backdrop-blur-xl p-4 shadow-[0_40px_120px_-20px_rgba(120,50,255,0.5)]">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex justify-between">
            <span>iMessage</span><span>now</span>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white/[0.06] px-3 py-2">
              Hey — sorry we missed you. This is Ava at Apex Roofing. Want a quote?
            </div>
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary/90 text-primary-foreground px-3 py-2">
              Yeah, storm damage on the north side.
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white/[0.06] px-3 py-2">
              Got it. Thursday 10am works for a free inspection — book it?
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ---------- industries served ---------- */

const INDUSTRIES = [
  { name: "Roofing", detail: "Storm damage, leaks, insurance questions" },
  { name: "Plumbing", detail: "Leaks, blockages, emergency call-outs" },
  { name: "HVAC", detail: "No heat, no cooling, maintenance visits" },
  { name: "Electrical", detail: "Outages, faults, rewiring quotes" },
  { name: "Dental", detail: "New patients, pain triage, rebookings" },
];

function Industries() {
  return (
    <section id="industries" className="relative py-20 border-y border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground/70 mb-10">
            Industries served
          </p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {INDUSTRIES.map((ind, i) => (
            <Reveal key={ind.name} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-white/10 bg-card/40 p-5">
                <div className="text-sm font-semibold tracking-tight">{ind.name}</div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{ind.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <p className="mt-8 text-center text-xs text-muted-foreground/80">
            Each industry comes with its own question set and suggested replies you can edit.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- features ---------- */

const FEATURES = [
  { icon: PhoneMissed, title: "Missed call log", body: "Record every missed call with caller details, notes, and status you can update in one click." },
  { icon: Bot, title: "AI follow-up assistant", body: "A simulated assistant opens the conversation and asks your qualifying questions one at a time." },
  { icon: MessageSquareText, title: "Conversation history", body: "Every message with a customer stays on their lead, in order, with timestamps." },
  { icon: CalendarCheck, title: "Lead pipeline", body: "Move leads through New, Contacted, Qualified, Appointment booked, Closed and Lost." },
  { icon: BarChart3, title: "Simple reporting", body: "Leads over time, status mix, conversion rate and estimated value recovered." },
  { icon: ShieldCheck, title: "Private by account", body: "Your leads, calls and conversations are only visible to your own business account." },
];

function FeatureCard({ f, i }: { f: (typeof FEATURES)[number]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, active: false });
  return (
    <Reveal delay={i * 0.06}>
      <div
        ref={ref}
        onMouseMove={(e) => {
          const r = ref.current!.getBoundingClientRect();
          setPos({ x: e.clientX - r.left, y: e.clientY - r.top, active: true });
        }}
        onMouseLeave={() => setPos((p) => ({ ...p, active: false }))}
        className="group relative h-full rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl p-8 overflow-hidden transition-transform duration-500 hover:-translate-y-1"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: `radial-gradient(400px circle at ${pos.x}px ${pos.y}px, oklch(0.68 0.24 295 / 0.18), transparent 60%)`,
          }}
        />
        <f.icon className="size-6 text-primary" strokeWidth={1.5} />
        <h3 className="mt-6 text-xl font-semibold tracking-tight">{f.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
        <ArrowUpRight className="absolute top-6 right-6 size-4 text-muted-foreground/40 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Reveal>
  );
}

function Features() {
  return (
    <section id="features" className="relative py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <Reveal>
            <Eyebrow>The Platform</Eyebrow>
            <h2 className="mt-5 text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1]">
              An unfair advantage,
              <br />
              <span className="text-muted-foreground">quietly running in the background.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="max-w-sm text-muted-foreground">
              Six primitives, one mission — turn every missed ring into revenue.
            </p>
          </Reveal>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} f={f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- how it works ---------- */

const STEPS = [
  { n: "01", t: "Log the missed call", d: "Add the caller's name and number, or let a new lead be created for you. Nothing gets forgotten on a sticky note." },
  { n: "02", t: "The assistant follows up", d: "A follow-up conversation opens automatically and works through your industry's qualifying questions, one at a time." },
  { n: "03", t: "You take the booking", d: "Answers are saved on the lead, the status moves to Qualified, and you decide when to book the job." },
];

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const line = useTransform(scrollYProgress, [0.1, 0.9], ["0%", "100%"]);
  return (
    <section id="how" ref={ref} className="relative py-32 bg-gradient-to-b from-transparent via-black/40 to-transparent">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal>
          <Eyebrow>The Flow</Eyebrow>
          <h2 className="mt-5 text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1]">
            From ring to revenue,
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">in three moves.</span>
          </h2>
        </Reveal>

        <div className="relative mt-20 pl-6 md:pl-10">
          <div className="absolute left-0 top-2 bottom-2 w-px bg-white/10">
            <motion.div style={{ height: line }} className="w-full bg-gradient-to-b from-primary to-primary-glow" />
          </div>
          <div className="space-y-20">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1} y={60}>
                <div className="grid md:grid-cols-[120px_1fr] gap-6 md:gap-12 items-start">
                  <div className="text-5xl md:text-6xl font-semibold tracking-tighter text-transparent [-webkit-text-stroke:1px_var(--primary)]">
                    {s.n}
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-4xl font-semibold tracking-tight">{s.t}</h3>
                    <p className="mt-3 max-w-xl text-muted-foreground leading-relaxed">{s.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- testimonials ---------- */

const QUOTES = [
  { q: "We recovered $47k in the first month. It answers faster than my front desk ever did.", n: "Marco Reyes", r: "Owner, Apex Roofing", tall: true },
  { q: "Our booking rate on after-hours calls went from 12% to 61%.", n: "Priya Anand", r: "Ops, Northwind HVAC" },
  { q: "It feels less like software and more like hiring an unshakably calm receptionist.", n: "Dr. Lena Osei", r: "Meridian Dental" },
  { q: "The dashboard is the first ROI report I've actually read cover-to-cover.", n: "Jake Whitman", r: "Volt Electric" },
];

function Testimonials() {
  return (
    <section className="relative py-32">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <Eyebrow>Field Reports</Eyebrow>
          <h2 className="mt-5 text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1] max-w-3xl">
            Operators who stopped
            <span className="text-muted-foreground"> losing sleep.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-4 gap-4 auto-rows-[minmax(220px,auto)]">
          {QUOTES.map((q, i) => (
            <Reveal
              key={q.n}
              delay={i * 0.08}
              className={
                i === 0
                  ? "md:col-span-2 md:row-span-2"
                  : i === 3
                  ? "md:col-span-2"
                  : ""
              }
            >
              <figure className="h-full rounded-2xl border border-white/10 bg-gradient-to-br from-card/60 to-card/20 backdrop-blur p-8 flex flex-col justify-between hover:border-primary/40 transition-colors">
                <blockquote className={`${i === 0 ? "text-2xl md:text-3xl" : "text-lg"} font-medium tracking-tight leading-snug`}>
                  &ldquo;{q.q}&rdquo;
                </blockquote>
                <figcaption className="mt-8 text-sm">
                  <div className="font-medium">{q.n}</div>
                  <div className="text-muted-foreground">{q.r}</div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- pricing ---------- */

const TIERS = [
  {
    name: "Starter",
    price: "$79",
    tag: "Solo operators",
    features: ["Up to 200 recoveries / mo", "AI SMS agent", "Unified inbox", "Email support"],
  },
  {
    name: "Growth",
    price: "$249",
    tag: "Growing crews",
    features: ["Up to 1,500 recoveries / mo", "Auto-booking + calendar sync", "Team seats", "Priority support"],
    highlight: true,
  },
  {
    name: "Signature",
    price: "Custom",
    tag: "Multi-location",
    features: ["Unlimited recoveries", "Dedicated AI training", "SLA + white-glove onboarding", "Named success partner"],
    premium: true,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="relative py-32">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-5 text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1]">
            Priced like software.
            <br />
            <span className="text-muted-foreground">Pays like a top rep.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-3 gap-4">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <div
                className={`relative h-full rounded-2xl border p-8 flex flex-col ${
                  t.premium
                    ? "border-accent/50 bg-gradient-to-b from-accent/[0.08] to-transparent"
                    : t.highlight
                    ? "border-primary/50 bg-gradient-to-b from-primary/[0.12] to-transparent shadow-[0_30px_80px_-30px_var(--primary)]"
                    : "border-white/10 bg-card/40"
                }`}
              >
                {t.highlight && (
                  <div className="absolute -top-3 left-8 text-[10px] uppercase tracking-[0.25em] bg-primary text-primary-foreground px-3 py-1 rounded-full">
                    Most chosen
                  </div>
                )}
                {t.premium && (
                  <div className="absolute -top-3 left-8 text-[10px] uppercase tracking-[0.25em] bg-accent text-accent-foreground px-3 py-1 rounded-full">
                    Signature
                  </div>
                )}
                <div className="text-sm text-muted-foreground">{t.tag}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">{t.name}</div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span
                    className={`text-5xl font-semibold tracking-tighter ${
                      t.premium ? "bg-gradient-to-br from-accent to-yellow-200 bg-clip-text text-transparent" : ""
                    }`}
                  >
                    {t.price}
                  </span>
                  {t.price !== "Custom" && <span className="text-muted-foreground text-sm">/mo</span>}
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={`size-4 mt-0.5 ${t.premium ? "text-accent" : "text-primary"}`} />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="mt-8">
                  <Button
                    className={`w-full rounded-full h-11 ${
                      t.highlight
                        ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
                        : t.premium
                        ? "bg-accent text-accent-foreground hover:bg-accent/90"
                        : "bg-white/5 hover:bg-white/10 text-foreground"
                    }`}
                  >
                    {t.premium ? "Talk to us" : "Start free"}
                  </Button>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- final CTA ---------- */

function FinalCTA() {
  return (
    <section className="relative py-40 overflow-hidden">
      <div className="absolute inset-0 [background:radial-gradient(ellipse_60%_60%_at_50%_50%,oklch(0.68_0.24_295/0.35),transparent_70%)]" />
      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <Reveal>
          <h2 className="text-5xl md:text-8xl font-semibold tracking-[-0.04em] leading-[0.95]">
            Stop losing
            <br />
            <span className="bg-gradient-to-br from-white via-primary-glow to-primary bg-clip-text text-transparent">
              the ones who called.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-8 text-lg text-muted-foreground max-w-xl mx-auto">
            Two minutes to install. Revenue rescued by tonight.
          </p>
        </Reveal>
        <Reveal delay={0.35}>
          <Link to="/signup">
            <Button size="lg" className="mt-10 rounded-full h-14 px-8 text-base bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[0_0_80px_-10px_var(--primary)] hover:scale-[1.02] transition-transform">
              Claim your line <ArrowRight className="size-4 ml-2" />
            </Button>
          </Link>
        </Reveal>
        <Reveal delay={0.5}>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
            <span className="flex items-center gap-1.5"><Clock className="size-3" /> 2-min setup</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3" /> TCPA-safe</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */

function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-md bg-gradient-to-br from-primary to-primary-glow" />
          <span className="text-foreground">MissedCall.AI</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">Status</a>
        </div>
      </div>
    </footer>
  );
}

/* ---------- page ---------- */

function Landing() {
  return (
    <main className="relative bg-background text-foreground selection:bg-primary/40">
      <Nav />
      <Hero />
      <Trust />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}
