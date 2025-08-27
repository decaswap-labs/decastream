"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DECABot = void 0;
const eventListener_1 = require("./eventListener");
const tradeProber_1 = require("./tradeProber");
const tradeStateManager_1 = require("./tradeStateManager");
const logger_1 = require("./logger");
const config_1 = require("./config");
class DECABot {
    constructor() {
        this.isRunning = false;
        this.statsInterval = null;
        this.cleanupInterval = null;
        this.persistenceInterval = null;
        this.tradeStateManager = new tradeStateManager_1.TradeStateManager(true); // Load persisted data
        this.eventListener = new eventListener_1.EventListener(this.tradeStateManager);
        this.tradeProber = new tradeProber_1.TradeProber(this.tradeStateManager);
    }
    /**
     * Start the bot
     */
    async start() {
        if (this.isRunning) {
            logger_1.logger.warn('Bot is already running');
            return;
        }
        try {
            logger_1.logger.info('🚀 Starting DECAStream Protocol Bot...');
            // Validate configuration
            this.validateConfig();
            // Start event listener
            await this.eventListener.start();
            // Start trade prober
            await this.tradeProber.start();
            // Start statistics logging
            this.startStatsLogging();
            // Start cleanup process
            this.startCleanupProcess();
            this.isRunning = true;
            logger_1.logger.info('✅ DECAStream Protocol Bot started successfully!');
            logger_1.logger.info(`📍 Bot wallet: ${this.tradeProber.getWalletAddress()}`);
            logger_1.logger.info(`🔗 Core contract: ${config_1.CONFIG.CORE_CONTRACT_ADDRESS}`);
            logger_1.logger.info(`⏱️  Execution interval: ${config_1.CONFIG.EXECUTION_INTERVAL_MS}ms`);
            // Log initial stats
            this.logStats();
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to start bot', error);
            throw error;
        }
    }
    /**
     * Stop the bot
     */
    async stop() {
        if (!this.isRunning) {
            logger_1.logger.warn('Bot is not running');
            return;
        }
        try {
            logger_1.logger.info('🛑 Stopping DECAStream Protocol Bot...');
            // Stop all components
            await this.eventListener.stop();
            await this.tradeProber.stop();
            // Persist final state before shutdown
            this.tradeStateManager.persistDataNow();
            // Stop intervals
            if (this.statsInterval) {
                clearInterval(this.statsInterval);
                this.statsInterval = null;
            }
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
                this.cleanupInterval = null;
            }
            if (this.persistenceInterval) {
                clearInterval(this.persistenceInterval);
                this.persistenceInterval = null;
            }
            this.isRunning = false;
            logger_1.logger.info('✅ DECAStream Protocol Bot stopped successfully');
        }
        catch (error) {
            logger_1.logger.error('❌ Error stopping bot', error);
        }
    }
    /**
     * Check if bot is running
     */
    getRunning() {
        return this.isRunning;
    }
    /**
     * Get current bot status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            eventListenerConnected: this.eventListener.getConnected(),
            tradeProberRunning: this.tradeProber.getRunning(),
            stats: this.tradeStateManager.getStats()
        };
    }
    /**
     * Manually probe a specific pair
     */
    async probePair(pairId) {
        if (!this.isRunning) {
            throw new Error('Bot is not running');
        }
        try {
            logger_1.logger.info(`🔍 Manually probing pair: ${pairId}`);
            const result = await this.tradeProber.probePair(pairId);
            if (result.success) {
                logger_1.logger.info(`✅ Manual probe successful for pair ${pairId}`);
            }
            else {
                logger_1.logger.warn(`⚠️  Manual probe failed for pair ${pairId}`, { error: result.error });
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error(`❌ Error in manual probe for pair ${pairId}`, error);
            throw error;
        }
    }
    /**
     * Get current statistics
     */
    getStats() {
        return this.tradeStateManager.getStats();
    }
    validateConfig() {
        if (config_1.CONFIG.CORE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
            throw new Error('CORE_CONTRACT_ADDRESS not set in environment variables');
        }
        if (config_1.CONFIG.BOT_PRIVATE_KEY === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            throw new Error('BOT_PRIVATE_KEY not set in environment variables');
        }
        if (config_1.CONFIG.INFURA_WS_URL.includes('YOUR_PROJECT_ID')) {
            throw new Error('INFURA_WS_URL not properly configured');
        }
        logger_1.logger.info('✅ Configuration validation passed');
    }
    startStatsLogging() {
        // Log stats every 5 minutes
        this.statsInterval = setInterval(() => {
            this.logStats();
        }, 5 * 60 * 1000);
    }
    startCleanupProcess() {
        // Run cleanup every 10 minutes
        this.cleanupInterval = setInterval(() => {
            try {
                this.tradeStateManager.cleanup();
            }
            catch (error) {
                logger_1.logger.error('Error in cleanup process', error);
            }
        }, 10 * 60 * 1000);
        // Persist data every 5 minutes
        this.persistenceInterval = setInterval(() => {
            try {
                this.tradeStateManager.persistDataNow();
            }
            catch (error) {
                logger_1.logger.error('Error in persistence process', error);
            }
        }, 5 * 60 * 1000);
    }
    logStats() {
        try {
            const stats = this.tradeStateManager.getStats();
            const status = this.getStatus();
            logger_1.logger.info('📊 Bot Statistics', {
                ...stats,
                eventListenerConnected: status.eventListenerConnected,
                tradeProberRunning: status.tradeProberRunning,
                uptime: this.getUptime()
            });
        }
        catch (error) {
            logger_1.logger.error('Error logging stats', error);
        }
    }
    getUptime() {
        // This would track actual uptime in a production bot
        return 'Running';
    }
    /**
     * Graceful shutdown handler
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger_1.logger.info(`🔄 Received ${signal}, shutting down gracefully...`);
            try {
                await this.stop();
                process.exit(0);
            }
            catch (error) {
                logger_1.logger.error('Error during graceful shutdown', error);
                process.exit(1);
            }
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
    }
}
exports.DECABot = DECABot;
//# sourceMappingURL=bot.js.map