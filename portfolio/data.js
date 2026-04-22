// ============================================================
// EDITABLE CONTENT
// Update projects, bio, and contact info here.
// ============================================================

// Projects — set pinned: true for highlighted entries at the top.
// status: "live" (green dot) | "wip" (amber dot)
// date: "YYYY-MM" format, used for sorting and display
// slug: unique URL-safe identifier for the detail page
const PROJECTS = [
  {
    slug: "ai-brief-builder",
    title: "AI Brief Builder",
    date: "2024-11",
    pinned: true,
    status: "live",
    description:
      "A tool that turns raw discovery notes into structured product briefs using LLMs — cutting brief-writing time from hours to minutes.",
    tags: ["AI", "LLMs", "Python", "Product"],
    link: "#",
    role: "Product Manager / Engineer",
    outcome: "Adopted by 3 product teams; reduced brief turnaround from ~4h to ~20min",
    summary:
      "Most PMs spend hours translating messy research notes into a polished brief. " +
      "This tool automates that — paste in your notes, and it extracts themes, surfaces gaps, " +
      "and outputs a Notion-ready brief.",
    content: [
      {
        heading: "The problem",
        body:
          "Discovery synthesis is one of the most time-consuming parts of PM work. After user " +
          "interviews, you're left with pages of raw notes that need to be structured, de-duped, " +
          "and turned into something the team can act on.",
      },
      {
        heading: "What I built",
        body:
          "A lightweight web app backed by a Claude API chain. Users paste in raw notes, tag them " +
          "by research session, and the tool outputs a prioritized brief with theme groupings, " +
          "open questions, and a recommended next step.",
      },
      {
        heading: "Result",
        body:
          "Three product teams across two companies adopted it within a month. The average brief " +
          "turnaround dropped from ~4 hours to ~20 minutes. Qualitative feedback: " +
          "'It doesn't just summarize — it actually thinks.'",
      },
    ],
  },
  {
    slug: "pipeline-dashboard",
    title: "Pipeline Dashboard",
    date: "2024-07",
    pinned: true,
    status: "live",
    description:
      "A real-time sales pipeline visualizer built for a 15-person B2B startup — replaced three disconnected spreadsheets.",
    tags: ["SQL", "Data", "No-code"],
    link: "#",
    role: "Product Manager",
    outcome: "Single source of truth for $2M pipeline across 15 reps",
    summary:
      "The sales team was managing a $2M pipeline across three separate spreadsheets. " +
      "This dashboard collapsed them into one view with live CRM sync.",
    content: [
      {
        heading: "The mess",
        body:
          "Three spreadsheets. Different owners. Updated weekly at best. No one trusted " +
          "the numbers going into the board meeting.",
      },
      {
        heading: "The build",
        body:
          "Connected directly to HubSpot via API, built SQL views for the pipeline stages " +
          "we actually cared about, and surfaced it all in a Retool dashboard. " +
          "No eng headcount required.",
      },
      {
        heading: "The impact",
        body:
          "Became the single source of truth for Monday standups and board decks within two weeks. " +
          "Saved the sales lead ~3 hours a week on manual reconciliation.",
      },
    ],
  },
  {
    slug: "onboarding-redesign",
    title: "Onboarding Redesign",
    date: "2024-03",
    pinned: false,
    status: "live",
    description:
      "Redesigned onboarding for a fintech app — reduced time-to-value from 11 steps to 4 and improved D7 retention by 22%.",
    tags: ["Fintech", "UX", "A/B Testing", "Figma"],
    link: "#",
    role: "Product Manager",
    outcome: "+22% D7 retention",
    summary:
      "The original onboarding had 11 steps and a 60% drop-off before users ever hit the " +
      "core feature. A focused redesign got them there in 4.",
    content: [
      {
        heading: "The drop-off",
        body:
          "Funnel analysis showed 60% of users abandoned before completing onboarding. Exit " +
          "surveys pointed to confusion around step 3 — account linking — which required too " +
          "much context users didn't yet have.",
      },
      {
        heading: "The redesign",
        body:
          "Cut steps from 11 to 4 by deferring non-critical setup (notifications, " +
          "personalization) to post-first-value. Rewrote microcopy, added a persistent " +
          "progress bar, and made account linking optional on first run.",
      },
      {
        heading: "Results",
        body:
          "D7 retention increased 22% in the A/B test. Onboarding completion went from " +
          "40% to 71%. The changes shipped to 100% of new users within 6 weeks.",
      },
    ],
  },
  {
    slug: "internal-llm-tooling",
    title: "Internal LLM Tooling",
    date: "2023-11",
    pinned: false,
    status: "wip",
    description:
      "A suite of internal tools built on top of Claude for a 40-person software company — from code review summarization to support triage.",
    tags: ["LLMs", "Python", "Internal Tools"],
    link: "#",
    role: "Product Manager / Engineer",
    outcome: "In progress",
    summary:
      "An evolving set of internal automations that route work, summarize context, and reduce " +
      "the overhead of coordination at a small software company.",
    content: [
      {
        heading: "Context",
        body:
          "At a 40-person company, coordination overhead is disproportionately painful. " +
          "Engineers context-switch too often, support tickets get triaged inconsistently, " +
          "and code review sits in a queue.",
      },
      {
        heading: "What's been built so far",
        body:
          "A Slack bot that summarizes PR diffs for non-technical stakeholders. A triage " +
          "assistant that tags incoming support tickets by urgency and product area. A weekly " +
          "digest that pulls from Linear, GitHub, and Intercom into a single summary.",
      },
      {
        heading: "Status",
        body:
          "Active and expanding. Two more tools in design: a meeting prep assistant and a " +
          "customer health summarizer for the CS team.",
      },
    ],
  },
];

// Hero subtitle paragraph
const HERO_SUBTITLE =
  "I turn ambiguous problems into products people actually use. " +
  "Currently building at the intersection of AI and workflow tooling.";

// Tech stack pills in the hero
const TECH_STACK = [
  "product strategy",
  "python",
  "sql",
  "figma",
  "LLMs",
  "no-code / low-code",
];

// About — stat blocks (left column)
const STATS = [
  { number: "Golden, CO", label: "based in" },
  { number: "7+",         label: "years building products" },
  { number: "0 → 1",      label: "favorite stage" },
];

// About — bio paragraph (right column)
const BIO =
  "I'm a product manager and builder who cares deeply about making tools " +
  "that are actually useful. I've shipped products across fintech, AI, and " +
  "enterprise software — usually starting from a napkin sketch and an " +
  "obsessive need to talk to users. Outside of work I'm probably hiking " +
  "something in the Rockies or tinkering on a side project that may or may " +
  "not ever ship.";

// Contact links
const CONTACT = {
  email:    "eric.armstrongg@gmail.com",
  github:   "https://github.com/ericarmstrongg",
  linkedin: "https://linkedin.com/in/ericarmstrong",
};

// ============================================================
// END EDITABLE CONTENT
// ============================================================

function formatDate(dateStr) {
  const [year, month] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[parseInt(month, 10) - 1] + " " + year;
}
