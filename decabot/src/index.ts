import { DECABot } from './bot';
import { logger } from './logger';

async function main() {
  const bot = new DECABot();
  
  try {
    // Setup graceful shutdown
    bot.setupGracefulShutdown();
    
    // Start the bot
    await bot.start();
    
    logger.info('🎯 DECAStream Protocol Bot is now running and monitoring for trades...');
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    logger.error('❌ Failed to start bot', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the bot
main().catch((error) => {
  logger.error('Fatal error in main:', error);
  process.exit(1);
});
