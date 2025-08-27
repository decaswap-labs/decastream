export interface TradeState {
    tradeId: string;
    pairId: string;
    lastSweetSpot: bigint;
    amountRemaining: bigint;
    isActive: boolean;
    createdAt: Date;
    lastUpdated: Date;
}
export interface PairState {
    pairId: string;
    activeTrades: Set<string>;
    lastProbed: Date;
    needsExecution: boolean;
}
export interface TradeCreatedEvent {
    tradeId: string;
    user: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    amountRemaining: bigint;
    minAmountOut: bigint;
    realisedAmountOut: bigint;
    isInstasettlable: boolean;
    instasettleBps: bigint;
    lastSweetSpot: bigint;
    usePriceBased: boolean;
}
export interface TradeStreamExecutedEvent {
    tradeId: string;
    amountIn: bigint;
    realisedAmountOut: bigint;
    lastSweetSpot: bigint;
}
export interface TradeCancelledEvent {
    tradeId: string;
    amountRemaining: bigint;
    realisedAmountOut: bigint;
}
export interface TradeSettledEvent {
    tradeId: string;
    settler: string;
    totalAmountIn: bigint;
    totalAmountOut: bigint;
    totalFees: bigint;
}
export interface ExecutionResult {
    success: boolean;
    pairId: string;
    tradesExecuted: number;
    gasUsed?: bigint;
    error?: string;
    timestamp: Date;
}
export interface Logger {
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: any): void;
    debug(message: string, data?: any): void;
}
//# sourceMappingURL=types.d.ts.map