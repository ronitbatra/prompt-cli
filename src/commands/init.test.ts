import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import Init from "./init";

describe("Init command", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "promptforge-test-"));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should be defined", () => {
    expect(Init).toBeDefined();
  });

  it("should have force flag", () => {
    expect(Init.flags.force).toBeDefined();
  });
});
