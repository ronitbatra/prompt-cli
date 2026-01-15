#!/usr/bin/env node

/**
 * Manual test script for Phase 5: Evaluation Engine
 * 
 * Usage: node test-evaluation.js
 */

// Import required modules
const { 
  readJsonlFile, 
  runEvaluation, 
  MockProvider,
  formatEvaluationSummary 
} = require("./dist/lib/evaluation");
const { discoverWorkspace, loadConfig } = require("./dist/lib/workspace");

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 5: Evaluation Engine - Manual Test");
  console.log("=".repeat(60));
  console.log();

  try {
    // Discover workspace
    const workspaceRoot = discoverWorkspace();
    const config = loadConfig(workspaceRoot);
    
    console.log(`Workspace root: ${workspaceRoot}`);
    console.log();

    // Read evaluation fixtures
    const evalsDir = `${workspaceRoot}/evals`;
    const jsonlPath = `${evalsDir}/greeting.jsonl`;
    
    console.log(`Reading fixtures from: ${jsonlPath}`);
    const readResult = readJsonlFile(jsonlPath);
    
    if (readResult.errors.length > 0) {
      console.error("Errors reading JSONL:");
      readResult.errors.forEach(err => {
        console.error(`  Line ${err.lineNumber}: ${err.error}`);
      });
      return;
    }
    
    console.log(`Found ${readResult.fixtures.length} fixture(s)`);
    console.log();

    // Create mock provider
    const provider = new MockProvider({ deterministic: true });
    
    // Run evaluation
    console.log("Running evaluation...");
    console.log();
    
    const result = await runEvaluation(
      readResult.fixtures,
      workspaceRoot,
      config,
      {
        provider,
        saveResults: true, // Save results to runs/ directory
      }
    );

    // Display summary
    const summary = formatEvaluationSummary(result, {
      showPassed: true, // Show both passed and failed fixtures
    });
    
    console.log(summary);
    
    // Show where results were saved
    const { getLatestResults } = require("./dist/lib/evaluation/results");
    const latestPath = getLatestResults(workspaceRoot, config);
    if (latestPath) {
      console.log(`Results saved to: ${latestPath}`);
    }
    
  } catch (error) {
    console.error("Error:", error.message);
    console.error(error.stack);
  }
}

main();
