import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const productionSurfaces = [
  ["Activity page", "src/app/activity/page.tsx"],
  ["StreamEventFeed", "components/StreamEventFeed.tsx"],
] as const;

describe("production activity surfaces", () => {
  it.each(productionSurfaces)("%s does not inject simulated events", (surface, file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source, `${surface} must not import or call simulateNewEvent()`).not.toMatch(/simulateNewEvent/);
  });
});
