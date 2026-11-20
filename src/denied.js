// What somebody sees when the page can't tell who they are: no key, an expired one, a copied link, or an account
// that isn't on the roster. It deliberately says nothing about *which* of those it was, and names nobody — the
// same page for a stranger as for a cousin whose link went stale overnight. What it does say is the one thing
// that fixes it for anyone who belongs here: come in through the app.

export const DENIED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light">
<title>Secret Santa</title>
<style>
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;display:grid;place-items:center;padding:24px 16px;overflow:hidden;
    background:linear-gradient(180deg,#dfe9f5 0%,#eef3f9 55%,#f7f9fc 100%);
    color:#1d2a3a;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
  .card{position:relative;z-index:1;max-width:420px;background:#fff;border-radius:20px;padding:32px 28px 28px;
    box-shadow:0 1px 2px rgba(29,42,58,.06),0 12px 32px rgba(45,93,139,.12);text-align:center}
  .mark{width:56px;height:56px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;
    background:#e8f0f9;color:#2d5d8b;font-size:28px}
  h1{font-size:21px;line-height:1.3;margin:0 0 10px}
  p{margin:0 0 12px;color:#4d5d70}
  .steps{text-align:left;background:#f4f7fb;border-radius:12px;padding:14px 16px 14px 34px;margin:16px 0 14px;color:#2b3b4e}
  .steps li{margin:3px 0}
  .small{font-size:14px;color:#6b7a8c;margin:0}
  .flake{position:fixed;top:-10px;border-radius:50%;background:#fff;box-shadow:0 0 2px rgba(45,93,139,.25);
    animation:fall linear infinite;will-change:transform}
  @keyframes fall{to{transform:translate3d(var(--x),105vh,0)}}
  @media (prefers-reduced-motion:reduce){.flake{display:none}}
</style>
</head>
<body>
${[
  [6, 4, 19, 0, 20], [14, 3, 23, -6, -15], [24, 5, 17, -11, 25], [37, 3, 25, -3, -10], [48, 4, 21, -14, 18],
  [59, 3, 27, -8, -22], [68, 5, 18, -1, 12], [79, 3, 24, -12, -18], [88, 4, 20, -5, 22], [95, 3, 26, -16, -8],
].map(([left, size, dur, delay, x]) =>
  `<i class="flake" style="left:${left}%;width:${size}px;height:${size}px;opacity:.85;animation-duration:${dur}s;animation-delay:${delay}s;--x:${x}px"></i>`).join("")}
<main class="card">
  <div class="mark" aria-hidden="true">❄</div>
  <h1>Open this from the Majestic app</h1>
  <p>This page only knows who you are when you arrive through the app, so it can show you your own Secret Santa and nobody else's.</p>
  <ol class="steps">
    <li>Open <strong>Majestic</strong> and go to the Christmas trip.</li>
    <li>Tap the <strong>Secret Santa</strong> link on the trip board.</li>
  </ol>
  <p class="small">A link that was copied, forwarded or opened yesterday won't work here. If you came from the app and still see this, let whoever shared it know.</p>
</main>
</body>
</html>
`;
