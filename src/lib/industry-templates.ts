// Predefined industry templates + the shared qualification script.
// Pure data/helpers: safe to import from both server functions and components.

export type AiTone = "professional" | "friendly" | "casual";

export const AI_TONES: { value: AiTone; label: string; blurb: string }[] = [
  { value: "professional", label: "Professional", blurb: "Polished, concise, business-first." },
  { value: "friendly", label: "Friendly", blurb: "Warm and helpful, still efficient." },
  { value: "casual", label: "Casual", blurb: "Relaxed, texting-style language." },
];

export const QUALIFICATION_KEYS = [
  "property_location",
  "issue_type",
  "damage_description",
  "timeline",
  "insurance",
] as const;

export type QualificationKey = (typeof QUALIFICATION_KEYS)[number];

export const QUALIFICATION_LABELS: Record<QualificationKey, string> = {
  property_location: "Property location",
  issue_type: "Type of issue",
  damage_description: "Damage description",
  timeline: "Timeline",
  insurance: "Insurance involvement",
};

export type IndustryTemplate = {
  id: string;
  label: string;
  description: string;
  services: string;
  commonQuestions: string[];
  qualificationQuestions: Record<QualificationKey, string>;
  suggestedResponses: string[];
  leadFields: string[];
  faqs: { q: string; a: string }[];
  typicalValue: number;
};

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: "roofing",
    label: "Roofing",
    description: "Residential and commercial roof repair, replacement, and storm damage restoration.",
    services: "Roof repair, full replacement, storm & hail damage, gutters, inspections, emergency tarping",
    commonQuestions: [
      "How much does a new roof cost?",
      "Do you handle insurance claims?",
      "Can you tarp my roof today?",
      "How long does a replacement take?",
    ],
    qualificationQuestions: {
      property_location: "What's the property address or neighborhood we'd be coming out to?",
      issue_type: "Is this a leak, storm damage, or a full roof replacement?",
      damage_description: "Can you describe what you're seeing — stains, missing shingles, active dripping?",
      timeline: "How soon do you need someone on site — today, this week, or just planning ahead?",
      insurance: "Are you planning to file an insurance claim for this?",
    },
    suggestedResponses: [
      "Most repairs run $450–$1,800; full replacements start around $9,500.",
      "We document everything for your adjuster and can meet them on site.",
      "We can get an emergency tarp on today to stop the water.",
    ],
    leadFields: ["Roof age", "Stories", "Insurance carrier"],
    faqs: [
      { q: "Do you offer free inspections?", a: "Yes — free on-site roof inspections with photo documentation." },
      { q: "Are you licensed and insured?", a: "Fully licensed, bonded, and insured with a workmanship warranty." },
    ],
    typicalValue: 9500,
  },
  {
    id: "plumbing",
    label: "Plumbing",
    description: "Emergency and scheduled plumbing for homes and small commercial properties.",
    services: "Leak repair, drain cleaning, water heaters, repiping, fixture installs, 24/7 emergency calls",
    commonQuestions: [
      "Can you come out today?",
      "How much is a water heater replacement?",
      "Do you charge a trip fee?",
      "Is my leak an emergency?",
    ],
    qualificationQuestions: {
      property_location: "What's the address or area of the property?",
      issue_type: "What kind of plumbing issue is it — leak, clog, water heater, or something else?",
      damage_description: "Is there any water damage or standing water right now? What are you seeing?",
      timeline: "Do you need someone out immediately, or can we schedule it?",
      insurance: "Will you be filing a home insurance claim for any water damage?",
    },
    suggestedResponses: [
      "Standard service call is $89 and gets waived with any repair.",
      "Water heater swaps typically run $1,300–$2,400 installed.",
      "Shut the main valve off and we'll have a tech rolling to you.",
    ],
    leadFields: ["Water shut off?", "Home age", "Fixture type"],
    faqs: [
      { q: "Do you offer 24/7 emergency service?", a: "Yes, around the clock for active leaks and sewage backups." },
      { q: "Do you give upfront pricing?", a: "Flat-rate quote before any work begins." },
    ],
    typicalValue: 850,
  },
  {
    id: "hvac",
    label: "HVAC",
    description: "Heating, ventilation, and air conditioning service, repair, and installation.",
    services: "AC repair, furnace repair, system replacement, ductwork, maintenance plans, indoor air quality",
    commonQuestions: [
      "Why is my AC blowing warm air?",
      "How much is a new system?",
      "Do you offer financing?",
      "How often should I service my unit?",
    ],
    qualificationQuestions: {
      property_location: "Which address is the system at?",
      issue_type: "Is this heating, cooling, or air quality related?",
      damage_description: "What's the system doing right now — no air, warm air, strange noise, leaking?",
      timeline: "How urgent is it — same day, this week, or a planned replacement?",
      insurance: "Is any of this covered by a home warranty or insurance policy?",
    },
    suggestedResponses: [
      "Diagnostic visits are $95 and credited toward the repair.",
      "Full system replacements typically run $6,000–$12,000 with financing available.",
      "We can add you to today's route if you have no cooling at all.",
    ],
    leadFields: ["System age", "Brand", "Home square footage"],
    faqs: [
      { q: "Do you service all brands?", a: "Yes, all major residential heating and cooling brands." },
      { q: "Is financing available?", a: "Yes, 0% options on qualifying system replacements." },
    ],
    typicalValue: 4200,
  },
  {
    id: "electrical",
    label: "Electricians",
    description: "Licensed residential and commercial electrical repair, upgrades, and installations.",
    services: "Panel upgrades, rewiring, outlets & switches, lighting, EV chargers, generators, code corrections",
    commonQuestions: [
      "Why does my breaker keep tripping?",
      "How much is a panel upgrade?",
      "Can you install an EV charger?",
      "Do you pull permits?",
    ],
    qualificationQuestions: {
      property_location: "What's the property address for the work?",
      issue_type: "What's the electrical issue — outage, breaker tripping, upgrade, or new install?",
      damage_description: "Any burning smell, sparks, or scorch marks we should know about?",
      timeline: "Is this an emergency or can we book a scheduled visit?",
      insurance: "Is this tied to an insurance claim or inspection requirement?",
    },
    suggestedResponses: [
      "Panel upgrades usually land between $1,900 and $3,600 with permit.",
      "If you smell burning, shut the breaker off — we'll prioritize the call.",
      "EV charger installs are typically a half-day job.",
    ],
    leadFields: ["Panel amperage", "Property type", "Permit needed?"],
    faqs: [
      { q: "Are you licensed?", a: "Fully licensed master electricians; permits pulled on all applicable work." },
      { q: "Do you do emergency calls?", a: "Yes, for outages and any burning or sparking condition." },
    ],
    typicalValue: 2400,
  },
  {
    id: "dental",
    label: "Dental",
    description: "General and cosmetic dentistry practice with same-day emergency appointments.",
    services: "Cleanings, fillings, crowns, root canals, extractions, whitening, implants, emergency visits",
    commonQuestions: [
      "Do you take my insurance?",
      "Can I be seen today for tooth pain?",
      "Are you accepting new patients?",
      "How much is a cleaning without insurance?",
    ],
    qualificationQuestions: {
      property_location: "Which of our locations works best for you, or what area are you coming from?",
      issue_type: "Is this for pain, a cleaning, or a cosmetic consultation?",
      damage_description: "Can you describe the symptoms — pain level, swelling, chipped or broken tooth?",
      timeline: "Do you need to be seen today, or should we book the next available opening?",
      insurance: "Do you have dental insurance you'd like us to verify?",
    },
    suggestedResponses: [
      "We reserve same-day slots for severe pain and swelling.",
      "New patient exam, X-rays, and cleaning is $149 without insurance.",
      "We're in-network with most major PPO plans and can verify before your visit.",
    ],
    leadFields: ["Insurance carrier", "New patient?", "Pain level (1-10)"],
    faqs: [
      { q: "Are you accepting new patients?", a: "Yes, new patients are welcome and usually seen within a week." },
      { q: "Do you offer payment plans?", a: "Yes, interest-free plans on treatment over $500." },
    ],
    typicalValue: 950,
  },
];

export function getTemplate(industry?: string | null): IndustryTemplate {
  return (
    INDUSTRY_TEMPLATES.find((t) => t.id === (industry ?? "").toLowerCase()) ?? INDUSTRY_TEMPLATES[0]
  );
}

/** Tone-adjusted phrasing helpers used by the simulator. */
export function toneWrap(tone: AiTone, sentence: string): string {
  if (tone === "casual") return sentence.replace(/^Could you/, "Can you").replace(/\.$/, "");
  return sentence;
}

export function openingMessage(opts: {
  companyName: string;
  agentName?: string;
  tone: AiTone;
  serviceArea?: string | null;
}): string {
  const agent = opts.agentName ?? "Ava";
  if (opts.tone === "casual") {
    return `Hey, it's ${agent} from ${opts.companyName} — we noticed you called us. Sorry we missed your call! What's going on, how can we help?`;
  }
  if (opts.tone === "friendly") {
    return `Hi! This is ${agent} with ${opts.companyName}. We noticed you called us — so sorry we missed your call. How can we help you today?`;
  }
  return `Hi, this is ${agent} from ${opts.companyName}. We noticed you called us. Sorry we missed your call. How can we help you today?`;
}

export function askQuestion(tone: AiTone, question: string): string {
  if (tone === "friendly") return `Great — ${question.charAt(0).toLowerCase()}${question.slice(1)}`;
  if (tone === "casual") return `Got it. ${question}`;
  return question;
}

/** Keywords that flag a lead as urgent (active damage, safety risk, etc). */
const URGENCY_KEYWORDS = [
  "leak",
  "leaking",
  "flooding",
  "flood",
  "emergency",
  "urgent",
  "burst",
  "sparking",
  "spark",
  "burning smell",
  "smoke",
  "no heat",
  "no cooling",
  "no ac",
  "sewage",
  "active",
  "right now",
  "collapsing",
  "collapsed",
];

/** Keywords/phrases suggesting the customer is frustrated, confused, or explicitly wants a person. */
const HUMAN_ATTENTION_KEYWORDS = [
  "talk to a person",
  "talk to someone",
  "speak to a person",
  "speak to someone",
  "real person",
  "human",
  "manager",
  "this is ridiculous",
  "frustrated",
  "angry",
  "unacceptable",
  "i don't understand",
  "i dont understand",
  "confused",
  "not helpful",
  "useless",
];

export function detectUrgency(message: string): boolean {
  const lower = message.toLowerCase();
  return URGENCY_KEYWORDS.some((k) => lower.includes(k));
}

export function detectHumanAttentionNeeded(message: string): string | null {
  const lower = message.toLowerCase();
  const hit = HUMAN_ATTENTION_KEYWORDS.find((k) => lower.includes(k));
  return hit ? `Customer said something matching: "${hit}"` : null;
}

export function qualifiedMessage(tone: AiTone, companyName: string): string {
  if (tone === "casual") {
    return `Perfect, that's everything I need. Passing this to the ${companyName} crew now — someone will text you shortly to lock in a time.`;
  }
  if (tone === "friendly") {
    return `Thank you — that's everything I needed! I've passed your details to the ${companyName} team and someone will reach out shortly to confirm your appointment.`;
  }
  return `Thank you. I have everything I need. Your details have been sent to the ${companyName} team and a specialist will contact you shortly to confirm scheduling.`;
      }
      
