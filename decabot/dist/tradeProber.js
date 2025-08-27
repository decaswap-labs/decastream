"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeProber = void 0;
const ethers_1 = require("ethers");
const config_1 = require("./config");
const logger_1 = require("./logger");
class TradeProber {
    constructor(tradeStateManager) {
        this.isRunning = false;
        this.executionInterval = null;
        this.tradeStateManager = tradeStateManager;
        // Use HTTP provider for transactions (more reliable than WebSocket for tx)
        const httpUrl = config_1.CONFIG.INFURA_WS_URL.replace('wss://', 'https://').replace('/ws/', '/');
        this.provider = new ethers_1.ethers.JsonRpcProvider(httpUrl);
        this.wallet = new ethers_1.ethers.Wallet(config_1.CONFIG.BOT_PRIVATE_KEY, this.provider);
        this.coreContract = new ethers_1.ethers.Contract(config_1.CONFIG.CORE_CONTRACT_ADDRESS, config_1.CORE_ABI, this.wallet);
    }
    /**
     * Start the probing process
     */
    async start() {
        if (this.isRunning) {
            logger_1.logger.warn('Trade prober is already running');
            return;
        }
        try {
            logger_1.logger.info('Starting trade prober...');
            // Check wallet balance
            const balance = await this.provider.getBalance(this.wallet.address);
            logger_1.logger.info(`Bot wallet balance: ${ethers_1.ethers.formatEther(balance)} ETH`);
            if (balance < ethers_1.ethers.parseEther('0.01')) {
                throw new Error('Insufficient ETH balance for gas fees');
            }
            this.isRunning = true;
            // Start the execution loop
            this.startExecutionLoop();
            logger_1.logger.info('Trade prober started successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to start trade prober', error);
            throw error;
        }
    }
    /**
     * Stop the probing process
     */
    async stop() {
        if (!this.isRunning) {
            logger_1.logger.warn('Trade prober is not running');
            return;
        }
        try {
            this.isRunning = false;
            if (this.executionInterval) {
                clearInterval(this.executionInterval);
                this.executionInterval = null;
            }
            logger_1.logger.info('Trade prober stopped');
        }
        catch (error) {
            logger_1.logger.error('Error stopping trade prober', error);
        }
    }
    /**
     * Check if prober is running
     */
    getRunning() {
        return this.isRunning;
    }
    /**
     * Manually probe a specific pair
     */
    async probePair(pairId) {
        try {
            logger_1.logger.info(`Manually probing pair: ${pairId}`);
            const result = await this.executeTrades(pairId);
            if (result.success) {
                this.tradeStateManager.markPairProbed(pairId);
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error(`Error manually probing pair ${pairId}`, error);
            return {
                success: false,
                pairId,
                tradesExecuted: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
        }
    }
    startExecutionLoop() {
        this.executionInterval = setInterval(async () => {
            if (!this.isRunning) {
                return;
            }
            try {
                await this.executePendingTrades();
            }
            catch (error) {
                logger_1.logger.error('Error in execution loop', error);
            }
        }, config_1.CONFIG.EXECUTION_INTERVAL_MS);
    }
    async executePendingTrades() {
        try {
            // Get pairs that need execution
            const pairsNeedingExecution = this.tradeStateManager.getPairsNeedingExecution();
            if (pairsNeedingExecution.length === 0) {
                logger_1.logger.debug('No pairs need execution at this time');
                return;
            }
            logger_1.logger.info(`Found ${pairsNeedingExecution.length} pairs needing execution`);
            // Execute trades for each pair
            for (const pairId of pairsNeedingExecution) {
                try {
                    const result = await this.executeTrades(pairId);
                    if (result.success) {
                        this.tradeStateManager.markPairProbed(pairId);
                        logger_1.logger.info(`Successfully executed trades for pair ${pairId}`, {
                            tradesExecuted: result.tradesExecuted,
                            gasUsed: result.gasUsed?.toString()
                        });
                    }
                    else {
                        logger_1.logger.warn(`Failed to execute trades for pair ${pairId}`, {
                            error: result.error
                        });
                    }
                    // Small delay between executions to avoid overwhelming the network
                    await this.delay(1000);
                }
                catch (error) {
                    logger_1.logger.error(`Error executing trades for pair ${pairId}`, error);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error in executePendingTrades', error);
        }
    }
    async executeTrades(pairId) {
        try {
            logger_1.logger.debug(`Executing executeTrades for pair: ${pairId}`);
            // Prepare transaction
            const tx = await this.coreContract.executeTrades.populateTransaction(pairId);
            // Estimate gas
            const gasEstimate = await this.coreContract.executeTrades.estimateGas(pairId);
            const gasLimit = gasEstimate + 50000n; // Add buffer
            // Build transaction with gas settings
            const transaction = {
                ...tx,
                gasLimit,
                maxPriorityFeePerGas: config_1.CONFIG.MAX_PRIORITY_FEE_PER_GAS,
                maxFeePerGas: config_1.CONFIG.MAX_FEE_PER_GAS
            };
            // Send transaction
            const response = await this.wallet.sendTransaction(transaction);
            logger_1.logger.info(`Transaction sent: ${response.hash}`);
            // Wait for confirmation
            const receipt = await response.wait();
            if (receipt?.status === 1) {
                logger_1.logger.info(`Transaction confirmed: ${response.hash}`);
                return {
                    success: true,
                    pairId,
                    tradesExecuted: 1, // We don't know exact count, assume 1
                    gasUsed: receipt.gasUsed,
                    timestamp: new Date()
                };
            }
            else {
                throw new Error('Transaction failed');
            }
        }
        catch (error) {
            logger_1.logger.error(`Error executing executeTrades for pair ${pairId}`, error);
            return {
                success: false,
                pairId,
                tradesExecuted: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get current gas price
     */
    async getGasPrice() {
        try {
            return await this.provider.getFeeData().then(data => data.gasPrice || 0n);
        }
        catch (error) {
            logger_1.logger.error('Error getting gas price', error);
            return 0n;
        }
    }
    /**
     * Get wallet address
     */
    getWalletAddress() {
        return this.wallet.address;
    }
}
exports.TradeProber = TradeProber;
//# sourceMappingURL=tradeProber.js.map