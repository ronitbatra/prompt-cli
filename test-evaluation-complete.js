#!/usr/bin/env node

/**
 * Complete manual test script for Phase 5: Evaluation Engine
 * 
 * Usage: node test-evaluation-complete.js
 */

const fs = require("fs");
const path = require("path");

// Import required modules
const { 
  readJsonlFile, 
  runEvaluation, 
  MockProvider,
  formatEvaluationSummary,
  formatCompactSummary
} = require("./dist/lib/evaluation");
const { discoverWorkspace, loadConfig } = require("./dist/lib/workspace");

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 5: Evaluation Engine - Complete Test");
  console.log("=".repeat(60));
  console.log();

  try {
    const workspaceRoot = discoverWorkspace();
    const config = loadConfig(workspaceRoot);
    
    console.log(`Workspace: ${workspaceRoot}`);
    console.log();

    // Test 1: Read and display fixtures
    console.log("Test 1: Reading JSONL fixtures");
    console.log("-".repeat(60));
    const evalsDir = `${workspaceRoot}/evals`;
    const jsonlPath = `${evalsDir}/greeting.jsonl`;
    
    if (!fs.existsSync(jsonlPath)) {
      console.log("No greeting.jsonl found. Creating test fixture...");
      // Create a test fixture
      const testFixture = {
        prompt: "greeting@v1",
        variables: { userName: "Alice" },
        expectations: [
          { type: "maxWords", value: 100 }, // This will pass
        ],
      };
      fs.writeFileSync(jsonlPath, JSON.stringify(testFixture) + "\n", "utf-8");
      console.log("Created test fixture");
    }
    
    const readResult = readJsonlFile(jsonlPath);
    console.log(`Fixtures found: ${readResult.fixtures.length}`);
    readResult.fixtures.forEach((fixture, i) => {
      console.log(`  ${i + 1}. ${fixture.prompt} with ${fixture.expectations.length} expectation(s)`);
    });
    console.log();

    // Test 2: Run evaluation with fixed response provider
    console.log("Test 2: Running evaluation with fixed response");
    console.log("-".repeat(60));
    
    // Create provider with fixed response that will pass expectations
    const fixedProvider = new MockProvider({
      fixedResponse: "Hello Alice! This is a friendly greeting.",
      latency: 50,
    });
    
    const result = await runEvaluation(
      readResult.fixtures,
      workspaceRoot,
      config,
      {
        provider: fixedProvider,
        saveResults: true,
      }
    );

    // Test 3: Display full summary
    console.log("Test 3: Full evaluation summary");
    console.log("-".repeat(60));
    const fullSummary = formatEvaluationSummary(result, {
      showPassed: true,
    });
    console.log(fullSummary);

    // Test 4: Display compact summary
    console.log("Test 4: Compact summary");
    console.log("-".repeat(60));
    const compactSummary = formatCompactSummary(result);
    console.log(compactSummary);
    console.log();

    // Test 5: Show saved results
    console.log("Test 5: Saved results");
    console.log("-".repeat(60));
    const { getLatestResults, loadResults } = require("./dist/lib/evaluation/results");
    const latestPath = getLatestResults(workspaceRoot, config);
    if (latestPath) {
      console.log(`Latest results file: ${path.basename(latestPath)}`);
      const loaded = loadResults(latestPath);
      console.log(`  Pass rate: ${(loaded.passRate * 100).toFixed(1)}%`);
      console.log(`  Duration: ${(loaded.duration / 1000).toFixed(2)}s`);
    }
    console.log();

    // Test 6: Test with multiple expectations
    console.log("Test 6: Testing multiple expectation types");
    console.log("-".repeat(60));
    
    const multiFixture = {
      prompt: "greeting@v1",
      variables: { userName: "Alice" },
      expectations: [
        { type: "contains", value: "Hello" },
        { type: "contains", value: "Alice" },
        { type: "maxWords", value: 20 },
        { type: "regex", value: "^Hello", flags: "i" },
      ],
    };
    
    const tempJsonl = path.join(workspaceRoot, "evals", "test-multi.jsonl");
    fs.writeFileSync(tempJsonl, JSON.stringify(multiFixture) + "\n", "utf-8");
    
    const multiReadResult = readJsonlFile(tempJsonl);
    const multiResult = await runEvaluation(
      multiReadResult.fixtures,
      workspaceRoot,
      config,
      {
        provider: fixedProvider,
        saveResults: false, // Don't save this test run
      }
    );
    
    console.log(formatEvaluationSummary(multiResult));
    
    // Cleanup
    fs.unlinkSync(tempJsonl);
    
    console.log("=".repeat(60));
    console.log("All tests completed!");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

main();
