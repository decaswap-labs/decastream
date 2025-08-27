"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeStateManager = void 0;
const logger_1 = require("./logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TradeStateManager {
    constructor(loadPersistedData = true) {
        this.trades = new Map();
        this.pairs = new Map();
        this.dataDir = path.join(process.cwd(), 'data');
        this.tradesFile = path.join(this.dataDir, 'trades.json');
        this.pairsFile = path.join(this.dataDir, 'pairs.json');
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
    clearAllData() {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to remove data files during clear', error);
        }
        this.persistData();
    }
    /**
     * Process TradeCreated event and add to tracking
     */
    processTradeCreated(event, pairId) {
        const tradeState = {
            tradeId: event.tradeId,
            pairId,
            lastSweetSpot: event.lastSweetSpot,
            amountRemaining: event.amountRemaining,
            isActive: true,
            createdAt: new Date(),
            lastUpdated: new Date()
        };
        this.trades.set(event.tradeId, tradeState);
        this.addTradeToPair(pairId, event.tradeId);
        // Persist data after state change (after trade is fully added to pair)
        this.persistData();
        logger_1.logger.info('Trade created and added to tracking', {
            tradeId: event.tradeId,
            pairId,
            lastSweetSpot: event.lastSweetSpot.toString(),
            amountRemaining: event.amountRemaining.toString()
        });
    }
    /**
     * Process TradeStreamExecuted event and update trade state
     */
    processTradeStreamExecuted(event) {
        const trade = this.trades.get(event.tradeId);
        if (!trade) {
            logger_1.logger.warn('Received TradeStreamExecuted for unknown trade', { tradeId: event.tradeId });
            return;
        }
        trade.lastSweetSpot = event.lastSweetSpot;
        trade.lastUpdated = new Date();
        // Check if trade is completed (lastSweetSpot == 0 means no more execution needed)
        if (event.lastSweetSpot === 0n) {
            trade.isActive = false;
            this.removeTradeFromPair(trade.pairId, event.tradeId);
            logger_1.logger.info('Trade completed and removed from tracking', { tradeId: event.tradeId });
        }
        else {
            // Persist data after state change
            this.persistData();
            logger_1.logger.debug('Trade stream executed, updated state', {
                tradeId: event.tradeId,
                newLastSweetSpot: event.lastSweetSpot.toString()
            });
        }
    }
    /**
     * Process TradeCancelled event and remove from tracking
     */
    processTradeCancelled(event) {
        const trade = this.trades.get(event.tradeId);
        if (!trade) {
            logger_1.logger.warn('Received TradeCancelled for unknown trade', { tradeId: event.tradeId });
            return;
        }
        trade.isActive = false;
        trade.lastUpdated = new Date();
        this.removeTradeFromPair(trade.pairId, event.tradeId);
        logger_1.logger.info('Trade cancelled and removed from tracking', { tradeId: event.tradeId });
    }
    /**
     * Process TradeSettled event and remove from tracking
     */
    processTradeSettled(event) {
        const trade = this.trades.get(event.tradeId);
        if (!trade) {
            logger_1.logger.warn('Received TradeSettled for unknown trade', { tradeId: event.tradeId });
            return;
        }
        trade.isActive = false;
        trade.lastUpdated = new Date();
        this.removeTradeFromPair(trade.pairId, event.tradeId);
        logger_1.logger.info('Trade settled and removed from tracking', { tradeId: event.tradeId });
    }
    /**
     * Get all pair IDs that have active trades needing execution
     */
    getPairsNeedingExecution() {
        const pairsNeedingExecution = [];
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
    markPairProbed(pairId) {
        const pair = this.pairs.get(pairId);
        if (pair) {
            pair.lastProbed = new Date();
            pair.needsExecution = false;
        }
    }
    /**
     * Get statistics about current state
     */
    getStats() {
        const totalTrades = this.trades.size;
        const activeTrades = Array.from(this.trades.values()).filter(t => t.isActive).length;
        const totalPairs = this.pairs.size;
        const pairsNeedingExecution = this.getPairsNeedingExecution().length;
        return {
            totalTrades,
            activeTrades,
            totalPairs,
            pairsNeedingExecution
        };
    }
    /**
     * Clean up old completed trades (older than 1 hour)
     */
    cleanup() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const tradesToRemove = [];
        for (const [tradeId, trade] of this.trades) {
            if (!trade.isActive && trade.lastUpdated < oneHourAgo) {
                tradesToRemove.push(tradeId);
            }
        }
        for (const tradeId of tradesToRemove) {
            this.trades.delete(tradeId);
        }
        if (tradesToRemove.length > 0) {
            logger_1.logger.debug(`Cleaned up ${tradesToRemove.length} old completed trades`);
        }
        // Persist data after cleanup
        this.persistData();
    }
    addTradeToPair(pairId, tradeId) {
        if (!this.pairs.has(pairId)) {
            this.pairs.set(pairId, {
                pairId,
                activeTrades: new Set(),
                lastProbed: new Date(0),
                needsExecution: false
            });
        }
        const pair = this.pairs.get(pairId);
        pair.activeTrades.add(tradeId);
        // Debug logging
        logger_1.logger.debug('Added trade to pair', {
            pairId,
            tradeId,
            activeTradesSize: pair.activeTrades.size,
            activeTrades: Array.from(pair.activeTrades)
        });
    }
    removeTradeFromPair(pairId, tradeId) {
        const pair = this.pairs.get(pairId);
        if (pair) {
            pair.activeTrades.delete(tradeId);
            // Remove pair if no more active trades
            if (pair.activeTrades.size === 0) {
                this.pairs.delete(pairId);
                logger_1.logger.debug(`Removed empty pair from tracking`, { pairId });
            }
        }
        // Persist data after state change
        this.persistData();
    }
    /**
     * Persist current state to disk
     */
    persistData() {
        try {
            // Convert Maps to serializable objects with BigInt conversion
            const tradesData = Object.fromEntries(Array.from(this.trades.entries()).map(([tradeId, trade]) => [
                tradeId,
                {
                    ...trade,
                    lastSweetSpot: trade.lastSweetSpot.toString(),
                    amountRemaining: trade.amountRemaining.toString()
                }
            ]));
            // Convert pairs with proper Set serialization
            const pairsData = Object.fromEntries(Array.from(this.pairs.entries()).map(([pairId, pair]) => [
                pairId,
                {
                    ...pair,
                    activeTrades: Array.from(pair.activeTrades)
                }
            ]));
            // Debug logging
            logger_1.logger.debug('Persisting data', {
                tradesCount: this.trades.size,
                pairsCount: this.pairs.size,
                pairsData: pairsData
            });
            // Write to files
            fs.writeFileSync(this.tradesFile, JSON.stringify(tradesData, null, 2));
            fs.writeFileSync(this.pairsFile, JSON.stringify(pairsData, null, 2));
            logger_1.logger.debug('Trade state persisted to disk');
        }
        catch (error) {
            const errorObj = error;
            logger_1.logger.error('Failed to persist trade state', { error: errorObj.message, stack: errorObj.stack });
        }
    }
    /**
     * Load persisted data from disk
     */
    loadPersistedData() {
        try {
            // Load trades
            if (fs.existsSync(this.tradesFile)) {
                const tradesData = JSON.parse(fs.readFileSync(this.tradesFile, 'utf8'));
                for (const [tradeId, tradeData] of Object.entries(tradesData)) {
                    const trade = tradeData;
                    // Convert date strings back to Date objects
                    trade.createdAt = new Date(trade.createdAt);
                    trade.lastUpdated = new Date(trade.lastUpdated);
                    // Convert string numbers back to BigInt
                    trade.lastSweetSpot = BigInt(trade.lastSweetSpot);
                    trade.amountRemaining = BigInt(trade.amountRemaining);
                    this.trades.set(tradeId, trade);
                }
                logger_1.logger.info(`Loaded ${this.trades.size} trades from persistence`);
            }
            // Load pairs
            if (fs.existsSync(this.pairsFile)) {
                const pairsData = JSON.parse(fs.readFileSync(this.pairsFile, 'utf8'));
                for (const [pairId, pairData] of Object.entries(pairsData)) {
                    const pair = pairData;
                    // Convert date strings back to Date objects
                    pair.lastProbed = new Date(pair.lastProbed);
                    // Convert Set back to Set
                    pair.activeTrades = new Set(pair.activeTrades);
                    this.pairs.set(pairId, pair);
                }
                logger_1.logger.info(`Loaded ${this.pairs.size} pairs from persistence`);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to load persisted data', error);
        }
    }
    /**
     * Force persist data (called periodically and on shutdown)
     */
    persistDataNow() {
        this.persistData();
    }
}
exports.TradeStateManager = TradeStateManager;
//# sourceMappingURL=tradeStateManager.js.map