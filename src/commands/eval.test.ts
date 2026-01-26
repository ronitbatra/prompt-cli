import { describe, it, expect, vi, beforeEach } from "vitest";
import Eval from "./eval";

describe("Eval command", () => {
  it("should be defined", () => {
    expect(Eval).toBeDefined();
  });

  it("should have latest flag", () => {
    expect(Eval.flags.latest).toBeDefined();
    expect(Eval.flags.latest.char).toBe("l");
  });

  it("should have file flag", () => {
    expect(Eval.flags.file).toBeDefined();
    expect(Eval.flags.file.char).toBe("f");
  });

  it("should have provider flag", () => {
    expect(Eval.flags.provider).toBeDefined();
    expect(Eval.flags.provider.char).toBe("p");
  });

  it("should have no-save flag", () => {
    expect(Eval.flags["no-save"]).toBeDefined();
  });

  it("should have detailed flag", () => {
    expect(Eval.flags.detailed).toBeDefined();
  });

  it("should have compact flag", () => {
    expect(Eval.flags.compact).toBeDefined();
    expect(Eval.flags.compact.char).toBe("c");
  });

  it("should have aggregate flag", () => {
    expect(Eval.flags.aggregate).toBeDefined();
    expect(Eval.flags.aggregate.char).toBe("a");
  });

  it("should have aggregate-prompt flag", () => {
    expect(Eval.flags["aggregate-prompt"]).toBeDefined();
  });

  it("should have aggregate-recent flag", () => {
    expect(Eval.flags["aggregate-recent"]).toBeDefined();
  });

  it("should have correct description", () => {
    expect(Eval.description).toContain("Run evaluations");
  });

  it("should have examples", () => {
    expect(Eval.examples).toBeDefined();
    expect(Eval.examples.length).toBeGreaterThan(0);
  });
});
