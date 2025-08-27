"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bot_1 = require("./bot");
const logger_1 = require("./logger");
async function main() {
    const bot = new bot_1.DECABot();
    try {
        // Setup graceful shutdown
        bot.setupGracefulShutdown();
        // Start the bot
        await bot.start();
        logger_1.logger.info('🎯 DECAStream Protocol Bot is now running and monitoring for trades...');
        // Keep the process alive
        process.stdin.resume();
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to start bot', error);
        process.exit(1);
    }
}
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', { promise, reason });
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
// Start the bot
main().catch((error) => {
    logger_1.logger.error('Fatal error in main:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map