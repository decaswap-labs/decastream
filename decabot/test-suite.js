#!/usr/bin/env node

// Comprehensive Test Suite for DECA Bot
// Tests all major components and edge cases

const { TradeStateManager } = require("./dist/tradeStateManager");
const fs = require("fs");
const path = require("path");

console.log("🧪 DECA Bot Comprehensive Test Suite\n");

let testsPassed = 0;
let testsTotal = 0;

function runTest(testName, testFn) {
  testsTotal++;
  try {
    testFn();
    console.log(`✅ ${testName}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${testName}: ${error.message}`);
  }
}

// Test 1: Basic Trade Creation and Tracking
runTest("Trade Creation and Tracking", () => {
  const manager = new TradeStateManager(false); // Don't load persisted data

  const tradeEvent = {
    tradeId: "1",
    user: "0x1234567890123456789012345678901234567890",
    tokenIn: "0xA0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
    tokenOut: "0xB0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
    amountIn: "1000000000000000000",
    amountRemaining: "1000000000000000000",
    minAmountOut: 0n,
    realisedAmountOut: 0n,
    isInstasettlable: false,
    instasettleBps: 0n,
    lastSweetSpot: 500000000000000000n,
    usePriceBased: false,
  };

  const pairId =
    "0x" +
    Buffer.from(tradeEvent.tokenIn + tradeEvent.tokenOut)
      .toString("hex")
      .slice(0, 64);
  manager.processTradeCreated(tradeEvent, pairId);

  const stats = manager.getStats();
  if (stats.totalTrades !== 1 || stats.activeTrades !== 1) {
    throw new Error(
      `Expected 1 trade, got ${stats.totalTrades} total, ${stats.activeTrades} active`
    );
  }

  const pairsNeedingExecution = manager.getPairsNeedingExecution();
  if (pairsNeedingExecution.length !== 1) {
    throw new Error(
      `Expected 1 pair needing execution, got ${pairsNeedingExecution.length}`
    );
  }
});

// Test 2: Trade Stream Execution
runTest("Trade Stream Execution", () => {
  const manager = new TradeStateManager(false); // Don't load persisted data

  // Create trade first
  const tradeEvent = {
    tradeId: "2",
    user: "0x1234567890123456789012345678901234567890",
    tokenIn: "0xA0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
    tokenOut: "0xB0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
    amountIn: "1000000000000000000",
    amountRemaining: "1000000000000000000",
    minAmountOut: 0n,
    realisedAmountOut: 0n,
    isInstasettlable: false,
    instasettleBps: 0n,
    lastSweetSpot: 500000000000000000n,
    usePriceBased: false,
  };

  const pairId =
    "0x" +
    Buffer.from(tradeEvent.tokenIn + tradeEvent.tokenOut)
      .toString("hex")
      .slice(0, 64);
  manager.processTradeCreated(tradeEvent, pairId);

  // Execute stream
  const streamEvent = {
    tradeId: "2",
    amountIn: 500000000000000000n,
    realisedAmountOut: "1000000000000000000",
    lastSweetSpot: 250000000000000000n,
  };

  manager.processTradeStreamExecuted(streamEvent);

  const stats = manager.getStats();
  if (stats.pairsNeedingExecution !== 1) {
    throw new Error(
      `Expected 1 pair needing execution after stream, got ${stats.pairsNeedingExecution}`
    );
  }
});

// Test 3: Trade Completion
runTest("Trade Completion", () => {
  const manager = new TradeStateManager(false); // Don't load persisted data

  // Create trade first
  const tradeEvent = {
    tradeId: "3",
    user: "0x1234567890123456789012345678901234567890",
    tokenIn: "0xA0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
    tokenOut: "0xB0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
    amountIn: "1000000000000000000",
    amountRemaining: "1000000000000000000",
    minAmountOut: 0n,
    realisedAmountOut: 0n,
    isInstasettlable: false,
    instasettleBps: 0n,
    lastSweetSpot: 500000000000000000n,
    usePriceBased: false,
  };

  const pairId =
    "0x" +
    Buffer.from(tradeEvent.tokenIn + tradeEvent.tokenOut)
      .toString("hex")
      .slice(0, 64);
  manager.processTradeCreated(tradeEvent, pairId);

  // Complete trade
  const completeEvent = {
    tradeId: "3",
    amountIn: 500000000000000000n,
    realisedAmountOut: "1000000000000000000",
    lastSweetSpot: 0n,
  };

  manager.processTradeStreamExecuted(completeEvent);

  const stats = manager.getStats();
  if (stats.pairsNeedingExecution !== 0) {
    throw new Error(
      `Expected 0 pairs needing execution after completion, got ${stats.pairsNeedingExecution}`
    );
  }

  if (stats.activeTrades !== 0) {
    throw new Error(
      `Expected 0 active trades after completion, got ${stats.activeTrades}`
    );
  }
});

// Test 4: Multiple Trades in Same Pair
runTest("Multiple Trades in Same Pair", () => {
  const manager = new TradeStateManager(false); // Don't load persisted data

  const tokenIn = "0xA0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b";
  const tokenOut = "0xB0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b";
  const pairId =
    "0x" +
    Buffer.from(tokenIn + tokenOut)
      .toString("hex")
      .slice(0, 64);

  // Create 3 trades
  for (let i = 1; i <= 3; i++) {
    const tradeEvent = {
      tradeId: i.toString(),
      user: "0x1234567890123456789012345678901234567890",
      tokenIn,
      tokenOut,
      amountIn: "1000000000000000000",
      amountRemaining: "1000000000000000000",
      minAmountOut: 0n,
      realisedAmountOut: 0n,
      isInstasettlable: false,
      instasettleBps: 0n,
      lastSweetSpot: 500000000000000000n,
      usePriceBased: false,
    };

    manager.processTradeCreated(tradeEvent, pairId);
  }

  const stats = manager.getStats();
  if (stats.totalTrades !== 3 || stats.totalPairs !== 1) {
    throw new Error(
      `Expected 3 trades in 1 pair, got ${stats.totalTrades} trades in ${stats.totalPairs} pairs`
    );
  }

  const pairsNeedingExecution = manager.getPairsNeedingExecution();
  if (pairsNeedingExecution.length !== 1) {
    throw new Error(
      `Expected 1 pair needing execution, got ${pairsNeedingExecution.length}`
    );
  }
});

// Test 5: Data Persistence and Recovery
runTest("Data Persistence and Recovery", () => {
  const manager1 = new TradeStateManager(false); // Don't load persisted data

  // Create a trade
  const tradeEvent = {
    tradeId: "4",
    user: "0x1234567890123456789012345678901234567890",
    tokenIn: "0xA0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
    tokenOut: "0xB0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
    amountIn: "1000000000000000000",
    amountRemaining: "1000000000000000000",
    minAmountOut: 0n,
    realisedAmountOut: 0n,
    isInstasettlable: false,
    instasettleBps: 0n,
    lastSweetSpot: 500000000000000000n,
    usePriceBased: false,
  };

  const pairId =
    "0x" +
    Buffer.from(tradeEvent.tokenIn + tradeEvent.tokenOut)
      .toString("hex")
      .slice(0, 64);
  manager1.processTradeCreated(tradeEvent, pairId);

  // Persist data
  manager1.persistDataNow();

  // Create new manager (simulates restart)
  const manager2 = new TradeStateManager();

  const stats = manager2.getStats();
  if (stats.totalTrades !== 1 || stats.activeTrades !== 1) {
    throw new Error(
      `Expected 1 trade after restart, got ${stats.totalTrades} total, ${stats.activeTrades} active`
    );
  }

  const pairsNeedingExecution = manager2.getPairsNeedingExecution();
  if (pairsNeedingExecution.length !== 1) {
    throw new Error(
      `Expected 1 pair needing execution after restart, got ${pairsNeedingExecution.length}`
    );
  }
});

// Test 6: Edge Cases
runTest("Edge Cases", () => {
  const manager = new TradeStateManager(false); // Don't load persisted data

  // Test processing events for non-existent trades
  const nonExistentEvent = {
    tradeId: "999",
    amountIn: "1000000000000000000",
    realisedAmountOut: "1000000000000000000",
    lastSweetSpot: 0n,
  };

  // This should not throw an error
  manager.processTradeStreamExecuted(nonExistentEvent);

  // Test with empty state
  const stats = manager.getStats();
  if (stats.totalTrades !== 0) {
    throw new Error(
      `Expected 0 trades in empty state, got ${stats.totalTrades}`
    );
  }

  const pairsNeedingExecution = manager.getPairsNeedingExecution();
  if (pairsNeedingExecution.length !== 0) {
    throw new Error(
      `Expected 0 pairs needing execution in empty state, got ${pairsNeedingExecution.length}`
    );
  }
});

// Test 7: Cleanup Functionality
runTest("Cleanup Functionality", () => {
  const manager = new TradeStateManager(false); // Don't load persisted data

  // Create a completed trade
  const tradeEvent = {
    tradeId: "5",
    user: "0x1234567890123456789012345678901234567890",
    tokenIn: "0xA0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
    tokenOut: "0xB0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
    amountIn: "1000000000000000000",
    amountRemaining: "1000000000000000000",
    minAmountOut: 0n,
    realisedAmountOut: 0n,
    isInstasettlable: false,
    instasettleBps: 0n,
    lastSweetSpot: 500000000000000000n,
    usePriceBased: false,
  };

  const pairId =
    "0x" +
    Buffer.from(tradeEvent.tokenIn + tradeEvent.tokenOut)
      .toString("hex")
      .slice(0, 64);
  manager.processTradeCreated(tradeEvent, pairId);

  // Complete the trade
  const completeEvent = {
    tradeId: "5",
    amountIn: 500000000000000000n,
    realisedAmountOut: "1000000000000000000",
    lastSweetSpot: 0n,
  };

  manager.processTradeStreamExecuted(completeEvent);

  // Run cleanup
  manager.cleanup();

  const stats = manager.getStats();
  if (stats.totalPairs !== 0) {
    throw new Error(`Expected 0 pairs after cleanup, got ${stats.totalPairs}`);
  }
});

console.log(`\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed`);

if (testsPassed === testsTotal) {
  console.log("\n🎉 All tests passed! The DECA Bot is working correctly.");
  console.log("\n🚀 Ready for production deployment!");
} else {
  console.log("\n❌ Some tests failed. Please review the implementation.");
  process.exit(1);
}

// Clean up test data
try {
  if (fs.existsSync("data")) {
    fs.rmSync("data", { recursive: true, force: true });
    console.log("\n🧹 Test data cleaned up.");
  }
} catch (error) {
  console.log("\n⚠️  Could not clean up test data:", error.message);
}
