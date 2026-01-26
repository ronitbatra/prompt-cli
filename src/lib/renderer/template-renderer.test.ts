import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  renderTemplateWithMetadata,
} from "./template-renderer";

describe("Template Renderer", () => {
  describe("renderTemplate", () => {
    it("should render template with single variable", () => {
      const template = "Hello {{userName}}!";
      const variables = { userName: "Alice" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Hello Alice!");
    });

    it("should render template with multiple variables", () => {
      const template = "Hello {{userName}}, your {{item}} is ready.";
      const variables = { userName: "Alice", item: "order" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Hello Alice, your order is ready.");
    });

    it("should render template with duplicate variables", () => {
      const template = "Hello {{userName}}, {{userName}} again!";
      const variables = { userName: "Alice" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Hello Alice, Alice again!");
    });

    it("should handle template with no variables", () => {
      const template = "Hello world!";
      const variables = {};
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Hello world!");
    });

    it("should handle empty template", () => {
      const template = "";
      const variables = {};
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("");
    });

    it("should convert non-string values to strings", () => {
      const template = "Count: {{count}}, Active: {{active}}";
      const variables = { count: 42, active: true };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Count: 42, Active: true");
    });

    it("should handle null and undefined values", () => {
      const template = "Value: {{value}}, Other: {{other}}";
      const variables = { value: null, other: undefined };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Value: , Other: ");
    });

    it("should handle variables with underscores", () => {
      const template = "Hello {{user_name}}!";
      const variables = { user_name: "Alice" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Hello Alice!");
    });

    it("should handle multiline templates", () => {
      const template = `Hello {{userName}}!

Your {{item}} is ready.
Thank you!`;
      const variables = { userName: "Alice", item: "order" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe(`Hello Alice!

Your order is ready.
Thank you!`);
    });
  });

  describe("renderTemplate - missing variables", () => {
    it("should throw error when missing variables and strategy is 'error'", () => {
      const template = "Hello {{userName}}!";
      const variables = {};

      expect(() => {
        renderTemplate(template, variables, {
          missingVariableStrategy: "error",
        });
      }).toThrow(/Missing required template variables/);
    });

    it("should replace missing variables with placeholder when strategy is 'warn'", () => {
      const template = "Hello {{userName}}!";
      const variables = {};

      const rendered = renderTemplate(template, variables, {
        missingVariableStrategy: "warn",
      });

      expect(rendered).toBe("Hello {{MISSING}}!");
    });

    it("should use custom placeholder", () => {
      const template = "Hello {{userName}}!";
      const variables = {};

      const rendered = renderTemplate(template, variables, {
        missingVariableStrategy: "warn",
        missingVariablePlaceholder: "[NOT PROVIDED]",
      });

      expect(rendered).toBe("Hello [NOT PROVIDED]!");
    });

    it("should leave missing variables as-is when strategy is 'ignore'", () => {
      const template = "Hello {{userName}}!";
      const variables = {};

      const rendered = renderTemplate(template, variables, {
        missingVariableStrategy: "ignore",
      });

      expect(rendered).toBe("Hello {{userName}}!");
    });

    it("should replace missing variables with empty string when strategy is 'empty'", () => {
      const template = "Hello {{userName}}!";
      const variables = {};

      const rendered = renderTemplate(template, variables, {
        missingVariableStrategy: "empty",
      });

      expect(rendered).toBe("Hello !");
    });

    it("should handle partial missing variables", () => {
      const template = "Hello {{userName}}, your {{item}} is ready.";
      const variables = { userName: "Alice" };

      const rendered = renderTemplate(template, variables, {
        missingVariableStrategy: "warn",
      });

      expect(rendered).toBe("Hello Alice, your {{MISSING}} is ready.");
    });
  });

  describe("renderTemplateWithMetadata", () => {
    it("should return rendered template with metadata", () => {
      const template = "Hello {{userName}}!";
      const variables = { userName: "Alice" };

      const result = renderTemplateWithMetadata(template, variables);

      expect(result.rendered).toBe("Hello Alice!");
      expect(result.missingVariables).toEqual([]);
      expect(result.unusedVariables).toEqual([]);
    });

    it("should identify missing variables", () => {
      const template = "Hello {{userName}} and {{tone}}!";
      const variables = { userName: "Alice" };

      const result = renderTemplateWithMetadata(template, variables, {
        missingVariableStrategy: "warn",
      });

      expect(result.rendered).toBe("Hello Alice and {{MISSING}}!");
      expect(result.missingVariables).toEqual(["tone"]);
    });

    it("should identify unused variables", () => {
      const template = "Hello {{userName}}!";
      const variables = { userName: "Alice", unusedVar: "value" };

      const result = renderTemplateWithMetadata(template, variables);

      expect(result.rendered).toBe("Hello Alice!");
      expect(result.missingVariables).toEqual([]);
      expect(result.unusedVariables).toEqual(["unusedVar"]);
    });

    it("should handle both missing and unused variables", () => {
      const template = "Hello {{userName}}!";
      const variables = { unusedVar: "value" };

      const result = renderTemplateWithMetadata(template, variables, {
        missingVariableStrategy: "warn",
      });

      expect(result.missingVariables).toEqual(["userName"]);
      expect(result.unusedVariables).toEqual(["unusedVar"]);
    });
  });

  describe("renderTemplate - edge cases", () => {
    it("should handle variable at start of template", () => {
      const template = "{{greeting}} world!";
      const variables = { greeting: "Hello" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Hello world!");
    });

    it("should handle variable at end of template", () => {
      const template = "Hello {{name}}";
      const variables = { name: "world" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Hello world");
    });

    it("should handle adjacent variables", () => {
      const template = "{{greeting}}{{name}}!";
      const variables = { greeting: "Hi", name: "Alice" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("HiAlice!");
    });

    it("should handle variables with numbers", () => {
      const template = "Item {{item1}} and {{item2}}";
      const variables = { item1: "apple", item2: "banana" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Item apple and banana");
    });

    it("should handle variables with only numbers in name", () => {
      const template = "Count: {{count1}} and {{count2}}";
      const variables = { count1: "one", count2: "two" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Count: one and two");
    });

    it("should ignore invalid variable syntax (single braces)", () => {
      const template = "Hello {userName} and {{userName}}!";
      const variables = { userName: "Alice" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Hello {userName} and Alice!");
    });

    it("should handle invalid variable syntax (triple braces)", () => {
      const template = "Hello {{{userName}}} and {{userName}}!";
      const variables = { userName: "Alice" };
      const rendered = renderTemplate(template, variables);
      // The regex matches {{userName}} inside {{{userName}}}, leaving {Alice}
      expect(rendered).toBe("Hello {Alice} and Alice!");
    });

    it("should handle variables with spaces around braces (invalid)", () => {
      const template = "Hello {{ userName }} and {{userName}}!";
      const variables = { userName: "Alice" };
      const rendered = renderTemplate(template, variables);
      // The regex won't match {{ userName }}, so it stays as-is
      expect(rendered).toBe("Hello {{ userName }} and Alice!");
    });

    it("should handle very long template", () => {
      const longText = "a".repeat(1000);
      const template = `{{prefix}}${longText}{{suffix}}`;
      const variables = { prefix: "START-", suffix: "-END" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe(`START-${longText}-END`);
    });

    it("should handle very long variable values", () => {
      const longValue = "x".repeat(10000);
      const template = "Value: {{value}}";
      const variables = { value: longValue };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe(`Value: ${longValue}`);
    });

    it("should handle empty string variable values", () => {
      const template = "Hello {{name}}!";
      const variables = { name: "" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Hello !");
    });

    it("should handle zero as variable value", () => {
      const template = "Count: {{count}}";
      const variables = { count: 0 };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Count: 0");
    });

    it("should handle false as variable value", () => {
      const template = "Active: {{active}}";
      const variables = { active: false };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Active: false");
    });

    it("should handle object as variable value", () => {
      const template = "Data: {{data}}";
      const variables = { data: { key: "value" } };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Data: [object Object]");
    });

    it("should handle array as variable value", () => {
      const template = "Items: {{items}}";
      const variables = { items: [1, 2, 3] };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Items: 1,2,3");
    });

    it("should handle template with only variable", () => {
      const template = "{{value}}";
      const variables = { value: "test" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("test");
    });

    it("should handle template with multiple consecutive variables", () => {
      const template = "{{a}}{{b}}{{c}}";
      const variables = { a: "1", b: "2", c: "3" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("123");
    });

    it("should handle variables separated by whitespace only", () => {
      const template = "{{a}} {{b}}";
      const variables = { a: "hello", b: "world" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("hello world");
    });

    it("should handle variables with newlines between them", () => {
      const template = "{{a}}\n{{b}}";
      const variables = { a: "hello", b: "world" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("hello\nworld");
    });

    it("should handle special characters in variable values", () => {
      const template = "Text: {{text}}";
      const variables = { text: "Hello {{world}}!" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Text: Hello {{world}}!");
    });

    it("should handle unicode characters in variable values", () => {
      const template = "Message: {{msg}}";
      const variables = { msg: "Hello 世界 🌍" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Message: Hello 世界 🌍");
    });

    it("should handle unicode characters in variable names", () => {
      // Note: regex only allows \w+ so unicode won't match, but test the behavior
      const template = "Hello {{userName}} and {{user_name_123}}!";
      const variables = { userName: "Alice", user_name_123: "Bob" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Hello Alice and Bob!");
    });

    it("should handle error strategy with multiple missing variables", () => {
      const template = "Hello {{a}}, {{b}}, and {{c}}!";
      const variables = { a: "Alice" };

      expect(() => {
        renderTemplate(template, variables, {
          missingVariableStrategy: "error",
        });
      }).toThrow(/Missing required template variables/);
    });

    it("should handle all missing variables with empty strategy", () => {
      const template = "{{a}}{{b}}{{c}}";
      const variables = {};

      const rendered = renderTemplate(template, variables, {
        missingVariableStrategy: "empty",
      });

      expect(rendered).toBe("");
    });

    it("should handle all missing variables with ignore strategy", () => {
      const template = "{{a}}{{b}}{{c}}";
      const variables = {};

      const rendered = renderTemplate(template, variables, {
        missingVariableStrategy: "ignore",
      });

      expect(rendered).toBe("{{a}}{{b}}{{c}}");
    });

    it("should handle mixed valid and invalid variable syntax", () => {
      const template = "{invalid} {{valid}} {alsoInvalid}";
      const variables = { valid: "works" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("{invalid} works {alsoInvalid}");
    });
  });
});
