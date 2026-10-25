#!/usr/bin/env node
// Deterministic documentation checks. Zero dependencies, run from the repository root:
//   node scripts/check-docs.mjs [rootDir]      (or --version)
//
// 1. every relative Markdown link resolves to an existing file or directory
// 2. every inline-code path cited (a file path, or a directory ending in `/`) in the "path
//    documents" (CLAUDE.md and docs/architecture.md by default) exists — this catches renamed or
//    deleted files the docs still mention
// 3. ADR files are numbered without gaps or duplicates, carry a valid Status line, and a
//    "Superseded by ADR-NNNN" status points to an ADR that exists
// 4. coverage: every documentation surface (top-level folder, Dockerfile, compose file, each CI
//    pipeline file, `.env.example`, API contract, schema or migrations) is listed in the "Covers" column
//    of a document of the index (docs/README.md). Active only when that index has a Covers column.
// 5. freshness: a document whose covered paths changed in several commits since the document
//    last changed is reported as possibly stale (a warning by default)
//
// Optional `.docs-check.json` at the root:
//   { "ignore": ["legacy/"], "pathDocs": ["CLAUDE.md"], "adrDir": "docs/adr",
//     "ignorePaths": ["^org/repo$"], "docsIndex": "docs/README.md",
//     "coverage": "error", "coverageIgnore": ["scripts/"],
//     "freshness": "warn", "staleAfterCommits": 3 }
//   coverage and freshness accept "error", "warn" or "off".
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Never part of the project: excluded from the file index and from scanning.
const NEVER_INDEXED = ['node_modules/', '.git/', 'dist/', 'build/', 'coverage/'];
const DEFAULTS = {
  // Extra locations whose Markdown is not scanned (they stay in the index, so links to them work).
  ignore: [],
  pathDocs: ['CLAUDE.md', 'docs/architecture.md'],
  adrDir: 'docs/adr',
  ignorePaths: [],
  docsIndex: 'docs/README.md',
  coverage: 'error',
  // Surfaces (path prefixes) that need no document.
  coverageIgnore: [],
  freshness: 'warn',
  staleAfterCommits: 3,
};
const LEVELS = ['error', 'warn', 'off'];
// Bumped when behaviour changes; project-sync compares it with a project's copy.
export const VERSION = '1.1.0';

const ADR_FILE = /^(\d{4})-.+\.md$/;
const ADR_STATUS = /^- \*\*Status\*\*:\s*(.+)$/m;
const VALID_STATUS = /^(Proposed|Accepted|Deprecated|Superseded by ADR-(\d{4}))\b/;

export function loadConfig(root) {
  const file = path.join(root, '.docs-check.json');
  const user = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const config = { ...DEFAULTS, ...user };
  for (const key of ['coverage', 'freshness']) {
    if (!LEVELS.includes(config[key])) {
      throw new Error(`.docs-check.json: "${key}" must be one of ${LEVELS.join(', ')}`);
    }
  }
  return config;
}

function listFiles(root, ignore) {
  const isIgnored = (rel) => ignore.some((prefix) => rel.startsWith(prefix));
  try {
    const out = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split('\n').filter((rel) => rel && !isIgnored(rel));
  } catch {
    return walk(root, '', isIgnored);
  }
}

function walk(root, rel, isIgnored) {
  const found = [];
  for (const entry of readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const child = rel ? `${rel}/${entry.name}` : entry.name;
    if (isIgnored(entry.isDirectory() ? `${child}/` : child)) continue;
    if (entry.isDirectory()) found.push(...walk(root, child, isIgnored));
    else found.push(child);
  }
  return found;
}

/** Every file and every directory of the project, as root-relative POSIX paths. */
function buildIndex(files) {
  const index = new Set();
  for (const file of files) {
    const parts = file.split('/');
    for (let end = 1; end <= parts.length; end += 1) index.add(parts.slice(0, end).join('/'));
  }
  return index;
}

/** Exact match, or a suffix match for documents that cite paths relative to a section's folder. */
function inIndex(index, token) {
  const clean = token.replace(/^\.\//, '').replace(/\/$/, '');
  if (index.has(clean)) return true;
  for (const known of index) if (known.endsWith(`/${clean}`)) return true;
  return false;
}

/** Lines outside fenced code blocks, with their 1-based numbers. */
function proseLines(text) {
  let inFence = false;
  const lines = [];
  text.split('\n').forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (!inFence) lines.push({ line, number: index + 1 });
  });
  return lines;
}

export function checkLinks(index, file, text) {
  const problems = [];
  const dir = path.posix.dirname(file);
  for (const { line, number } of proseLines(text)) {
    for (const match of line.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = match[1];
      if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue;
      const clean = decodeURIComponent(target.split('#')[0].split('?')[0]);
      if (!clean) continue;
      const resolved = path.posix.normalize(
        clean.startsWith('/') ? clean.slice(1) : path.posix.join(dir, clean),
      );
      // Links that climb above the root are host-relative (e.g. GitHub's ../../issues/1).
      if (resolved.startsWith('..')) continue;
      if (!index.has(resolved.replace(/\/$/, '') || '.') && resolved !== '.') {
        problems.push(`${file}:${number}: broken link -> ${target}`);
      }
    }
  }
  return problems;
}

const NOT_A_PATH = /[\s*{}<>$:=()…|\\^!@,;'"]/;

/** A token is path-like if it has a slash and ends with a file extension or a trailing slash. */
function citedPaths(line) {
  const tokens = [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  return tokens.filter(
    (token) =>
      token.includes('/') &&
      /(\.[A-Za-z0-9]+|\/)$/.test(token) &&
      !token.startsWith('/') &&
      !token.startsWith('~') &&
      !token.startsWith('-') &&
      !NOT_A_PATH.test(token) &&
      !/^[a-z][a-z0-9+.-]*:\/\//i.test(token),
  );
}

export function checkCitedPaths(index, file, text, ignorePatterns) {
  const problems = [];
  const ignored = ignorePatterns.map((pattern) => new RegExp(pattern));
  for (const { line, number } of proseLines(text)) {
    for (const token of citedPaths(line)) {
      if (ignored.some((pattern) => pattern.test(token))) continue;
      const relative = /^\.{1,2}\//.test(token)
        ? path.posix.normalize(path.posix.join(path.posix.dirname(file), token))
        : token;
      if (!inIndex(index, relative)) {
        problems.push(`${file}:${number}: cited path does not exist -> ${token}`);
      }
    }
  }
  return problems;
}

export function checkAdrs(root, adrDir) {
  const dir = path.join(root, adrDir);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  const problems = [];
  const adrs = readdirSync(dir)
    .map((name) => ({ name, match: ADR_FILE.exec(name) }))
    .filter(({ match }) => match && match[1] !== '0000')
    .map(({ name, match }) => ({ name, number: Number(match[1]) }))
    .sort((a, b) => a.number - b.number);
  const numbers = new Set(adrs.map(({ number }) => number));

  adrs.forEach(({ name, number }, index) => {
    const rel = `${adrDir}/${name}`;
    if (index > 0 && adrs[index - 1].number === number) {
      problems.push(`${rel}: duplicate ADR number ${number}`);
    } else if (number !== index + 1) {
      problems.push(`${rel}: ADR numbering has a gap (expected ${index + 1}, found ${number})`);
    }
    const text = readFileSync(path.join(dir, name), 'utf8');
    const heading = /^# ADR-(\d{4})\b/m.exec(text);
    if (!heading || Number(heading[1]) !== number) {
      problems.push(`${rel}: title must start with "# ADR-${String(number).padStart(4, '0')}"`);
    }
    const status = ADR_STATUS.exec(text);
    const valid = status && VALID_STATUS.exec(status[1].trim());
    if (!valid) {
      problems.push(`${rel}: missing or invalid "- **Status**:" line`);
    } else if (valid[2] && !numbers.has(Number(valid[2]))) {
      problems.push(`${rel}: superseded by ADR-${valid[2]} which does not exist`);
    }
  });
  return problems;
}

// ---- coverage and freshness, driven by the documentation index ------------------------------

const GLOB_CHARS = /[*?]/;
const SKIPPED_TOP_LEVEL = new Set(['docs']);
// Specific rules first: the first reason found for a path wins.
const SURFACE_RULES = [
  { reason: 'deployment', unit: (f) => (/(^|\/)Dockerfile(\..+)?$/.test(f) ? f : null) },
  { reason: 'deployment', unit: (f) => (/(^|\/)(docker-compose|compose)([.-][^/]+)?\.ya?ml$/.test(f) ? f : null) },
  { reason: 'deployment', unit: (f) => (/(^|\/)(nginx\.conf|Caddyfile|Procfile|fly\.toml|vercel\.json|netlify\.toml|serverless\.ya?ml|Chart\.yaml)$|\.tf$/.test(f) ? f : null) },
  { reason: 'CI', unit: (f) => (f.startsWith('.github/workflows/') ? f : null) },
  { reason: 'CI', unit: (f) => (f.startsWith('.circleci/') ? '.circleci/' : null) },
  { reason: 'CI', unit: (f) => (/^(\.gitlab-ci\.yml|Jenkinsfile|azure-pipelines\.yml)$/.test(f) ? f : null) },
  { reason: 'configuration', unit: (f) => (/(^|\/)\.env\.(example|sample)$/.test(f) ? f : null) },
  { reason: 'API contract', unit: (f) => (/(^|\/)(openapi|swagger)\.[^/]+$|\.(graphql|proto)$/.test(f) ? f : null) },
  { reason: 'data', unit: (f) => (/(^|\/)schema\.prisma$/.test(f) ? f : null) },
  { reason: 'data', unit: (f) => { const m = /^((?:.*\/)?migrations)\//.exec(f); return m ? `${m[1]}/` : null; } },
];

/** Rows of the index table that has a "Covers" column: { doc, covers: string[] }, or null. */
export function readIndex(root, indexPath) {
  const file = path.join(root, indexPath);
  if (!existsSync(file)) return null;
  const lines = readFileSync(file, 'utf8').split('\n');
  const header = lines.findIndex((line) => line.startsWith('|') && /\bCovers\b/i.test(line));
  if (header === -1) return null;
  const columns = lines[header].split('|').slice(1, -1).map((cell) => cell.trim().toLowerCase());
  const coversAt = columns.indexOf('covers');
  if (coversAt === -1) return null;
  const rows = [];
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const link = /\[[^\]]*\]\(([^)\s#]+)/.exec(cells[0] ?? '');
    rows.push({
      doc: link ? path.posix.normalize(path.posix.join(path.posix.dirname(indexPath), link[1])) : null,
      covers: [...(cells[coversAt] ?? '').matchAll(/`([^`]+)`/g)].map((match) => match[1]),
    });
  }
  return rows;
}

/** Map of surface path -> reason. A trailing `/` marks a directory. */
export function detectSurfaces(files, ignore) {
  const found = new Map();
  const add = (unit, reason) => {
    if (!found.has(unit) && !ignore.some((prefix) => unit.startsWith(prefix))) found.set(unit, reason);
  };
  for (const file of files) {
    for (const rule of SURFACE_RULES) {
      const unit = rule.unit(file);
      if (unit) add(unit, rule.reason);
    }
  }
  for (const file of files) {
    if (!file.includes('/')) continue;
    const top = file.split('/')[0];
    if (!top.startsWith('.') && !SKIPPED_TOP_LEVEL.has(top)) add(`${top}/`, 'top-level folder');
  }
  return found;
}

function globToRegExp(glob) {
  const source = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0000/g, '.*');
  return new RegExp(`^${source}$`);
}

/** A pattern and a surface overlap when one contains the other (or a glob matches inside it). */
function overlaps(pattern, surface, files) {
  const pat = pattern.replace(/^\.\//, '').replace(/\/$/, '');
  const target = surface.replace(/\/$/, '');
  if (GLOB_CHARS.test(pat)) {
    const regex = globToRegExp(pat);
    const inside = surface.endsWith('/') ? files.filter((file) => file.startsWith(surface)) : [surface];
    return inside.some((file) => regex.test(file) || regex.test(path.posix.dirname(file)));
  }
  return pat === target || target.startsWith(`${pat}/`) || pat.startsWith(`${target}/`);
}

export function checkCoverage(rows, files, ignore, indexPath) {
  const patterns = rows.flatMap((row) => row.covers);
  const problems = [];
  for (const [surface, reason] of detectSurfaces(files, ignore)) {
    if (!patterns.some((pattern) => overlaps(pattern, surface, files))) {
      problems.push(`${indexPath}: ${reason} not covered by any document -> ${surface}`);
    }
  }
  return problems;
}

function gitOut(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export function checkFreshness(root, rows, threshold) {
  const problems = [];
  for (const row of rows) {
    if (!row.doc || row.covers.length === 0) continue;
    const docFile = path.join(root, row.doc);
    if (!existsSync(docFile) || !statSync(docFile).isFile()) continue;
    const docCommit = gitOut(root, ['log', '-1', '--format=%H', '--', row.doc]);
    if (!docCommit) continue; // not a git repository, or the document is not committed yet
    if (gitOut(root, ['status', '--porcelain', '--', row.doc])) continue; // being updated right now
    const specs = row.covers.map((cover) => (GLOB_CHARS.test(cover) ? `:(glob)${cover}` : cover));
    const count = Number(gitOut(root, ['rev-list', '--count', `${docCommit}..HEAD`, '--', ...specs]) ?? 0);
    if (count >= threshold) {
      const covered = row.covers.map((cover) => `\`${cover}\``).join(', ');
      problems.push(`${row.doc}: possibly stale — ${count} commit(s) touched ${covered} since this document last changed`);
    }
  }
  return problems;
}

export function runAll(root) {
  const config = loadConfig(root);
  const files = listFiles(root, NEVER_INDEXED);
  const index = buildIndex(files);
  const errors = [];
  const warnings = [];
  const isScanned = (rel) =>
    rel.endsWith('.md') && !config.ignore.some((prefix) => rel.startsWith(prefix));
  for (const file of files.filter(isScanned)) {
    const text = readFileSync(path.join(root, file), 'utf8');
    errors.push(...checkLinks(index, file, text));
    if (config.pathDocs.includes(file)) {
      errors.push(...checkCitedPaths(index, file, text, config.ignorePaths));
    }
  }
  errors.push(...checkAdrs(root, config.adrDir));

  const route = (level, problems) => {
    if (level === 'error') errors.push(...problems);
    else if (level === 'warn') warnings.push(...problems);
  };
  const rows = config.coverage === 'off' && config.freshness === 'off' ? null : readIndex(root, config.docsIndex);
  if (rows) {
    route(config.coverage, checkCoverage(rows, files, config.coverageIgnore, config.docsIndex));
    route(config.freshness, checkFreshness(root, rows, config.staleAfterCommits));
  }
  return { errors, warnings, docsIndex: config.docsIndex };
}

export function run(root) {
  return runAll(root).errors;
}

// realpath: the skill folder is usually reached through a symlink, which would otherwise make
// this guard false and the script silently do nothing.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  if (process.argv[2] === '--version') {
    process.stdout.write(`${VERSION}\n`);
    process.exit(0);
  }
  const root = path.resolve(process.argv[2] ?? '.');
  const { errors, warnings, docsIndex } = runAll(root);
  if (warnings.length > 0) {
    process.stderr.write(`${warnings.map((warning) => `warning: ${warning}`).join('\n')}\n`);
  }
  if (errors.length > 0) {
    const uncovered = errors.some((problem) => problem.includes('not covered by any document'));
    const hint = uncovered
      ? `\nA surface is covered when a document of ${docsIndex} lists its path in its "Covers" column (in code spans). Add it there, or create the document (see doc-surfaces.md), or exempt the path with "coverageIgnore" in .docs-check.json.\n`
      : '';
    process.stderr.write(`${errors.join('\n')}\n${hint}\n${errors.length} documentation problem(s)\n`);
    process.exit(1);
  }
  process.stdout.write(
    warnings.length > 0
      ? `docs-check: no error (${warnings.length} warning(s))\n`
      : 'docs-check: no problem found\n',
  );
}
