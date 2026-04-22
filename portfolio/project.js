const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");
const project = PROJECTS.find((p) => p.slug === slug);
const container = document.getElementById("project-detail");

if (!project) {
  container.innerHTML =
    `<div class="project-detail-not-found">` +
      `<a class="back-link" href="index.html">← back to portfolio</a>` +
      `<p class="project-detail-404">Project not found.</p>` +
    `</div>`;
} else {
  document.title = project.title + " — Eric Armstrong";

  const statusLabel = project.status === "live" ? "Live" : "In progress";

  const tagsHtml = project.tags
    .map((t) => `<span class="project-tag">${t}</span>`)
    .join("");

  const contentHtml = project.content
    .map(
      (section) =>
        `<div class="detail-section">` +
          `<h3 class="detail-section-heading">${section.heading}</h3>` +
          `<p class="detail-section-body">${section.body}</p>` +
        `</div>`
    )
    .join("");

  const externalLinkHtml =
    project.link && project.link !== "#"
      ? `<a class="detail-external-link" href="${project.link}" target="_blank" rel="noopener noreferrer">` +
          `<span>View project</span><span class="contact-btn-arrow">↗</span>` +
        `</a>`
      : "";

  container.innerHTML =
    `<div class="project-detail">` +
      `<a class="back-link" href="index.html">← back to portfolio</a>` +

      `<div class="detail-header">` +
        `<div class="detail-meta">` +
          `<span class="detail-date">${formatDate(project.date)}</span>` +
          `<span class="detail-sep">·</span>` +
          `<span class="detail-role">${project.role}</span>` +
          `<span class="detail-sep">·</span>` +
          `<span class="status-dot ${project.status}" title="${statusLabel}"></span>` +
          `<span class="detail-status">${statusLabel}</span>` +
        `</div>` +
        `<h1 class="detail-title">${project.title}</h1>` +
        `<div class="project-tags detail-tags">${tagsHtml}</div>` +
      `</div>` +

      `<div class="detail-outcome">` +
        `<span class="detail-outcome-label">outcome</span>` +
        `<p class="detail-outcome-text">${project.outcome}</p>` +
      `</div>` +

      `<p class="detail-summary">${project.summary}</p>` +

      `<div class="detail-content">${contentHtml}</div>` +

      externalLinkHtml +
    `</div>`;
}
