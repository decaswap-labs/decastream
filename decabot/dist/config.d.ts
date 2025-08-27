export declare const CONFIG: {
    readonly INFURA_WS_URL: string;
    readonly CORE_CONTRACT_ADDRESS: string;
    readonly BOT_PRIVATE_KEY: string;
    readonly EXECUTION_INTERVAL_MS: 24000;
    readonly GAS_LIMIT: 500000;
    readonly MAX_PRIORITY_FEE_PER_GAS: "2000000000";
    readonly MAX_FEE_PER_GAS: "50000000000";
    readonly LOG_LEVEL: string;
    readonly MAX_RETRIES: 3;
    readonly RETRY_DELAY_MS: 1000;
};
export declare const CORE_ABI: readonly [{
    readonly inputs: readonly [{
        readonly name: "pairId";
        readonly type: "bytes32";
    }];
    readonly name: "executeTrades";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly name: "tradeId";
        readonly type: "uint256";
    }, {
        readonly indexed: true;
        readonly name: "user";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly name: "tokenIn";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly name: "tokenOut";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly name: "amountIn";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "amountRemaining";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "minAmountOut";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "realisedAmountOut";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "isInstasettlable";
        readonly type: "bool";
    }, {
        readonly indexed: false;
        readonly name: "instasettleBps";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "lastSweetSpot";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "usePriceBased";
        readonly type: "bool";
    }];
    readonly name: "TradeCreated";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly name: "tradeId";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "amountIn";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "realisedAmountOut";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "lastSweetSpot";
        readonly type: "uint256";
    }];
    readonly name: "TradeStreamExecuted";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly name: "tradeId";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "amountRemaining";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "realisedAmountOut";
        readonly type: "uint256";
    }];
    readonly name: "TradeCancelled";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly name: "tradeId";
        readonly type: "uint256";
    }, {
        readonly indexed: true;
        readonly name: "settler";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly name: "totalAmountIn";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "totalAmountOut";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly name: "totalFees";
        readonly type: "uint256";
    }];
    readonly name: "TradeSettled";
    readonly type: "event";
}];
export declare const EVENT_SIGNATURES: {
    readonly TRADE_CREATED: "TradeCreated(uint256,address,address,address,uint256,uint256,uint256,uint256,bool,uint256,uint256,bool)";
    readonly TRADE_STREAM_EXECUTED: "TradeStreamExecuted(uint256,uint256,uint256,uint256)";
    readonly TRADE_CANCELLED: "TradeCancelled(uint256,uint256,uint256)";
    readonly TRADE_SETTLED: "TradeSettled(uint256,address,uint256,uint256,uint256)";
};
//# sourceMappingURL=config.d.ts.map