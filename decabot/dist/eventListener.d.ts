import { TradeStateManager } from './tradeStateManager';
export declare class EventListener {
    private provider;
    private coreContract;
    private tradeStateManager;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    constructor(tradeStateManager: TradeStateManager);
    /**
     * Start listening for events
     */
    start(): Promise<void>;
    /**
     * Stop listening for events
     */
    stop(): Promise<void>;
    /**
     * Check if listener is connected
     */
    getConnected(): boolean;
    private setupEventHandlers;
    private setupConnectionHandlers;
    private attemptReconnect;
    private listenToTradeCreated;
    private listenToTradeStreamExecuted;
    private listenToTradeCancelled;
    private listenToTradeSettled;
    /**
     * Generate a deterministic pairId from token addresses
     */
    private generatePairId;
}
//# sourceMappingURL=eventListener.d.ts.map