#!/usr/bin/env tsx

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const docsListFile = fileURLToPath(import.meta.url);
const docsListDir = dirname(docsListFile);
const repoRoot = resolve(docsListDir, '..');

function readFlagValue(args: string[], flag: string): string | null {
  const idx = args.indexOf(flag);
  if (idx === -1) {
    return null;
  }
  const value = args[idx + 1];
  if (!value || value.startsWith('-')) {
    return '';
  }
  return value;
}

function isInsideRepoRoot(cwd: string): boolean {
  const rel = relative(repoRoot, cwd);
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith('../'));
}

function resolveDocsDir(): string {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(
      'Usage: bun scripts/docs-list.ts [--docs <path>] [--root <path>]\n' +
        '  --docs <path>  Explicit docs directory.\n' +
        '  --root <path>  Repo root; docs assumed at <root>/docs.\n' +
        'Env vars: DOCS_DIR or DOCS_ROOT.'
    );
    process.exit(0);
  }

  const docsArg = readFlagValue(args, '--docs');
  if (docsArg !== null) {
    if (!docsArg) {
      console.error('Error: --docs requires a path.');
      process.exit(1);
    }
    return resolve(docsArg);
  }

  const rootArg = readFlagValue(args, '--root');
  if (rootArg !== null) {
    if (!rootArg) {
      console.error('Error: --root requires a path.');
      process.exit(1);
    }
    return resolve(rootArg, 'docs');
  }

  const docsDirEnv = process.env.DOCS_DIR?.trim();
  if (docsDirEnv) {
    return resolve(docsDirEnv);
  }

  const docsRootEnv = process.env.DOCS_ROOT?.trim();
  if (docsRootEnv) {
    return resolve(docsRootEnv, 'docs');
  }

  const cwdDocs = resolve(process.cwd(), 'docs');
  if (existsSync(cwdDocs)) {
    return cwdDocs;
  }

  const repoDocs = resolve(repoRoot, 'docs');
  if (isInsideRepoRoot(process.cwd()) && existsSync(repoDocs)) {
    return repoDocs;
  }

  console.error(
    'Error: docs directory not found. Provide --docs <path>, --root <path>, or set DOCS_DIR/DOCS_ROOT.'
  );
  process.exit(1);
}

const DOCS_DIR = resolveDocsDir();

const EXCLUDED_DIRS = new Set(['archive', 'research']);

function compactStrings(values: unknown[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }
    const normalized = String(value).trim();
    if (normalized.length > 0) {
      result.push(normalized);
    }
  }
  return result;
}

function walkMarkdownFiles(dir: string, base: string = dir): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      files.push(...walkMarkdownFiles(fullPath, base));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relative(base, fullPath));
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function extractMetadata(fullPath: string): {
  summary: string | null;
  readWhen: string[];
  error?: string;
} {
  const content = readFileSync(fullPath, 'utf8');

  if (!content.startsWith('---')) {
    return { summary: null, readWhen: [], error: 'missing front matter' };
  }

  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) {
    return { summary: null, readWhen: [], error: 'unterminated front matter' };
  }

  const frontMatter = content.slice(3, endIndex).trim();
  const lines = frontMatter.split('\n');

  let summaryLine: string | null = null;
  const readWhen: string[] = [];
  let collectingField: 'read_when' | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('summary:')) {
      summaryLine = line;
      collectingField = null;
      continue;
    }

    if (line.startsWith('read_when:')) {
      collectingField = 'read_when';
      const inline = line.slice('read_when:'.length).trim();
      if (inline.startsWith('[') && inline.endsWith(']')) {
        try {
          const parsed = JSON.parse(inline.replace(/'/g, '"')) as unknown;
          if (Array.isArray(parsed)) {
            readWhen.push(...compactStrings(parsed));
          }
        } catch {
          // ignore malformed inline arrays
        }
      }
      continue;
    }

    if (collectingField === 'read_when') {
      if (line.startsWith('- ')) {
        const hint = line.slice(2).trim();
        if (hint) {
          readWhen.push(hint);
        }
      } else if (line === '') {
      } else {
        collectingField = null;
      }
    }
  }

  if (!summaryLine) {
    return { summary: null, readWhen, error: 'summary key missing' };
  }

  const summaryValue = summaryLine.slice('summary:'.length).trim();
  const normalized = summaryValue
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return { summary: null, readWhen, error: 'summary is empty' };
  }

  return { summary: normalized, readWhen };
}

console.log(`Listing all markdown files in docs folder: ${DOCS_DIR}`);

const markdownFiles = walkMarkdownFiles(DOCS_DIR);

for (const relativePath of markdownFiles) {
  const fullPath = join(DOCS_DIR, relativePath);
  const { summary, readWhen, error } = extractMetadata(fullPath);
  if (summary) {
    console.log(`${relativePath} - ${summary}`);
    if (readWhen.length > 0) {
      console.log(`  Read when: ${readWhen.join('; ')}`);
    }
  } else {
    const reason = error ? ` - [${error}]` : '';
    console.log(`${relativePath}${reason}`);
  }
}

console.log(
  '\nReminder: keep docs up to date as behavior changes. When your task matches any "Read when" hint above (React hooks, cache directives, database work, tests, etc.), read that doc before coding, and suggest new coverage when it is missing.'
);
