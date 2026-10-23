# Dead-Code Detection

The CI pipeline runs `npm run detect-dead-code` (see `scripts/detect-dead-code.mjs`)
after linting to catch component files that have zero imports outside their own
test/story files. This prevents dead components like `StreamActions.tsx` and
`StreamCreationForm.tsx` from accumulating unnoticed.

## How it works

1. The script scans `components/` and `src/components/` for `.tsx`/`.ts` files.
2. It builds an import graph by scanning all `.ts`/`.tsx` files under `components/`,
   `src/`, and `lib/` for static imports, dynamic `import()` calls, and re-exports.
3. A component is flagged as **dead** when no file other than its own co-located
   test (`*.test.tsx`) or story (`*.stories.tsx`) file imports it.

## Handling false positives

A component may be flagged as dead even though it is used at runtime. Common
reasons:

1. **Dynamic import** — `next/dynamic`, `React.lazy`, or `import()` loads the
   component at runtime. The static analyzer detects `import("path")` calls but
   may miss string-based dynamic loaders.
2. **Artifact-style runtime** — The component is registered via a string mapping,
   plugin registry, or convention-based loader that the script cannot resolve.
3. **Storybook-only component** — Intentionally built for isolated visual testing
   and never rendered in the app.

### How to suppress a false positive

Add the component's filename (basename only) to the `ALLOWLIST` object in
`scripts/detect-dead-code.mjs` with a short comment explaining why:

```js
const ALLOWLIST = {
  "MyComponent.tsx": "Loaded via next/dynamic in dashboard; static import graph cannot resolve it.",
};
```

Re-evaluate allowlisted entries periodically — if the dynamic consumer is
removed, the component should be deleted, not kept allowlisted.

## Current findings

The initial run identified three dead components beyond the two already known:

| Component | Status | Notes |
|-----------|--------|-------|
| `components/StreamActions.tsx` | Allowlisted | Superseded by inline actions in `stream/[id]/page.tsx` |
| `components/StreamCreationForm.tsx` | Allowlisted | Storybook-only wrapper; `/stream/new` uses its own inline wizard |
| `components/InstallPrompt.tsx` | Allowlisted | Re-export of `src/components/InstallPrompt.tsx`; app imports the source directly |

These are tracked for removal in the dead-code cleanup/consolidation decision.
