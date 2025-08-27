import { TradeCreatedEvent, TradeStreamExecutedEvent, TradeCancelledEvent, TradeSettledEvent } from './types';
export declare class TradeStateManager {
    private trades;
    private pairs;
    private readonly dataDir;
    private readonly tradesFile;
    private readonly pairsFile;
    constructor(loadPersistedData?: boolean);
    /**
     * Clear all data (useful for testing)
     */
    clearAllData(): void;
    /**
     * Process TradeCreated event and add to tracking
     */
    processTradeCreated(event: TradeCreatedEvent, pairId: string): void;
    /**
     * Process TradeStreamExecuted event and update trade state
     */
    processTradeStreamExecuted(event: TradeStreamExecutedEvent): void;
    /**
     * Process TradeCancelled event and remove from tracking
     */
    processTradeCancelled(event: TradeCancelledEvent): void;
    /**
     * Process TradeSettled event and remove from tracking
     */
    processTradeSettled(event: TradeSettledEvent): void;
    /**
     * Get all pair IDs that have active trades needing execution
     */
    getPairsNeedingExecution(): string[];
    /**
     * Mark a pair as probed
     */
    markPairProbed(pairId: string): void;
    /**
     * Get statistics about current state
     */
    getStats(): {
        totalTrades: number;
        activeTrades: number;
        totalPairs: number;
        pairsNeedingExecution: number;
    };
    /**
     * Clean up old completed trades (older than 1 hour)
     */
    cleanup(): void;
    private addTradeToPair;
    private removeTradeFromPair;
    /**
     * Persist current state to disk
     */
    private persistData;
    /**
     * Load persisted data from disk
     */
    private loadPersistedData;
    /**
     * Force persist data (called periodically and on shutdown)
     */
    persistDataNow(): void;
}
//# sourceMappingURL=tradeStateManager.d.ts.map