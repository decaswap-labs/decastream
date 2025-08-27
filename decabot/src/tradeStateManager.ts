import {
  TradeState,
  PairState,
  TradeCreatedEvent,
  TradeStreamExecutedEvent,
  TradeCancelledEvent,
  TradeSettledEvent,
} from "./types";
import { logger } from "./logger";
import * as fs from "fs";
import * as path from "path";

export class TradeStateManager {
  private trades: Map<string, TradeState> = new Map();
  private pairs: Map<string, PairState> = new Map();
  private readonly dataDir: string;
  private readonly tradesFile: string;
  private readonly pairsFile: string;

  constructor(loadPersistedData: boolean = true) {
    this.dataDir = path.join(process.cwd(), "data");
    this.tradesFile = path.join(this.dataDir, "trades.json");
    this.pairsFile = path.join(this.dataDir, "pairs.json");

    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Load existing data only if requested
    if (loadPersistedData) {
      this.loadPersistedData();
    }
  }

  /**
   * Clear all data (useful for testing)
   */
  clearAllData(): void {
    this.trades.clear();
    this.pairs.clear();

    // Remove data files
    try {
      if (fs.existsSync(this.tradesFile)) {
        fs.unlinkSync(this.tradesFile);
      }
      if (fs.existsSync(this.pairsFile)) {
        fs.unlinkSync(this.pairsFile);
      }
    } catch (error) {
      logger.error("Failed to remove data files during clear", error);
    }

    this.persistData();
  }

  /**
   * Process TradeCreated event and add to tracking
   */
  processTradeCreated(event: TradeCreatedEvent, pairId: string): void {
    const tradeState: TradeState = {
      tradeId: event.tradeId,
      pairId,
      lastSweetSpot: event.lastSweetSpot,
      amountRemaining: event.amountRemaining,
      isActive: true,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    this.trades.set(event.tradeId, tradeState);
    this.addTradeToPair(pairId, event.tradeId);

    // Persist data after state change (after trade is fully added to pair)
    this.persistData();

    logger.info("Trade created and added to tracking", {
      tradeId: event.tradeId,
      pairId,
      lastSweetSpot: event.lastSweetSpot.toString(),
      amountRemaining: event.amountRemaining.toString(),
    });
  }

  /**
   * Process TradeStreamExecuted event and update trade state
   */
  processTradeStreamExecuted(event: TradeStreamExecutedEvent): void {
    const trade = this.trades.get(event.tradeId);
    if (!trade) {
      logger.warn("Received TradeStreamExecuted for unknown trade", {
        tradeId: event.tradeId,
      });
      return;
    }

    trade.lastSweetSpot = event.lastSweetSpot;
    trade.lastUpdated = new Date();

    // Check if trade is completed (lastSweetSpot == 0 means no more execution needed)
    if (event.lastSweetSpot === 0n) {
      trade.isActive = false;
      this.removeTradeFromPair(trade.pairId, event.tradeId);
      logger.info("Trade completed and removed from tracking", {
        tradeId: event.tradeId,
      });
    } else {
      // Persist data after state change
      this.persistData();

      logger.debug("Trade stream executed, updated state", {
        tradeId: event.tradeId,
        newLastSweetSpot: event.lastSweetSpot.toString(),
      });
    }
  }

  /**
   * Process TradeCancelled event and remove from tracking
   */
  processTradeCancelled(event: TradeCancelledEvent): void {
    const trade = this.trades.get(event.tradeId);
    if (!trade) {
      logger.warn("Received TradeCancelled for unknown trade", {
        tradeId: event.tradeId,
      });
      return;
    }

    trade.isActive = false;
    trade.lastUpdated = new Date();
    this.removeTradeFromPair(trade.pairId, event.tradeId);

    logger.info("Trade cancelled and removed from tracking", {
      tradeId: event.tradeId,
    });
  }

  /**
   * Process TradeSettled event and remove from tracking
   */
  processTradeSettled(event: TradeSettledEvent): void {
    const trade = this.trades.get(event.tradeId);
    if (!trade) {
      logger.warn("Received TradeSettled for unknown trade", {
        tradeId: event.tradeId,
      });
      return;
    }

    trade.isActive = false;
    trade.lastUpdated = new Date();
    this.removeTradeFromPair(trade.pairId, event.tradeId);

    logger.info("Trade settled and removed from tracking", {
      tradeId: event.tradeId,
    });
  }

  /**
   * Get all pair IDs that have active trades needing execution
   */
  getPairsNeedingExecution(): string[] {
    const pairsNeedingExecution: string[] = [];

    for (const [pairId, pairState] of this.pairs) {
      if (pairState.activeTrades.size > 0) {
        // Check if any trades in this pair have lastSweetSpot > 0
        let needsExecution = false;
        for (const tradeId of pairState.activeTrades) {
          const trade = this.trades.get(tradeId);
          if (trade && trade.isActive && trade.lastSweetSpot > 0n) {
            needsExecution = true;
            break;
          }
        }

        if (needsExecution) {
          pairsNeedingExecution.push(pairId);
        }
      }
    }

    return pairsNeedingExecution;
  }

  /**
   * Mark a pair as probed
   */
  markPairProbed(pairId: string): void {
    const pair = this.pairs.get(pairId);
    if (pair) {
      pair.lastProbed = new Date();
      pair.needsExecution = false;
    }
  }

  /**
   * Get statistics about current state
   */
  getStats(): {
    totalTrades: number;
    activeTrades: number;
    totalPairs: number;
    pairsNeedingExecution: number;
  } {
    const totalTrades = this.trades.size;
    const activeTrades = Array.from(this.trades.values()).filter(
      (t) => t.isActive
    ).length;
    const totalPairs = this.pairs.size;
    const pairsNeedingExecution = this.getPairsNeedingExecution().length;

    return {
      totalTrades,
      activeTrades,
      totalPairs,
      pairsNeedingExecution,
    };
  }

  /**
   * Clean up old completed trades (older than 1 hour)
   */
  cleanup(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const tradesToRemove: string[] = [];

    for (const [tradeId, trade] of this.trades) {
      if (!trade.isActive && trade.lastUpdated < oneHourAgo) {
        tradesToRemove.push(tradeId);
      }
    }

    for (const tradeId of tradesToRemove) {
      this.trades.delete(tradeId);
    }

    if (tradesToRemove.length > 0) {
      logger.debug(`Cleaned up ${tradesToRemove.length} old completed trades`);
    }

    // Persist data after cleanup
    this.persistData();
  }

  private addTradeToPair(pairId: string, tradeId: string): void {
    if (!this.pairs.has(pairId)) {
      this.pairs.set(pairId, {
        pairId,
        activeTrades: new Set(),
        lastProbed: new Date(0),
        needsExecution: false,
      });
    }

    const pair = this.pairs.get(pairId)!;
    pair.activeTrades.add(tradeId);

    // Debug logging
    logger.debug("Added trade to pair", {
      pairId,
      tradeId,
      activeTradesSize: pair.activeTrades.size,
      activeTrades: Array.from(pair.activeTrades),
    });
  }

  private removeTradeFromPair(pairId: string, tradeId: string): void {
    const pair = this.pairs.get(pairId);
    if (pair) {
      pair.activeTrades.delete(tradeId);

      // Remove pair if no more active trades
      if (pair.activeTrades.size === 0) {
        this.pairs.delete(pairId);
        logger.debug(`Removed empty pair from tracking`, { pairId });
      }
    }

    // Persist data after state change
    this.persistData();
  }

  /**
   * Persist current state to disk
   */
  private persistData(): void {
    try {
      // Convert Maps to serializable objects with BigInt conversion
      const tradesData = Object.fromEntries(
        Array.from(this.trades.entries()).map(([tradeId, trade]) => [
          tradeId,
          {
            ...trade,
            lastSweetSpot: trade.lastSweetSpot.toString(),
            amountRemaining: trade.amountRemaining.toString(),
          },
        ])
      );

      // Convert pairs with proper Set serialization
      const pairsData = Object.fromEntries(
        Array.from(this.pairs.entries()).map(([pairId, pair]) => [
          pairId,
          {
            ...pair,
            activeTrades: Array.from(pair.activeTrades),
          },
        ])
      );

      // Debug logging
      logger.debug("Persisting data", {
        tradesCount: this.trades.size,
        pairsCount: this.pairs.size,
        pairsData: pairsData,
      });

      // Write to files
      fs.writeFileSync(this.tradesFile, JSON.stringify(tradesData, null, 2));
      fs.writeFileSync(this.pairsFile, JSON.stringify(pairsData, null, 2));

      logger.debug("Trade state persisted to disk");
    } catch (error) {
      const errorObj = error as Error;
      logger.error("Failed to persist trade state", {
        error: errorObj.message,
        stack: errorObj.stack,
      });
    }
  }

  /**
   * Load persisted data from disk
   */
  private loadPersistedData(): void {
    try {
      // Load trades
      if (fs.existsSync(this.tradesFile)) {
        const tradesData = JSON.parse(fs.readFileSync(this.tradesFile, "utf8"));
        for (const [tradeId, tradeData] of Object.entries(tradesData)) {
          const trade = tradeData as any;
          // Convert date strings back to Date objects
          trade.createdAt = new Date(trade.createdAt);
          trade.lastUpdated = new Date(trade.lastUpdated);
          // Convert string numbers back to BigInt
          trade.lastSweetSpot = BigInt(trade.lastSweetSpot);
          trade.amountRemaining = BigInt(trade.amountRemaining);
          this.trades.set(tradeId, trade as TradeState);
        }
        logger.info(`Loaded ${this.trades.size} trades from persistence`);
      }

      // Load pairs
      if (fs.existsSync(this.pairsFile)) {
        const pairsData = JSON.parse(fs.readFileSync(this.pairsFile, "utf8"));
        for (const [pairId, pairData] of Object.entries(pairsData)) {
          const pair = pairData as any;
          // Convert date strings back to Date objects
          pair.lastProbed = new Date(pair.lastProbed);
          // Convert Set back to Set
          pair.activeTrades = new Set(pair.activeTrades);
          this.pairs.set(pairId, pair as PairState);
        }
        logger.info(`Loaded ${this.pairs.size} pairs from persistence`);
      }
    } catch (error) {
      logger.error("Failed to load persisted data", error);
    }
  }

  /**
   * Force persist data (called periodically and on shutdown)
   */
  persistDataNow(): void {
    this.persistData();
  }
}
