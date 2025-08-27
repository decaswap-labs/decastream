import { EventListener } from "./eventListener";
import { TradeProber } from "./tradeProber";
import { TradeStateManager } from "./tradeStateManager";
import { logger } from "./logger";
import { CONFIG } from "./config";

export class DECABot {
  private eventListener: EventListener;
  private tradeProber: TradeProber;
  private tradeStateManager: TradeStateManager;
  private isRunning: boolean = false;
  private statsInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private persistenceInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.tradeStateManager = new TradeStateManager(true); // Load persisted data
    this.eventListener = new EventListener(this.tradeStateManager);
    this.tradeProber = new TradeProber(this.tradeStateManager);
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Bot is already running");
      return;
    }

    try {
      logger.info("🚀 Starting DECAStream Protocol Bot...");

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

      logger.info("✅ DECAStream Protocol Bot started successfully!");
      logger.info(`📍 Bot wallet: ${this.tradeProber.getWalletAddress()}`);
      logger.info(`🔗 Core contract: ${CONFIG.CORE_CONTRACT_ADDRESS}`);
      logger.info(`⏱️  Execution interval: ${CONFIG.EXECUTION_INTERVAL_MS}ms`);

      // Log initial stats
      this.logStats();
    } catch (error) {
      logger.error("❌ Failed to start bot", error);
      throw error;
    }
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn("Bot is not running");
      return;
    }

    try {
      logger.info("🛑 Stopping DECAStream Protocol Bot...");

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

      logger.info("✅ DECAStream Protocol Bot stopped successfully");
    } catch (error) {
      logger.error("❌ Error stopping bot", error);
    }
  }

  /**
   * Check if bot is running
   */
  getRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get current bot status
   */
  getStatus(): {
    isRunning: boolean;
    eventListenerConnected: boolean;
    tradeProberRunning: boolean;
    stats: any;
  } {
    return {
      isRunning: this.isRunning,
      eventListenerConnected: this.eventListener.getConnected(),
      tradeProberRunning: this.tradeProber.getRunning(),
      stats: this.tradeStateManager.getStats(),
    };
  }

  /**
   * Manually probe a specific pair
   */
  async probePair(pairId: string): Promise<any> {
    if (!this.isRunning) {
      throw new Error("Bot is not running");
    }

    try {
      logger.info(`🔍 Manually probing pair: ${pairId}`);
      const result = await this.tradeProber.probePair(pairId);

      if (result.success) {
        logger.info(`✅ Manual probe successful for pair ${pairId}`);
      } else {
        logger.warn(`⚠️  Manual probe failed for pair ${pairId}`, {
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      logger.error(`❌ Error in manual probe for pair ${pairId}`, error);
      throw error;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): any {
    return this.tradeStateManager.getStats();
  }

  private validateConfig(): void {
    if (
      CONFIG.CORE_CONTRACT_ADDRESS ===
      "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error("CORE_CONTRACT_ADDRESS not set in environment variables");
    }

    if (
      CONFIG.BOT_PRIVATE_KEY ===
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    ) {
      throw new Error("BOT_PRIVATE_KEY not set in environment variables");
    }

    if (CONFIG.INFURA_WS_URL.includes("YOUR_PROJECT_ID")) {
      throw new Error("INFURA_WS_URL not properly configured");
    }

    logger.info("✅ Configuration validation passed");
  }

  private startStatsLogging(): void {
    // Log stats every 5 minutes
    this.statsInterval = setInterval(() => {
      this.logStats();
    }, 5 * 60 * 1000);
  }

  private startCleanupProcess(): void {
    // Run cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => {
      try {
        this.tradeStateManager.cleanup();
      } catch (error) {
        logger.error("Error in cleanup process", error);
      }
    }, 10 * 60 * 1000);

    // Persist data every 5 minutes
    this.persistenceInterval = setInterval(() => {
      try {
        this.tradeStateManager.persistDataNow();
      } catch (error) {
        logger.error("Error in persistence process", error);
      }
    }, 5 * 60 * 1000);
  }

  private logStats(): void {
    try {
      const stats = this.tradeStateManager.getStats();
      const status = this.getStatus();

      logger.info("📊 Bot Statistics", {
        ...stats,
        eventListenerConnected: status.eventListenerConnected,
        tradeProberRunning: status.tradeProberRunning,
        uptime: this.getUptime(),
      });
    } catch (error) {
      logger.error("Error logging stats", error);
    }
  }

  private getUptime(): string {
    // This would track actual uptime in a production bot
    return "Running";
  }

  /**
   * Graceful shutdown handler
   */
  setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`🔄 Received ${signal}, shutting down gracefully...`);

      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        logger.error("Error during graceful shutdown", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGUSR2", () => shutdown("SIGUSR2")); // For nodemon
  }
}
