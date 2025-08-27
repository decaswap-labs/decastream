"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_SIGNATURES = exports.CORE_ABI = exports.CONFIG = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.CONFIG = {
    // Infura WebSocket URL (from your pro account)
    INFURA_WS_URL: process.env.INFURA_WS_URL || 'wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID',
    // Core contract address (will be set after deployment)
    CORE_CONTRACT_ADDRESS: process.env.CORE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
    // Bot wallet private key (for executing transactions)
    BOT_PRIVATE_KEY: process.env.BOT_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
    // Execution interval (24 seconds, approximately 2 blocks)
    EXECUTION_INTERVAL_MS: 24000,
    // Gas settings
    GAS_LIMIT: 500000,
    MAX_PRIORITY_FEE_PER_GAS: '2000000000', // 2 gwei
    MAX_FEE_PER_GAS: '50000000000', // 50 gwei
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    // Retry settings
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
};
// Core contract ABI (imported from compiled contracts)
exports.CORE_ABI = [
    {
        "inputs": [{ "name": "pairId", "type": "bytes32" }],
        "name": "executeTrades",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "tradeId", "type": "uint256" },
            { "indexed": true, "name": "user", "type": "address" },
            { "indexed": false, "name": "tokenIn", "type": "address" },
            { "indexed": false, "name": "tokenOut", "type": "address" },
            { "indexed": false, "name": "amountIn", "type": "uint256" },
            { "indexed": false, "name": "amountRemaining", "type": "uint256" },
            { "indexed": false, "name": "minAmountOut", "type": "uint256" },
            { "indexed": false, "name": "realisedAmountOut", "type": "uint256" },
            { "indexed": false, "name": "isInstasettlable", "type": "bool" },
            { "indexed": false, "name": "instasettleBps", "type": "uint256" },
            { "indexed": false, "name": "lastSweetSpot", "type": "uint256" },
            { "indexed": false, "name": "usePriceBased", "type": "bool" }
        ],
        "name": "TradeCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "tradeId", "type": "uint256" },
            { "indexed": false, "name": "amountIn", "type": "uint256" },
            { "indexed": false, "name": "realisedAmountOut", "type": "uint256" },
            { "indexed": false, "name": "lastSweetSpot", "type": "uint256" }
        ],
        "name": "TradeStreamExecuted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "tradeId", "type": "uint256" },
            { "indexed": false, "name": "amountRemaining", "type": "uint256" },
            { "indexed": false, "name": "realisedAmountOut", "type": "uint256" }
        ],
        "name": "TradeCancelled",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "tradeId", "type": "uint256" },
            { "indexed": true, "name": "settler", "type": "address" },
            { "indexed": false, "name": "totalAmountIn", "type": "uint256" },
            { "indexed": false, "name": "totalAmountOut", "type": "uint256" },
            { "indexed": false, "name": "totalFees", "type": "uint256" }
        ],
        "name": "TradeSettled",
        "type": "event"
    }
];
// Event signatures for filtering
exports.EVENT_SIGNATURES = {
    TRADE_CREATED: 'TradeCreated(uint256,address,address,address,uint256,uint256,uint256,uint256,bool,uint256,uint256,bool)',
    TRADE_STREAM_EXECUTED: 'TradeStreamExecuted(uint256,uint256,uint256,uint256)',
    TRADE_CANCELLED: 'TradeCancelled(uint256,uint256,uint256)',
    TRADE_SETTLED: 'TradeSettled(uint256,address,uint256,uint256,uint256)'
};
//# sourceMappingURL=config.js.map