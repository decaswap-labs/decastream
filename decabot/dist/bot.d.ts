export declare class DECABot {
    private eventListener;
    private tradeProber;
    private tradeStateManager;
    private isRunning;
    private statsInterval;
    private cleanupInterval;
    private persistenceInterval;
    constructor();
    /**
     * Start the bot
     */
    start(): Promise<void>;
    /**
     * Stop the bot
     */
    stop(): Promise<void>;
    /**
     * Check if bot is running
     */
    getRunning(): boolean;
    /**
     * Get current bot status
     */
    getStatus(): {
        isRunning: boolean;
        eventListenerConnected: boolean;
        tradeProberRunning: boolean;
        stats: any;
    };
    /**
     * Manually probe a specific pair
     */
    probePair(pairId: string): Promise<any>;
    /**
     * Get current statistics
     */
    getStats(): any;
    private validateConfig;
    private startStatsLogging;
    private startCleanupProcess;
    private logStats;
    private getUptime;
    /**
     * Graceful shutdown handler
     */
    setupGracefulShutdown(): void;
}
//# sourceMappingURL=bot.d.ts.map