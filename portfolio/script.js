// Data is defined in data.js, loaded before this script.

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

// --- Projects feed ---
const pinnedProjects = PROJECTS.filter((p) => p.pinned);
const feedProjects = PROJECTS
  .filter((p) => !p.pinned)
  .sort((a, b) => b.date.localeCompare(a.date));

const feedContainer = document.getElementById("projects-feed");

// Pinned section
if (pinnedProjects.length > 0) {
  const pinnedGrid = document.createElement("div");
  pinnedGrid.className = "pinned-grid";

  pinnedProjects.forEach((project) => {
    const card = document.createElement("a");
    card.className = "pinned-card";
    card.href = `project.html?slug=${project.slug}`;

    const statusTitle = project.status === "live" ? "Live" : "In progress";
    const tagsHtml = project.tags
      .map((t) => `<span class="project-tag">${t}</span>`)
      .join("");

    card.innerHTML =
      `<div class="pinned-top">` +
        `<span class="pinned-label">pinned</span>` +
        `<span class="status-dot ${project.status}" title="${statusTitle}"></span>` +
      `</div>` +
      `<div class="pinned-date">${formatDate(project.date)}</div>` +
      `<h3 class="pinned-title">${project.title}</h3>` +
      `<p class="pinned-desc">${project.description}</p>` +
      `<div class="project-tags">${tagsHtml}</div>` +
      `<span class="pinned-arrow">→</span>`;

    pinnedGrid.appendChild(card);
  });

  feedContainer.appendChild(pinnedGrid);
}

// Feed list
if (feedProjects.length > 0) {
  if (pinnedProjects.length > 0) {
    const divider = document.createElement("div");
    divider.className = "feed-divider";
    feedContainer.appendChild(divider);
  }

  const feedList = document.createElement("div");
  feedList.className = "feed-list";

  feedProjects.forEach((project) => {
    const item = document.createElement("a");
    item.className = "feed-item";
    item.href = `project.html?slug=${project.slug}`;

    const statusTitle = project.status === "live" ? "Live" : "In progress";
    const tagsHtml = project.tags
      .map((t) => `<span class="project-tag">${t}</span>`)
      .join("");

    item.innerHTML =
      `<div class="feed-meta">` +
        `<span class="feed-date">${formatDate(project.date)}</span>` +
        `<span class="status-dot ${project.status}" title="${statusTitle}"></span>` +
      `</div>` +
      `<div class="feed-body">` +
        `<span class="feed-title">${project.title}</span>` +
        `<p class="feed-desc">${project.description}</p>` +
        `<div class="project-tags">${tagsHtml}</div>` +
      `</div>` +
      `<span class="feed-arrow">→</span>`;

    feedList.appendChild(item);
  });

  feedContainer.appendChild(feedList);
}

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
[
  { label: "email",    href: `mailto:${CONTACT.email}` },
  { label: "github",   href: CONTACT.github },
  { label: "linkedin", href: CONTACT.linkedin },
].forEach(({ label, href }) => {
  const a = document.createElement("a");
  a.className = "contact-btn";
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.innerHTML = `<span>${label}</span><span class="contact-btn-arrow">↗</span>`;
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
