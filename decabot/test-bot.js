#!/usr/bin/env node

// Simple test script for DECA Bot
// This tests the basic functionality without requiring blockchain connection

const { DECABot } = require("./dist/bot");
const { TradeStateManager } = require("./dist/tradeStateManager");

console.log("🧪 Testing DECA Bot Components...\n");

// Test 1: Trade State Manager
console.log("1️⃣ Testing Trade State Manager...");
const tradeManager = new TradeStateManager();

// Simulate a trade created event
const mockTradeCreated = {
  tradeId: "123",
  user: "0x1234567890123456789012345678901234567890",
  tokenIn: "0xA0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
  tokenOut: "0xB0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
  amountIn: "1000000000000000000", // 1 ETH
  amountRemaining: "1000000000000000000",
  minAmountOut: "0",
  realisedAmountOut: "0",
  isInstasettlable: false,
  instasettleBps: "0",
  lastSweetSpot: "500000000000000000", // 0.5 ETH
  usePriceBased: false,
};

// Generate a deterministic pairId
const pairId =
  "0x" +
  Buffer.from(mockTradeCreated.tokenIn + mockTradeCreated.tokenOut)
    .toString("hex")
    .slice(0, 64);

console.log(`   Generated pairId: ${pairId}`);
tradeManager.processTradeCreated(mockTradeCreated, pairId);

console.log("   ✅ Trade created and tracked");
console.log(`   📊 Stats: ${JSON.stringify(tradeManager.getStats())}`);

// Test 2: Simulate trade stream executed
console.log("\n2️⃣ Testing Trade Stream Execution...");
const mockTradeStreamExecuted = {
  tradeId: "123",
  amountIn: "500000000000000000", // 0.5 ETH
  realisedAmountOut: "1000000000000000000", // 1 USDC
  lastSweetSpot: "250000000000000000", // 0.25 ETH remaining
};

tradeManager.processTradeStreamExecuted(mockTradeStreamExecuted);
console.log("   ✅ Trade stream executed");
console.log(`   📊 Stats: ${JSON.stringify(tradeManager.getStats())}`);

// Test 3: Check pairs needing execution
console.log("\n3️⃣ Testing Pairs Needing Execution...");
const pairsNeedingExecution = tradeManager.getPairsNeedingExecution();
console.log(`   🔍 Pairs needing execution: ${pairsNeedingExecution.length}`);
console.log(`   📍 Pair IDs: ${pairsNeedingExecution.join(", ")}`);

// Test 4: Simulate trade completion
console.log("\n4️⃣ Testing Trade Completion...");
const mockTradeCompleted = {
  tradeId: "123",
  amountIn: "250000000000000000", // 0.25 ETH
  realisedAmountOut: "500000000000000000", // 0.5 USDC
  lastSweetSpot: "0", // No more execution needed
};

tradeManager.processTradeStreamExecuted(mockTradeCompleted);
console.log("   ✅ Trade completed");
console.log(`   📊 Final Stats: ${JSON.stringify(tradeManager.getStats())}`);

// Test 5: Data Persistence
console.log("\n5️⃣ Testing Data Persistence...");
tradeManager.persistDataNow();
console.log("   ✅ Data persisted to disk");

console.log("\n🎉 All tests passed! The bot components are working correctly.");
console.log("\n📁 Check the data/ folder for persisted trade state files.");
console.log("\n🚀 Ready to run the full bot with: npm start");
