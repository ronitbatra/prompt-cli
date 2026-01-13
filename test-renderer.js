#!/usr/bin/env node

/**
 * Manual test script for Phase 3, Task 1: Variable Interpolation
 * 
 * Usage: node test-renderer.js
 */

// Import the renderer functions
// Note: This requires the TypeScript to be compiled first
const { renderTemplate, renderTemplateWithMetadata } = require("./dist/lib/renderer/template-renderer");

console.log("=".repeat(60));
console.log("Phase 3, Task 1: Template Rendering - Manual Test");
console.log("=".repeat(60));
console.log();

// Test 1: Basic single variable
console.log("Test 1: Basic single variable");
console.log("-".repeat(60));
const template1 = "Hello {{userName}}!";
const vars1 = { userName: "Alice" };
const result1 = renderTemplate(template1, vars1);
console.log(`Template: "${template1}"`);
console.log(`Variables:`, vars1);
console.log(`Result: "${result1}"`);
console.log();

// Test 2: Multiple variables
console.log("Test 2: Multiple variables");
console.log("-".repeat(60));
const template2 = "Hello {{userName}}, your {{item}} is ready.";
const vars2 = { userName: "Bob", item: "order" };
const result2 = renderTemplate(template2, vars2);
console.log(`Template: "${template2}"`);
console.log(`Variables:`, vars2);
console.log(`Result: "${result2}"`);
console.log();

// Test 3: Duplicate variables
console.log("Test 3: Duplicate variables");
console.log("-".repeat(60));
const template3 = "Hello {{userName}}, {{userName}} again!";
const vars3 = { userName: "Charlie" };
const result3 = renderTemplate(template3, vars3);
console.log(`Template: "${template3}"`);
console.log(`Variables:`, vars3);
console.log(`Result: "${result3}"`);
console.log();

// Test 4: Missing variable - warn strategy (default)
console.log("Test 4: Missing variable - warn strategy (default)");
console.log("-".repeat(60));
const template4 = "Hello {{userName}}, your {{item}} is ready.";
const vars4 = { userName: "David" };
const result4 = renderTemplate(template4, vars4);
console.log(`Template: "${template4}"`);
console.log(`Variables:`, vars4);
console.log(`Result: "${result4}"`);
console.log();

// Test 5: Missing variable - ignore strategy
console.log("Test 5: Missing variable - ignore strategy");
console.log("-".repeat(60));
const template5 = "Hello {{userName}}!";
const vars5 = {};
const result5 = renderTemplate(template5, vars5, {
  missingVariableStrategy: "ignore"
});
console.log(`Template: "${template5}"`);
console.log(`Variables:`, vars5);
console.log(`Result: "${result5}"`);
console.log();

// Test 6: Missing variable - empty strategy
console.log("Test 6: Missing variable - empty strategy");
console.log("-".repeat(60));
const template6 = "Hello {{userName}}!";
const vars6 = {};
const result6 = renderTemplate(template6, vars6, {
  missingVariableStrategy: "empty"
});
console.log(`Template: "${template6}"`);
console.log(`Variables:`, vars6);
console.log(`Result: "${result6}"`);
console.log();

// Test 7: Missing variable - error strategy
console.log("Test 7: Missing variable - error strategy");
console.log("-".repeat(60));
const template7 = "Hello {{userName}}!";
const vars7 = {};
try {
  const result7 = renderTemplate(template7, vars7, {
    missingVariableStrategy: "error"
  });
  console.log(`Result: "${result7}"`);
} catch (error) {
  console.log(`Error caught: ${error.message}`);
}
console.log();

// Test 8: Non-string values
console.log("Test 8: Non-string values (numbers, booleans)");
console.log("-".repeat(60));
const template8 = "Count: {{count}}, Active: {{active}}";
const vars8 = { count: 42, active: true };
const result8 = renderTemplate(template8, vars8);
console.log(`Template: "${template8}"`);
console.log(`Variables:`, vars8);
console.log(`Result: "${result8}"`);
console.log();

// Test 9: Multiline template
console.log("Test 9: Multiline template");
console.log("-".repeat(60));
const template9 = `Hello {{userName}}!

Your {{item}} is ready.
Thank you!`;
const vars9 = { userName: "Eve", item: "package" };
const result9 = renderTemplate(template9, vars9);
console.log(`Template:`);
console.log(template9);
console.log(`Variables:`, vars9);
console.log(`Result:`);
console.log(result9);
console.log();

// Test 10: Metadata tracking
console.log("Test 10: Metadata tracking");
console.log("-".repeat(60));
const template10 = "Hello {{userName}} and {{tone}}!";
const vars10 = { userName: "Frank", unusedVar: "value" };
const result10 = renderTemplateWithMetadata(template10, vars10, {
  missingVariableStrategy: "warn"
});
console.log(`Template: "${template10}"`);
console.log(`Variables:`, vars10);
console.log(`Rendered: "${result10.rendered}"`);
console.log(`Missing variables:`, result10.missingVariables);
console.log(`Unused variables:`, result10.unusedVariables);
console.log();

console.log("=".repeat(60));
console.log("All tests completed!");
console.log("=".repeat(60));
