import { describe, it, expect } from "vitest";
import {
  evaluateContains,
  evaluateRegex,
  evaluateMaxWords,
  evaluateExpectation,
  evaluateExpectations,
} from "./expectations";
import type {
  ContainsExpectation,
  RegexExpectation,
  MaxWordsExpectation,
} from "./types";

describe("Expectation Evaluators", () => {
  describe("evaluateContains", () => {
    it("should pass when output contains the value", () => {
      const expectation: ContainsExpectation = {
        type: "contains",
        value: "hello",
      };
      const output = "Hello, world!";

      const result = evaluateContains(output, expectation);

      expect(result.passed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should fail when output does not contain the value", () => {
      const expectation: ContainsExpectation = {
        type: "contains",
        value: "goodbye",
      };
      const output = "Hello, world!";

      const result = evaluateContains(output, expectation);

      expect(result.passed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("does not contain");
    });

    it("should be case-insensitive by default", () => {
      const expectation: ContainsExpectation = {
        type: "contains",
        value: "HELLO",
      };
      const output = "hello, world!";

      const result = evaluateContains(output, expectation);

      expect(result.passed).toBe(true);
    });

    it("should be case-sensitive when specified", () => {
      const expectation: ContainsExpectation = {
        type: "contains",
        value: "HELLO",
        caseSensitive: true,
      };
      const output = "hello, world!";

      const result = evaluateContains(output, expectation);

      expect(result.passed).toBe(false);
    });

    it("should handle empty output", () => {
      const expectation: ContainsExpectation = {
        type: "contains",
        value: "hello",
      };
      const output = "";

      const result = evaluateContains(output, expectation);

      expect(result.passed).toBe(false);
    });

    it("should handle empty search value", () => {
      const expectation: ContainsExpectation = {
        type: "contains",
        value: "",
      };
      const output = "Hello, world!";

      const result = evaluateContains(output, expectation);

      expect(result.passed).toBe(true); // Empty string is always contained
    });

    it("should include details in result", () => {
      const expectation: ContainsExpectation = {
        type: "contains",
        value: "hello",
      };
      const output = "Hello, world!";

      const result = evaluateContains(output, expectation);

      expect(result.details).toBeDefined();
      expect(result.details?.searched).toBe("hello");
      expect(result.details?.found).toBe(true);
    });
  });

  describe("evaluateRegex", () => {
    it("should pass when output matches the pattern", () => {
      const expectation: RegexExpectation = {
        type: "regex",
        value: "^Hello",
      };
      const output = "Hello, world!";

      const result = evaluateRegex(output, expectation);

      expect(result.passed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should fail when output does not match the pattern", () => {
      const expectation: RegexExpectation = {
        type: "regex",
        value: "^Goodbye",
      };
      const output = "Hello, world!";

      const result = evaluateRegex(output, expectation);

      expect(result.passed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should support regex flags", () => {
      const expectation: RegexExpectation = {
        type: "regex",
        value: "^hello",
        flags: "i", // Case-insensitive
      };
      const output = "Hello, world!";

      const result = evaluateRegex(output, expectation);

      expect(result.passed).toBe(true);
    });

    it("should handle complex regex patterns", () => {
      const expectation: RegexExpectation = {
        type: "regex",
        value: "\\d+",
      };
      const output = "The answer is 42";

      const result = evaluateRegex(output, expectation);

      expect(result.passed).toBe(true);
    });

    it("should handle invalid regex patterns", () => {
      const expectation: RegexExpectation = {
        type: "regex",
        value: "[invalid",
      };
      const output = "Hello, world!";

      const result = evaluateRegex(output, expectation);

      expect(result.passed).toBe(false);
      expect(result.error).toContain("Invalid regex pattern");
    });

    it("should include match details when successful", () => {
      const expectation: RegexExpectation = {
        type: "regex",
        value: "\\d+",
      };
      const output = "The answer is 42";

      const result = evaluateRegex(output, expectation);

      expect(result.details).toBeDefined();
      expect(result.details?.matched).toBe(true);
      expect(result.details?.match).toBe("42");
    });

    it("should handle empty output", () => {
      const expectation: RegexExpectation = {
        type: "regex",
        value: ".*",
      };
      const output = "";

      const result = evaluateRegex(output, expectation);

      expect(result.passed).toBe(true); // .* matches empty string
    });
  });

  describe("evaluateMaxWords", () => {
    it("should pass when word count is within limit", () => {
      const expectation: MaxWordsExpectation = {
        type: "maxWords",
        value: 10,
      };
      const output = "This is a short sentence.";

      const result = evaluateMaxWords(output, expectation);

      expect(result.passed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should pass when word count equals limit", () => {
      const expectation: MaxWordsExpectation = {
        type: "maxWords",
        value: 5,
      };
      const output = "One two three four five";

      const result = evaluateMaxWords(output, expectation);

      expect(result.passed).toBe(true);
    });

    it("should fail when word count exceeds limit", () => {
      const expectation: MaxWordsExpectation = {
        type: "maxWords",
        value: 3,
      };
      const output = "This is a longer sentence with more words.";

      const result = evaluateMaxWords(output, expectation);

      expect(result.passed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("words");
    });

    it("should handle empty output", () => {
      const expectation: MaxWordsExpectation = {
        type: "maxWords",
        value: 10,
      };
      const output = "";

      const result = evaluateMaxWords(output, expectation);

      expect(result.passed).toBe(true); // 0 words <= 10
    });

    it("should handle output with only whitespace", () => {
      const expectation: MaxWordsExpectation = {
        type: "maxWords",
        value: 5,
      };
      const output = "   \n\t  ";

      const result = evaluateMaxWords(output, expectation);

      expect(result.passed).toBe(true); // 0 words
    });

    it("should handle multiple spaces between words", () => {
      const expectation: MaxWordsExpectation = {
        type: "maxWords",
        value: 3,
      };
      const output = "One    two   three";

      const result = evaluateMaxWords(output, expectation);

      expect(result.passed).toBe(true);
    });

    it("should include word count in details", () => {
      const expectation: MaxWordsExpectation = {
        type: "maxWords",
        value: 10,
      };
      const output = "One two three four five";

      const result = evaluateMaxWords(output, expectation);

      expect(result.details).toBeDefined();
      expect(result.details?.wordCount).toBe(5);
      expect(result.details?.maxWords).toBe(10);
    });

    it("should handle zero max words", () => {
      const expectation: MaxWordsExpectation = {
        type: "maxWords",
        value: 0,
      };
      const output = "";

      const result = evaluateMaxWords(output, expectation);

      expect(result.passed).toBe(true);
    });
  });

  describe("evaluateExpectation", () => {
    it("should evaluate contains expectation", () => {
      const expectation: ContainsExpectation = {
        type: "contains",
        value: "hello",
      };
      const output = "Hello, world!";

      const result = evaluateExpectation(output, expectation);

      expect(result.passed).toBe(true);
      expect(result.expectation.type).toBe("contains");
    });

    it("should evaluate regex expectation", () => {
      const expectation: RegexExpectation = {
        type: "regex",
        value: "^Hello",
      };
      const output = "Hello, world!";

      const result = evaluateExpectation(output, expectation);

      expect(result.passed).toBe(true);
      expect(result.expectation.type).toBe("regex");
    });

    it("should evaluate maxWords expectation", () => {
      const expectation: MaxWordsExpectation = {
        type: "maxWords",
        value: 10,
      };
      const output = "Short sentence.";

      const result = evaluateExpectation(output, expectation);

      expect(result.passed).toBe(true);
      expect(result.expectation.type).toBe("maxWords");
    });
  });

  describe("evaluateExpectations", () => {
    it("should evaluate multiple expectations", () => {
      const expectations = [
        { type: "contains" as const, value: "hello" },
        { type: "maxWords" as const, value: 10 },
      ];
      const output = "Hello, world!";

      const results = evaluateExpectations(output, expectations);

      expect(results).toHaveLength(2);
      expect(results[0].expectation.type).toBe("contains");
      expect(results[1].expectation.type).toBe("maxWords");
    });

    it("should handle mixed pass/fail results", () => {
      const expectations = [
        { type: "contains" as const, value: "hello" },
        { type: "contains" as const, value: "goodbye" },
      ];
      const output = "Hello, world!";

      const results = evaluateExpectations(output, expectations);

      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(false);
    });

    it("should handle empty expectations array", () => {
      const results = evaluateExpectations("Hello, world!", []);

      expect(results).toHaveLength(0);
    });
  });
});
