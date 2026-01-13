#!/usr/bin/env node

/**
 * Manual test script using actual prompt files
 * 
 * Usage: node test-renderer-prompt.js
 */

const fs = require("fs");
const path = require("path");
const { loadTemplate, loadMetadata } = require("./dist/lib/registry/prompt-discovery");
const { loadConfig } = require("./dist/lib/workspace/config");
const { discoverWorkspace } = require("./dist/lib/workspace/discovery");
const { renderTemplate, renderTemplateWithMetadata } = require("./dist/lib/renderer/template-renderer");

console.log("=".repeat(60));
console.log("Testing Template Rendering with Real Prompt Files");
console.log("=".repeat(60));
console.log();

// Discover workspace
const workspaceRoot = discoverWorkspace();
console.log(`Workspace root: ${workspaceRoot}`);
console.log();

// Load config
const config = loadConfig(workspaceRoot);
console.log(`Config loaded:`, {
  version: config.version,
  promptsDir: config.paths?.prompts || "prompts",
});
console.log();

// Test with greeting prompt
try {
  console.log("Loading 'greeting' prompt...");
  const template = loadTemplate(workspaceRoot, "greeting", config);
  const metadata = loadMetadata(workspaceRoot, "greeting", config);
  
  console.log(`Template loaded:`);
  console.log("-".repeat(60));
  console.log(template);
  console.log("-".repeat(60));
  console.log();
  
  console.log(`Metadata:`, metadata);
  console.log();
  
  // Render with sample variables
  console.log("Rendering with sample variables...");
  const variables = {
    userName: "Alice",
    tone: "friendly",
  };
  
  const rendered = renderTemplate(template, variables);
  console.log(`Variables:`, variables);
  console.log(`Rendered:`);
  console.log("-".repeat(60));
  console.log(rendered);
  console.log("-".repeat(60));
  console.log();
  
  // Test with metadata tracking
  console.log("Testing with metadata tracking...");
  const result = renderTemplateWithMetadata(template, variables);
  console.log(`Missing variables:`, result.missingVariables);
  console.log(`Unused variables:`, result.unusedVariables);
  console.log();
  
  // Test with missing variables
  console.log("Testing with missing variables (warn strategy)...");
  const partialVars = { userName: "Bob" };
  const partialResult = renderTemplateWithMetadata(template, partialVars, {
    missingVariableStrategy: "warn",
  });
  console.log(`Variables:`, partialVars);
  console.log(`Rendered: "${partialResult.rendered}"`);
  console.log(`Missing variables:`, partialResult.missingVariables);
  console.log();
  
} catch (error) {
  console.error("Error:", error.message);
  console.log();
  console.log("Make sure you have a 'greeting' prompt initialized.");
  console.log("Run: node bin/dev.js init");
}

console.log("=".repeat(60));
console.log("Test completed!");
console.log("=".repeat(60));
