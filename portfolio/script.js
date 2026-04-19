// ============================================================
// EDITABLE CONTENT
// Update anything below without touching the rest of the file.
// ============================================================

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

// Projects array — first entry is featured (full width).
// status: "live" (green dot) | "wip" (amber dot)
const PROJECTS = [
  {
    title: "Coming Soon",
    description: "Coming soon.",
    tags: [],
    status: "wip",
    link: "#",
  },
  {
    title: "Coming Soon",
    description: "Coming soon.",
    tags: [],
    status: "wip",
    link: "#",
  },
  {
    title: "Coming Soon",
    description: "Coming soon.",
    tags: [],
    status: "wip",
    link: "#",
  },
  {
    title: "Coming Soon",
    description: "Coming soon.",
    tags: [],
    status: "wip",
    link: "#",
  },
];

// About — stat blocks (left column)
const STATS = [
  { number: "Golden, CO",  label: "based in" },
  { number: "7+",          label: "years building products" },
  { number: "0 → 1",       label: "favorite stage" },
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
  github:   "https://github.com/ericarmstrong",   // update to your actual URL
  linkedin: "https://linkedin.com/in/ericarmstrong", // update to your actual URL
};

// ============================================================
// END EDITABLE CONTENT
// ============================================================


// --- Hero subtitle ---
document.getElementById("hero-subtitle").textContent = HERO_SUBTITLE;

// --- Tech stack pills ---
const pillRow = document.getElementById("pill-row");
TECH_STACK.forEach((tag) => {
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = tag;
  pillRow.appendChild(pill);
});

// --- Projects grid ---
const grid = document.getElementById("projects-grid");
PROJECTS.forEach((project, i) => {
  const card = document.createElement("div");
  card.className = "project-card" + (i === 0 ? " featured" : "");

  // Status dot
  const dot = document.createElement("span");
  dot.className = `status-dot ${project.status}`;
  dot.setAttribute("title", project.status === "live" ? "Live" : "In progress");
  card.appendChild(dot);

  // Index label
  const index = document.createElement("p");
  index.className = "project-index";
  index.textContent = String(i + 1).padStart(2, "0");
  card.appendChild(index);

  // Title row (title + arrow link)
  const titleRow = document.createElement("div");
  titleRow.className = "project-title-row";

  const title = document.createElement("h3");
  title.className = "project-title";
  title.textContent = project.title;
  titleRow.appendChild(title);

  const arrow = document.createElement("a");
  arrow.className = "project-arrow";
  arrow.href = project.link;
  arrow.textContent = "↗";
  arrow.setAttribute("aria-label", `View ${project.title}`);
  if (project.link !== "#") {
    arrow.target = "_blank";
    arrow.rel = "noopener noreferrer";
  }
  titleRow.appendChild(arrow);
  card.appendChild(titleRow);

  // Description
  const desc = document.createElement("p");
  desc.className = "project-desc";
  desc.textContent = project.description;
  card.appendChild(desc);

  // Tags
  if (project.tags.length > 0) {
    const tagsEl = document.createElement("div");
    tagsEl.className = "project-tags";
    project.tags.forEach((tag) => {
      const t = document.createElement("span");
      t.className = "project-tag";
      t.textContent = tag;
      tagsEl.appendChild(t);
    });
    card.appendChild(tagsEl);
  }

  grid.appendChild(card);
});

// --- About stats ---
const statsContainer = document.getElementById("about-stats");
STATS.forEach((stat) => {
  const block = document.createElement("div");
  block.className = "stat-block";
  block.innerHTML =
    `<span class="stat-number">${stat.number}</span>` +
    `<span class="stat-label">${stat.label}</span>`;
  statsContainer.appendChild(block);
});

// --- Bio ---
document.getElementById("about-bio-text").textContent = BIO;

// --- Contact buttons ---
const btnsContainer = document.getElementById("contact-buttons");
const contactLinks = [
  { label: "email",    href: `mailto:${CONTACT.email}` },
  { label: "github",   href: CONTACT.github },
  { label: "linkedin", href: CONTACT.linkedin },
];
contactLinks.forEach(({ label, href }) => {
  const a = document.createElement("a");
  a.className = "contact-btn";
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.innerHTML =
    `<span>${label}</span><span class="contact-btn-arrow">↗</span>`;
  btnsContainer.appendChild(a);
});

// --- Scroll reveal (IntersectionObserver) ---
const revealEls = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
);
revealEls.forEach((el) => observer.observe(el));
