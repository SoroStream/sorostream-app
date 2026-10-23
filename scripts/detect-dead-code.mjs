#!/usr/bin/env node
/**
 * detect-dead-code.mjs — Flags component files with zero imports outside
 * their own test/story files.
 *
 * A component is considered "dead" (unreferenced) when no file other than
 * its co-located test (*.test.tsx) or story (*.stories.tsx) imports it.
 * This catches components that have accumulated test/story scaffolding but
 * are no longer wired into the actual application.
 *
 * ## Usage
 *
 *   node scripts/detect-dead-code.mjs
 *
 * Exit codes:
 *   0 — no dead components found
 *   1 — one or more dead components detected (CI fails)
 *
 * ## Handling false positives
 *
 * A component flagged as dead may be legitimately unused from a static import
 * graph perspective. Common reasons:
 *
 * 1. **Dynamic import** — `next/dynamic`, `React.lazy`, or `import()` loads the
 *    component at runtime. The static analyzer cannot see these.
 * 2. **Artifact-style runtime** — The component is registered via a string
 *    mapping, plugin registry, or convention-based loader.
 * 3. **Storybook-only component** — Intentionally built for isolated visual
 *    testing and never rendered in the app.
 *
 * To suppress a false positive, add the component's filename (without path)
 * to `ALLOWLIST` below with a short comment explaining why. Re-evaluate
 * allowlisted entries periodically — if the dynamic consumer is removed, the
 * component should be deleted, not kept allowlisted.
 */

import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, resolve, dirname, basename, extname, relative } from "path";

// ── Configuration ──────────────────────────────────────────────────────────

/**
 * Directories to scan for component files (.tsx, .ts).
 * Files in these directories are the candidates for dead-code detection.
 */
const COMPONENT_DIRS = ["components", "src/components"];

/**
 * Root directories to scan for import statements. We look at all .ts/.tsx
 * files in the project (excluding node_modules, .next, storybook-static, etc.)
 * to build the import graph.
 */
const SEARCH_ROOTS = ["components", "src", "lib"];

/**
 * File patterns that are considered "self" references (test/story files)
 * and therefore do NOT count as a real import of a component.
 */
const SELF_PATTERNS = [/\.test\.tsx?$/, /\.stories\.tsx?$/];

/**
 * Directories to exclude from the import-graph scan.
 */
const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "storybook-static",
  "coverage",
  "playwright-report",
  "playwright-report-a11y",
  "test-results",
  "e2e",
  ".storybook",
]);

/**
 * Components that are legitimately dead from a static import perspective.
 * Each entry must have a clear justification.
 *
 * Re-evaluate when:
 *   - The dynamic consumer is added/removed
 *   - The component is wired into the app via a normal import
 */
const ALLOWLIST = {
  // ── Known dead code (tracked for removal) ──────────────────────────────
  // These two components were already identified as dead code before this
  // check was added. They are allowlisted so CI passes while the removal
  // decision is pending (see the dead-code removal/consolidation issue).
  "StreamActions.tsx": "Superseded by inline actions in stream/[id]/page.tsx; kept for reference pending cleanup decision.",
  "StreamCreationForm.tsx": "Self-contained Storybook-only wrapper of the stream creation wizard; the /stream/new page uses its own inline wizard. Tracked for removal.",

  // ── Additional findings from the initial run ───────────────────────────
  // This file is a re-export (`export { default } from "@/src/components/InstallPrompt"`)
  // but the app's layout.tsx imports directly from @/src/components/InstallPrompt,
  // not from @/components/InstallPrompt. The re-export is therefore dead.
  "InstallPrompt.tsx": "Re-export of src/components/InstallPrompt.tsx; the app imports the source directly. Tracked for removal.",
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Recursively collect all files matching `extensions` under `dir`,
 * skipping any directory in `EXCLUDE_DIRS`.
 */
function collectFiles(dir, extensions) {
  const results = [];

  function walk(d) {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Resolve an import path (which may be a bare specifier like "@/components/Foo"
 * or a relative path like "./Foo") to a candidate file path.
 */
function resolveImportPath(importPath, fromFile) {
  // Alias: @/ maps to project root
  if (importPath.startsWith("@/")) {
    return resolveImportCandidate(importPath.slice(2));
  }

  // Relative import
  if (importPath.startsWith(".")) {
    return resolveImportCandidate(
      relative(process.cwd(), resolve(dirname(fromFile), importPath)),
    );
  }

  // Bare module specifier (e.g. "react", "recharts") — not a local component
  return null;
}

/**
 * Given a path without extension, try .tsx, .ts, .jsx, .js, /index.tsx, etc.
 * Returns the first existing file path or null.
 */
function resolveImportCandidate(partialPath) {
  const candidates = [
    `${partialPath}.tsx`,
    `${partialPath}.ts`,
    `${partialPath}.jsx`,
    `${partialPath}.js`,
    `${partialPath}/index.tsx`,
    `${partialPath}/index.ts`,
    `${partialPath}/index.jsx`,
    `${partialPath}/index.js`,
  ];

  for (const candidate of candidates) {
    const fullPath = resolve(process.cwd(), candidate);
    if (existsSync(fullPath)) {
      return relative(process.cwd(), fullPath);
    }
  }

  return null;
}

/**
 * Extract all import specifiers from a file's content.
 * Handles both static imports and dynamic imports.
 */
function extractImports(content) {
  const imports = new Set();

  // Static import statements: import X from "path"
  // import type { X } from "path"
  // import { X } from "path"
  // import X, { Y } from "path"
  const staticImportRegex =
    /import\s+(?:type\s+)?(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g;
  let match;
  while ((match = staticImportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  // Dynamic imports: import("path")
  // next/dynamic: dynamic(() => import("path"))
  const dynamicImportRegex = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  // Re-exports: export ... from "path"
  const reExportRegex = /export\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g;
  while ((match = reExportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  return imports;
}

/**
 * Check if a file is a test/story file (self-reference).
 */
function isSelfReference(filePath) {
  return SELF_PATTERNS.some((pattern) => pattern.test(filePath));
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  const projectRoot = process.cwd();

  // Step 1: Collect all component files from the target directories.
  const componentFiles = [];
  for (const dir of COMPONENT_DIRS) {
    const fullDir = join(projectRoot, dir);
    if (existsSync(fullDir)) {
      componentFiles.push(...collectFiles(fullDir, [".tsx", ".ts"]));
    }
  }

  // Normalize to relative paths from project root.
  const componentPaths = componentFiles
    .map((f) => relative(projectRoot, f))
    .filter((f) => !SELF_PATTERNS.some((p) => p.test(f)));

  // Step 2: Collect all source files to scan for imports.
  const sourceFiles = [];
  for (const dir of SEARCH_ROOTS) {
    const fullDir = join(projectRoot, dir);
    if (existsSync(fullDir)) {
      sourceFiles.push(...collectFiles(fullDir, [".ts", ".tsx"]));
    }
  }
  // Also include app directory under src
  const appDir = join(projectRoot, "src", "app");
  if (existsSync(appDir)) {
    sourceFiles.push(...collectFiles(appDir, [".ts", ".tsx"]));
  }

  // Step 3: Build the import graph.
  // For each component file, track who imports it (excluding self/test/story).
  const importers = new Map(); // componentPath -> Set of importer paths
  for (const comp of componentPaths) {
    importers.set(comp, new Set());
  }

  for (const sourceFile of sourceFiles) {
    const relSource = relative(projectRoot, sourceFile);
    let content;
    try {
      content = readFileSync(sourceFile, "utf-8");
    } catch {
      continue;
    }

    const importSpecifiers = extractImports(content);
    for (const spec of importSpecifiers) {
      const resolved = resolveImportPath(spec, sourceFile);
      if (resolved && importers.has(resolved)) {
        // This source file imports the component.
        // Only count it if the importer is NOT a test/story file of the
        // component itself.
        if (!isSelfReference(relSource)) {
          importers.get(resolved).add(relSource);
        }
      }
    }
  }

  // Step 4: Report dead components.
  const deadComponents = [];
  for (const [comp, importersSet] of importers) {
    if (importersSet.size === 0) {
      const filename = basename(comp);
      if (ALLOWLIST[filename]) {
        // Allowlisted — report as allowlisted but don't fail.
        console.log(`  [allowlisted] ${comp} — ${ALLOWLIST[filename]}`);
      } else {
        deadComponents.push(comp);
      }
    }
  }

  // Step 5: Output results.
  console.log("\nDead-code detection: scanning component files for zero real importers...\n");

  if (deadComponents.length > 0) {
    console.error("❌ Dead components found (no imports outside their own test/story files):\n");
    for (const comp of deadComponents) {
      console.error(`  • ${comp}`);
    }
    console.error(`\n${deadComponents.length} dead component(s) detected.`);
    console.error("\nIf any of these are false positives (dynamic import, artifact-style runtime,");
    console.error("Storybook-only), add them to ALLOWLIST in scripts/detect-dead-code.mjs with a");
    console.error("justification comment.\n");
    process.exit(1);
  }

  console.log("✅ No dead components detected.");
  process.exit(0);
}

main();
