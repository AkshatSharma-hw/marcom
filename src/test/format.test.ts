/**
 * `plural` exists because count phrases were written as `${xs.length} things`,
 * which reads "1 communications" on any record that has exactly one — and every
 * demo pack has such records, so it was on screen, not hypothetical.
 */

import { describe, expect, it } from "vitest";
import { plural } from "@/lib/format";

describe("plural", () => {
  it("uses the singular for exactly one", () => {
    expect(plural(1, "communication")).toBe("1 communication");
    expect(plural(1, "segment")).toBe("1 segment");
  });

  it("uses the plural for zero and for many", () => {
    // Zero takes the plural in English — "0 communications", not "0 communication".
    expect(plural(0, "communication")).toBe("0 communications");
    expect(plural(11, "communication")).toBe("11 communications");
  });

  it("takes an explicit plural for irregular nouns", () => {
    expect(plural(1, "activity", "activities")).toBe("1 activity");
    expect(plural(3, "activity", "activities")).toBe("3 activities");
  });
});
