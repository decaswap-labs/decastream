#!/usr/bin/env node

// Simple persistence test
const { TradeStateManager } = require("./dist/tradeStateManager");

console.log("🧪 Testing Persistence...\n");

// Test 1: Create manager and add trade
console.log("1️⃣ Creating manager and adding trade...");
const manager1 = new TradeStateManager(false);

const tradeEvent = {
  tradeId: "test1",
  user: "0x1234567890123456789012345678901234567890",
  tokenIn: "0xA0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
  tokenOut: "0xB0b86a33E6441b8c4C8C0b4b8C0b4b8C0b4b8C0b",
  amountIn: "1000000000000000000",
  amountRemaining: "1000000000000000000",
  minAmountOut: "0",
  realisedAmountOut: "0",
  isInstasettlable: false,
  instasettleBps: "0",
  lastSweetSpot: 500000000000000000n,
  usePriceBased: false,
};

const pairId =
  "0x" +
  Buffer.from(tradeEvent.tokenIn + tradeEvent.tokenOut)
    .toString("hex")
    .slice(0, 64);
manager1.processTradeCreated(tradeEvent, pairId);

console.log(`   Trade added. Stats: ${JSON.stringify(manager1.getStats())}`);
console.log(
  `   Pairs needing execution: ${manager1.getPairsNeedingExecution().length}`
);

// Test 2: Persist data
console.log("\n2️⃣ Persisting data...");
manager1.persistDataNow();

// Test 3: Create new manager and load data
console.log("\n3️⃣ Creating new manager and loading data...");
const manager2 = new TradeStateManager(true);

console.log(`   Stats after load: ${JSON.stringify(manager2.getStats())}`);
console.log(
  `   Pairs needing execution after load: ${
    manager2.getPairsNeedingExecution().length
  }`
);

// Test 4: Verify the trade is still active
const trade = manager2.trades.get("test1");
if (trade) {
  console.log(
    `   Trade found: ${trade.tradeId}, isActive: ${trade.isActive}, lastSweetSpot: ${trade.lastSweetSpot}`
  );
} else {
  console.log("   ❌ Trade not found after reload");
}

console.log("\n✅ Persistence test complete!");
