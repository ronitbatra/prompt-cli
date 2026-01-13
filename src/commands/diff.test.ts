import { describe, it, expect } from "vitest";
import Diff from "./diff";

describe("Diff command", () => {
  it("should be defined", () => {
    expect(Diff).toBeDefined();
  });

  it("should have template flag", () => {
    expect(Diff.flags.template).toBeDefined();
  });

  it("should have metadata flag", () => {
    expect(Diff.flags.metadata).toBeDefined();
  });

  it("should have oldVersion and newVersion args", () => {
    expect(Diff.args.oldVersion).toBeDefined();
    expect(Diff.args.newVersion).toBeDefined();
  });

  it("should have correct description", () => {
    expect(Diff.description).toContain("Compare two versions");
  });
});
