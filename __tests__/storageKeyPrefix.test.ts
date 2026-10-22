/**
 * Every localStorage / sessionStorage key must start with `sorostream-`
 * (convention in docs/storage-keys.md). Runs the same check as
 * `node scripts/check-storage-keys.mjs` (part of `npm run lint`) so it also
 * fails `npm run test:run`.
 */
import {
  KNOWN_VIOLATIONS,
  checkStorageKeys,
  scanSource,
} from '../scripts/check-storage-keys.mjs';

describe('storage key prefix convention', () => {
  it('has no unprefixed storage keys beyond the documented known violations', () => {
    const { unexpected, violations } = checkStorageKeys();
    const details = unexpected.map((k) => {
      const r = violations.get(k)!;
      return `"${r.key}" at ${r.file}:${r.line}`;
    });
    expect(details, 'new unprefixed storage keys; prefix them with "sorostream-"').toEqual([]);
  });

  it('keeps the known-violations list current', () => {
    const { stale } = checkStorageKeys();
    expect(stale, 'listed violations that no longer exist; remove them from KNOWN_VIOLATIONS').toEqual([]);
  });

  it('every known violation has a reason', () => {
    for (const [key, reason] of Object.entries(KNOWN_VIOLATIONS)) {
      expect(reason, key).toMatch(/\w/);
    }
  });

  describe('scanner', () => {
    const keysIn = (src: string) => scanSource(src, 'x.ts').map((r) => r.key);

    it('flags an unprefixed literal, constant, template and helper key', () => {
      const src = `
        const KEY = "my-feature";
        const PREFIX = "cache-";
        function keyFor(id: string) {
          return \`\${PREFIX}\${id}\`;
        }
        localStorage.setItem("raw-key", "1");
        sessionStorage.getItem(KEY);
        localStorage.removeItem(\`draft_\${id}\`);
        window.localStorage.getItem(keyFor(id));
      `;
      expect(keysIn(src)).toEqual(['raw-key', 'my-feature', 'draft_', 'cache-']);
      const { unexpected } = checkStorageKeys(scanSource(src, 'x.ts'));
      expect(unexpected).toEqual([
        'raw-key @ x.ts',
        'my-feature @ x.ts',
        'draft_ @ x.ts',
        'cache- @ x.ts',
      ]);
    });

    it('accepts both prefix spellings and resolves loops over key lists', () => {
      const src = `
        const KEYS = ["sorostream-a", "sorostream_b"];
        for (const key of KEYS) localStorage.getItem(key);
        const k = "sorostream-c" + id;
        sessionStorage.setItem(k, v);
      `;
      expect(keysIn(src)).toEqual(['sorostream-a', 'sorostream_b', 'sorostream-c']);
      expect(checkStorageKeys(scanSource(src, 'x.ts')).unexpected).toEqual([]);
    });

    it('reports keys it cannot resolve instead of guessing', () => {
      const refs = scanSource('function f(key: string) { localStorage.getItem(key); }', 'x.ts');
      expect(refs).toHaveLength(1);
      expect(refs[0].key).toBeNull();
    });
  });
});
