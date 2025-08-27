"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventListener = void 0;
const ethers_1 = require("ethers");
const config_1 = require("./config");
const logger_1 = require("./logger");
class EventListener {
    constructor(tradeStateManager) {
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.tradeStateManager = tradeStateManager;
        this.provider = new ethers_1.ethers.WebSocketProvider(config_1.CONFIG.INFURA_WS_URL);
        this.coreContract = new ethers_1.ethers.Contract(config_1.CONFIG.CORE_CONTRACT_ADDRESS, config_1.CORE_ABI, this.provider);
        this.setupEventHandlers();
        this.setupConnectionHandlers();
    }
    /**
     * Start listening for events
     */
    async start() {
        try {
            logger_1.logger.info('Starting event listener...');
            // Listen for all relevant events
            await this.listenToTradeCreated();
            await this.listenToTradeStreamExecuted();
            await this.listenToTradeCancelled();
            await this.listenToTradeSettled();
            this.isConnected = true;
            logger_1.logger.info('Event listener started successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to start event listener', error);
            throw error;
        }
    }
    /**
     * Stop listening for events
     */
    async stop() {
        try {
            this.isConnected = false;
            await this.provider.destroy();
            logger_1.logger.info('Event listener stopped');
        }
        catch (error) {
            logger_1.logger.error('Error stopping event listener', error);
        }
    }
    /**
     * Check if listener is connected
     */
    getConnected() {
        return this.isConnected;
    }
    setupEventHandlers() {
        // TradeCreated event
        this.coreContract.on('TradeCreated', async (tradeId, user, tokenIn, tokenOut, amountIn, amountRemaining, minAmountOut, realisedAmountOut, isInstasettlable, instasettleBps, lastSweetSpot, usePriceBased) => {
            try {
                const event = {
                    tradeId: tradeId.toString(),
                    user,
                    tokenIn,
                    tokenOut,
                    amountIn,
                    amountRemaining,
                    minAmountOut,
                    realisedAmountOut,
                    isInstasettlable,
                    instasettleBps,
                    lastSweetSpot,
                    usePriceBased
                };
                // Generate pairId from token addresses
                const pairId = this.generatePairId(tokenIn, tokenOut);
                this.tradeStateManager.processTradeCreated(event, pairId);
                logger_1.logger.debug('TradeCreated event processed', {
                    tradeId: event.tradeId,
                    pairId,
                    user,
                    lastSweetSpot: lastSweetSpot.toString()
                });
            }
            catch (error) {
                logger_1.logger.error('Error processing TradeCreated event', error);
            }
        });
        // TradeStreamExecuted event
        this.coreContract.on('TradeStreamExecuted', async (tradeId, amountIn, realisedAmountOut, lastSweetSpot) => {
            try {
                const event = {
                    tradeId: tradeId.toString(),
                    amountIn,
                    realisedAmountOut,
                    lastSweetSpot
                };
                this.tradeStateManager.processTradeStreamExecuted(event);
                logger_1.logger.debug('TradeStreamExecuted event processed', {
                    tradeId: event.tradeId,
                    newLastSweetSpot: lastSweetSpot.toString()
                });
            }
            catch (error) {
                logger_1.logger.error('Error processing TradeStreamExecuted event', error);
            }
        });
        // TradeCancelled event
        this.coreContract.on('TradeCancelled', async (tradeId, amountRemaining, realisedAmountOut) => {
            try {
                const event = {
                    tradeId: tradeId.toString(),
                    amountRemaining,
                    realisedAmountOut
                };
                this.tradeStateManager.processTradeCancelled(event);
                logger_1.logger.debug('TradeCancelled event processed', {
                    tradeId: event.tradeId
                });
            }
            catch (error) {
                logger_1.logger.error('Error processing TradeCancelled event', error);
            }
        });
        // TradeSettled event
        this.coreContract.on('TradeSettled', async (tradeId, settler, totalAmountIn, totalAmountOut, totalFees) => {
            try {
                const event = {
                    tradeId: tradeId.toString(),
                    settler,
                    totalAmountIn,
                    totalAmountOut,
                    totalFees
                };
                this.tradeStateManager.processTradeSettled(event);
                logger_1.logger.debug('TradeSettled event processed', {
                    tradeId: event.tradeId,
                    settler,
                    totalFees: totalFees.toString()
                });
            }
            catch (error) {
                logger_1.logger.error('Error processing TradeSettled event', error);
            }
        });
    }
    setupConnectionHandlers() {
        this.provider.on('connect', () => {
            logger_1.logger.info('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
        });
        this.provider.on('disconnect', () => {
            logger_1.logger.warn('WebSocket disconnected');
            this.isConnected = false;
            this.attemptReconnect();
        });
        this.provider.on('error', (error) => {
            logger_1.logger.error('WebSocket error', error);
            this.isConnected = false;
            this.attemptReconnect();
        });
    }
    async attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger_1.logger.error('Max reconnection attempts reached, stopping listener');
            return;
        }
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
        logger_1.logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(async () => {
            try {
                await this.provider.destroy();
                this.provider = new ethers_1.ethers.WebSocketProvider(config_1.CONFIG.INFURA_WS_URL);
                this.coreContract = new ethers_1.ethers.Contract(config_1.CONFIG.CORE_CONTRACT_ADDRESS, config_1.CORE_ABI, this.provider);
                this.setupEventHandlers();
                this.setupConnectionHandlers();
                await this.start();
            }
            catch (error) {
                logger_1.logger.error('Reconnection failed', error);
                this.attemptReconnect();
            }
        }, delay);
    }
    async listenToTradeCreated() {
        // This is handled by the event handler setup
    }
    async listenToTradeStreamExecuted() {
        // This is handled by the event handler setup
    }
    async listenToTradeCancelled() {
        // This is handled by the event handler setup
    }
    async listenToTradeSettled() {
        // This is handled by the event handler setup
    }
    /**
     * Generate a deterministic pairId from token addresses
     */
    generatePairId(tokenIn, tokenOut) {
        // Sort tokens to ensure consistent pairId regardless of input order
        const [token0, token1] = [tokenIn.toLowerCase(), tokenOut.toLowerCase()].sort();
        return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(`${token0}-${token1}`));
    }
}
exports.EventListener = EventListener;
//# sourceMappingURL=eventListener.js.map