/**
 * Enforces the storage-key prefix convention (docs/storage-keys.md): every
 * localStorage / sessionStorage key the app reads or writes starts with
 * `sorostream-` (or the older `sorostream_`), so it can't collide with a
 * third-party script or browser extension on the same origin.
 *
 * Finds every `getItem` / `setItem` / `removeItem` call on localStorage,
 * sessionStorage or a `storage` variable in app source, and resolves the key
 * argument to a literal or a static prefix:
 *   - string literals, and template literals up to their first `${`
 *   - a same-file `const NAME = "..."` (or template), including `NAME + x`
 *   - a same-file helper `fn(...)` whose body builds the key
 *   - `for (const key of LIST)` over a same-file array of literals
 * Anything else is reported as unresolved (a warning, not a failure).
 *
 * Existing violations are listed in KNOWN_VIOLATIONS: flagged, not fixed.
 * The check fails on a violation that isn't listed, and on a listed one
 * that no longer exists (so the list can't go stale).
 *
 * Run: node scripts/check-storage-keys.mjs (also part of `npm run lint`).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.join(path.dirname(__filename), "..");
const SOURCE_DIRS = ["src", "components", "lib", "hooks", "contexts"];
const PREFIX = /^sorostream[-_]/;

/** `key @ file` → why it is tolerated. Keep in sync with docs/storage-keys.md. */
export const KNOWN_VIOLATIONS = {
  "theme @ src/lib/theme.tsx": "legacy key: read once, migrated to sorostream_theme and removed",
  "theme @ src/app/layout.tsx": "legacy key: read by the pre-hydration theme script as a fallback",
  "analytics_events @ src/lib/analytics.ts": "unprefixed write; should become sorostream-analytics-events",
  "addressBook @ components/StreamCreationForm.tsx": "read-only import of address books written by other tools",
  "stellarAddressBook @ components/StreamCreationForm.tsx": "read-only import of address books written by other tools",
  "stellar-address-book @ components/StreamCreationForm.tsx": "read-only import of address books written by other tools",
  "address-book @ components/StreamCreationForm.tsx": "read-only import of address books written by other tools",
  "stellar_address_book @ components/StreamCreationForm.tsx": "read-only import of address books written by other tools",
  "contacts @ components/StreamCreationForm.tsx": "read-only import of address books written by other tools",
};

function listSourceFiles() {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "__tests__" || entry.name === "test") continue;
        walk(full);
      } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) && !/\.(test|spec|stories)\./.test(entry.name)) {
        out.push(full);
      }
    }
  };
  for (const dir of SOURCE_DIRS) walk(path.join(ROOT, dir));
  return out;
}

/** Static text of a string/template literal expression, or null. */
function literalValue(expr) {
  expr = expr.trim();
  let m = expr.match(/^(["'])((?:\\.|(?!\1).)*)\1$/);
  if (m) return { value: m[2], exact: true };
  m = expr.match(/^`([^`$]*)(\$\{)?/);
  if (m) return { value: m[1], exact: !m[2] && expr.endsWith("`") && !expr.includes("${") };
  return null;
}

function resolveExpr(expr, src, depth = 0, at = src.length) {
  if (depth > 6) return [];
  expr = expr.trim();
  // `${NAME}rest` → NAME's value is the prefix
  const leading = expr.match(/^`\$\{\s*([A-Za-z_$][\w$]*)\s*\}/);
  if (leading) {
    return resolveExpr(leading[1], src, depth + 1).map((r) => ({ value: r.value, exact: false }));
  }
  const lit = literalValue(expr);
  if (lit) return [lit];

  // NAME + suffix or "literal" + suffix  →  prefix
  const concat = expr.match(/^([A-Za-z_$][\w$]*|(["'])(?:\\.|(?!\2).)*\2)\s*\+/);
  if (concat) {
    return resolveExpr(concat[1], src, depth + 1).map((r) => ({ value: r.value, exact: false }));
  }

  // helper(args)  →  whatever the helper's first `return` builds
  const call = expr.match(/^([A-Za-z_$][\w$]*)\s*\(/);
  if (call) {
    const fn = src.match(new RegExp(`function\\s+${call[1]}\\s*\\([^)]*\\)[^{]*\\{`));
    if (fn) {
      const inner = src.slice(fn.index + fn[0].length).match(/return\s+([^;]+);/);
      if (inner) {
        const cleaned = inner[1].replace(/^[^?]*\?\s*/, "").replace(/\s*:\s*null\s*$/, "");
        return resolveExpr(cleaned, src, depth + 1).map((r) => ({ value: r.value, exact: false }));
      }
    }
    return [];
  }

  const ident = expr.match(/^[A-Za-z_$][\w$]*$/);
  if (ident) {
    const name = ident[0];
    // for (const key of LIST)
    const loop = src.match(new RegExp(`for\\s*\\(\\s*const\\s+${name}\\s+of\\s+([A-Za-z_$][\\w$]*)`));
    if (loop) {
      const arr = src.match(new RegExp(`const\\s+${loop[1]}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
      if (arr) {
        return [...arr[1].matchAll(/(["'])((?:\\.|(?!\1).)*)\1/g)].map((x) => ({ value: x[2], exact: true }));
      }
    }
    // The closest declaration above the call wins (several functions may
    // each declare their own `key`); otherwise the first one in the file.
    const declRe = new RegExp(`(?:const|let)\\s+${name}\\s*(?::[^=]+)?=\\s*([^;\\n]+)`, "g");
    const decl = [...src.slice(0, at).matchAll(declRe)].pop() ?? [...src.matchAll(declRe)][0];
    if (decl) return resolveExpr(decl[1], src, depth + 1);
  }
  return [];
}

/**
 * Every storage key reference in app source.
 * @returns {{file: string, line: number, storage: string, key: string|null, exact: boolean}[]}
 */
export function scanStorageKeys() {
  return listSourceFiles().flatMap((file) =>
    scanSource(fs.readFileSync(file, "utf8"), path.relative(ROOT, file).split(path.sep).join("/")),
  );
}

/** Storage key references in one file's source. */
export function scanSource(src, rel) {
  const refs = [];
  const call = /\b(localStorage|sessionStorage|storage)\s*\.\s*(getItem|setItem|removeItem)\(\s*/g;
  for (const m of src.matchAll(call)) {
    // The key argument: up to the first top-level `,` or `)`.
    let i = m.index + m[0].length;
    let depth = 0;
    let quote = null;
    let arg = "";
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === "\\") {
          arg += c + src[++i];
          continue;
        }
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") {
        if (depth === 0) break;
        depth--;
      } else if (c === "," && depth === 0) break;
      arg += c;
    }
    const line = src.slice(0, m.index).split("\n").length;
    const storage = m[1] === "storage" ? "storage variable" : m[1];
    const resolved = resolveExpr(arg, src, 0, m.index);
    if (resolved.length === 0) {
      refs.push({ file: rel, line, storage, key: null, exact: false, expr: arg.trim() });
    }
    for (const r of resolved) refs.push({ file: rel, line, storage, key: r.value, exact: r.exact });
  }
  return refs;
}

/** Keys that break the convention, unlisted violations, and stale list entries. */
export function checkStorageKeys(refs = scanStorageKeys()) {
  const violations = new Map();
  for (const r of refs) {
    if (r.key === null || PREFIX.test(r.key)) continue;
    violations.set(`${r.key} @ ${r.file}`, r);
  }
  const unexpected = [...violations.keys()].filter((k) => !(k in KNOWN_VIOLATIONS));
  const stale = Object.keys(KNOWN_VIOLATIONS).filter((k) => !violations.has(k));
  const unresolved = refs.filter((r) => r.key === null);
  return { violations, unexpected, stale, unresolved };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const { violations, unexpected, stale, unresolved } = checkStorageKeys();
  for (const k of violations.keys()) {
    if (k in KNOWN_VIOLATIONS) console.warn(`storage-keys: known violation ${k} (${KNOWN_VIOLATIONS[k]})`);
  }
  for (const r of unresolved) {
    console.warn(`storage-keys: could not resolve key \`${r.expr}\` at ${r.file}:${r.line}`);
  }
  if (unexpected.length || stale.length) {
    for (const k of unexpected) {
      const r = violations.get(k);
      console.error(`storage-keys: "${r.key}" at ${r.file}:${r.line} must start with "sorostream-" (see docs/storage-keys.md)`);
    }
    for (const k of stale) console.error(`storage-keys: KNOWN_VIOLATIONS entry "${k}" no longer occurs; remove it`);
    process.exit(1);
  }
  console.log("storage-keys: all storage keys follow the sorostream- prefix convention");
}
