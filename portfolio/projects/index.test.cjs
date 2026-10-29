// Run: node portfolio/projects/index.test.cjs
// Keeps the /projects landing page in sync with the project folders:
// every project folder with an index.html is listed exactly once, and every
// listed link points at a real project.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
// Ignore HTML comments so instructions in them aren't parsed as entries.
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

const listed = [...html.matchAll(/<li><a href="\/projects\/([a-z0-9-]+)\/">\s*<h2>([^<]+)<\/h2>\s*<p>([^<]+)<\/p>\s*<\/a><\/li>/g)];
const slugs = listed.map(m => m[1]);

const folders = fs.readdirSync(dir, { withFileTypes: true })
  .filter(d => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'index.html')))
  .map(d => d.name);

// Every <li> in the list matches the expected card markup (no malformed entries)
assert.strictEqual((html.match(/<li>/g) || []).length, listed.length, 'malformed <li> entry in index.html');
// No duplicates
assert.strictEqual(new Set(slugs).size, slugs.length, 'duplicate project in index.html');
// Every folder is listed, and every listing has a folder
folders.forEach(f => assert.ok(slugs.includes(f), 'project folder not listed on /projects: ' + f));
slugs.forEach(s => assert.ok(folders.includes(s), 'listed project has no folder with index.html: ' + s));
// Names and descriptions are present and short; no dates on the page
listed.forEach(m => {
  assert.ok(m[2].trim().length > 0, 'empty name for ' + m[1]);
  assert.ok(m[3].trim().length > 0 && m[3].length <= 220, 'description missing or over 220 chars for ' + m[1]);
});
assert.ok(!/<time\b|datetime=/.test(html), 'do not show dates on the projects page');

console.log('projects index tests passed (' + slugs.length + ' listed)');
