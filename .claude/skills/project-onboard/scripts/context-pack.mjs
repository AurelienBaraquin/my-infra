#!/usr/bin/env node
// Read-only snapshot of a project's foundation documents and its state of play, so an agent that
// is new to the project can orient itself in one call. Zero dependencies.
//   node context-pack.mjs [rootDir]
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const VERSION = '1.0.0';

const FOUNDATION = [
  ['CLAUDE.md', 'how to work: map, hard rules, protocol'],
  ['docs/brief.md', 'what to build: purpose, scope, priorities'],
  ['docs/README.md', 'index of all documentation'],
  ['docs/architecture.md', 'how it is built'],
  ['.assistant/decisions-log.md', 'smaller decisions and their reasons'],
  ['.assistant/lessons.md', 'mistakes made and what prevents them'],
  ['.assistant/takeover-report.md', 'state of the project when it was taken over (snapshot)'],
];
const ADR_DIR = 'docs/adr';
const DATED = /^(?:[-*]\s+)?\*{0,2}\d{4}-\d{2}-\d{2}/;

function readText(root, rel) {
  const file = path.join(root, rel);
  return existsSync(file) && statSync(file).isFile() ? readFileSync(file, 'utf8') : null;
}

function git(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export function foundation(root) {
  return FOUNDATION.map(([file, role]) => {
    const text = readText(root, file);
    return { path: file, role, present: text !== null, lines: text === null ? 0 : text.split('\n').length };
  });
}

/** Rows of the documentation index (docs/README.md): [name](file) | answers | covers | update when. */
export function docsIndex(root) {
  const text = readText(root, 'docs/README.md');
  if (text === null) return [];
  return text
    .split('\n')
    .filter((line) => line.startsWith('|') && /\]\(/.test(line))
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      const link = /\[([^\]]*)\]\(([^)]*)\)/.exec(cells[0]);
      return link ? { name: link[1], file: link[2], answers: cells[1] ?? '', covers: cells[2] ?? '' } : null;
    })
    .filter(Boolean);
}

export function adrIndex(root) {
  const dir = path.join(root, ADR_DIR);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((name) => /^\d{4}-.+\.md$/.test(name) && !name.startsWith('0000-'))
    .sort()
    .map((name) => {
      const text = readFileSync(path.join(dir, name), 'utf8');
      const title = /^#\s+(?:ADR-\d{4}\s*[—-]\s*)?(.+)$/m.exec(text)?.[1].trim() ?? name;
      const status = /^- \*\*Status\*\*:\s*(.+)$/m.exec(text)?.[1].trim() ?? 'unknown';
      return { file: `${ADR_DIR}/${name}`, title, status };
    });
}

export function datedEntries(root, rel, limit) {
  const text = readText(root, rel);
  if (text === null) return [];
  return text.split('\n').filter((line) => DATED.test(line)).slice(-limit);
}

export function openQuestions(root, rel) {
  const text = readText(root, rel);
  if (text === null) return [];
  const lines = text.split('\n');
  const start = lines.findIndex((line) => /^##\s+(?:\d+\.\s+)?Open questions/i.test(line));
  if (start === -1) return [];
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    if (/^\s*[-*]\s+\S/.test(line)) body.push(line.replace(/^\s*[-*]\s+/, '').trim());
  }
  return body;
}

export function gitState(root) {
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch === null) return { isRepo: false };
  return {
    isRepo: true,
    branch,
    uncommitted: (git(root, ['status', '--porcelain']) ?? '').split('\n').filter(Boolean).length,
    recent: (git(root, ['log', '-10', '--format=%h %ad %s', '--date=short']) ?? '').split('\n').filter(Boolean),
  };
}

/** Errors and warnings of the project's docs check; a warning (a possibly stale document) still exits 0. */
export function docsHealth(root) {
  if (!existsSync(path.join(root, 'scripts/check-docs.mjs'))) return { installed: false };
  const result = spawnSync(process.execPath, ['scripts/check-docs.mjs'], { cwd: root, encoding: 'utf8' });
  const problems = String(result.stderr ?? '')
    .split('\n')
    .filter((line) => line.trim() && !/documentation problem/.test(line) && !/^A surface is covered/.test(line));
  return { installed: true, problems };
}

export function collect(root) {
  return {
    root: path.resolve(root),
    foundation: foundation(root),
    docs: docsIndex(root),
    adrs: adrIndex(root),
    decisions: datedEntries(root, '.assistant/decisions-log.md', 10),
    lessons: datedEntries(root, '.assistant/lessons.md', 5),
    questions: {
      work: openQuestions(root, 'CLAUDE.md'),
      product: openQuestions(root, 'docs/brief.md'),
    },
    git: gitState(root),
    health: docsHealth(root),
  };
}

const bullets = (items, empty = '- none') => (items.length === 0 ? empty : items.map((i) => `- ${i}`).join('\n'));

export function render(pack) {
  const present = pack.foundation.filter((f) => f.present);
  const lines = ['# Context pack', '', 'Read-only snapshot. Open the documents themselves; this only tells you where to look.', ''];

  lines.push('## Foundation documents, in reading order');
  lines.push(
    ...pack.foundation.map((f) =>
      f.present ? `- \`${f.path}\` (${f.lines} lines) — ${f.role}` : `- MISSING \`${f.path}\` — ${f.role}`,
    ),
  );
  if (present.length === 0) {
    lines.push('', '**No foundation document found.** Suggest `project-init` (new project) or `project-adopt` (existing codebase). Until then, what you know comes from the README, manifests and git history only; label it as such.');
  }

  lines.push('', `## Documentation index (${pack.docs.length})`);
  lines.push(pack.docs.length === 0 ? '- none (no `docs/README.md` index)' : pack.docs.map((d) => `- \`${path.posix.join('docs', d.file)}\` — ${d.answers}`).join('\n'));

  lines.push('', `## Decision records (${pack.adrs.length})`);
  lines.push(pack.adrs.length === 0 ? '- none' : pack.adrs.map((a) => `- ${a.file} — ${a.title} [${a.status}]`).join('\n'));
  lines.push('', '## Latest decisions-log entries', bullets(pack.decisions));
  lines.push('', '## Latest lessons', bullets(pack.lessons));
  lines.push('', '## Open questions', '### Work (CLAUDE.md)', bullets(pack.questions.work), '### Product (brief)', bullets(pack.questions.product));

  lines.push('', '## State of play');
  if (!pack.git.isRepo) {
    lines.push('- not a git repository');
  } else {
    lines.push(`- branch \`${pack.git.branch}\`, ${pack.git.uncommitted} uncommitted change(s)`, '- recent commits:', ...pack.git.recent.map((c) => `  - ${c}`));
  }

  lines.push('', '## Documentation health');
  if (!pack.health.installed) lines.push('- no docs check installed (`scripts/check-docs.mjs`)');
  else if (pack.health.problems.length === 0) lines.push('- docs check passes');
  else lines.push('- docs check reports problems or warnings (possibly stale or undocumented) — treat the affected statements with care:', ...pack.health.problems.slice(0, 10).map((p) => `  - ${p}`));

  return `${lines.join('\n')}\n`;
}

// realpath: the skill folder is usually reached through a symlink, which would otherwise make
// this guard false and the script silently do nothing.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  if (process.argv[2] === '--version') process.stdout.write(`${VERSION}\n`);
  else process.stdout.write(render(collect(path.resolve(process.argv[2] ?? '.'))));
}
