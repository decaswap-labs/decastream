import { TradeStateManager } from './tradeStateManager';
import { ExecutionResult } from './types';
export declare class TradeProber {
    private provider;
    private coreContract;
    private wallet;
    private tradeStateManager;
    private isRunning;
    private executionInterval;
    constructor(tradeStateManager: TradeStateManager);
    /**
     * Start the probing process
     */
    start(): Promise<void>;
    /**
     * Stop the probing process
     */
    stop(): Promise<void>;
    /**
     * Check if prober is running
     */
    getRunning(): boolean;
    /**
     * Manually probe a specific pair
     */
    probePair(pairId: string): Promise<ExecutionResult>;
    private startExecutionLoop;
    private executePendingTrades;
    private executeTrades;
    private delay;
    /**
     * Get current gas price
     */
    getGasPrice(): Promise<bigint>;
    /**
     * Get wallet address
     */
    getWalletAddress(): string;
}
//# sourceMappingURL=tradeProber.d.ts.map