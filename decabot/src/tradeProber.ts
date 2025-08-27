import { ethers } from 'ethers';
import { CONFIG, CORE_ABI } from './config';
import { TradeStateManager } from './tradeStateManager';
import { ExecutionResult } from './types';
import { logger } from './logger';

export class TradeProber {
  private provider: ethers.JsonRpcProvider;
  private coreContract: ethers.Contract;
  private wallet: ethers.Wallet;
  private tradeStateManager: TradeStateManager;
  private isRunning: boolean = false;
  private executionInterval: NodeJS.Timeout | null = null;

  constructor(tradeStateManager: TradeStateManager) {
    this.tradeStateManager = tradeStateManager;
    
    // Use HTTP provider for transactions (more reliable than WebSocket for tx)
    const httpUrl = CONFIG.INFURA_WS_URL.replace('wss://', 'https://').replace('/ws/', '/');
    this.provider = new ethers.JsonRpcProvider(httpUrl);
    
    this.wallet = new ethers.Wallet(CONFIG.BOT_PRIVATE_KEY, this.provider);
    this.coreContract = new ethers.Contract(CONFIG.CORE_CONTRACT_ADDRESS, CORE_ABI, this.wallet);
  }

  /**
   * Start the probing process
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Trade prober is already running');
      return;
    }

    try {
      logger.info('Starting trade prober...');
      
      // Check wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);
      logger.info(`Bot wallet balance: ${ethers.formatEther(balance)} ETH`);
      
      if (balance < ethers.parseEther('0.01')) {
        throw new Error('Insufficient ETH balance for gas fees');
      }

      this.isRunning = true;
      
      // Start the execution loop
      this.startExecutionLoop();
      
      logger.info('Trade prober started successfully');
      
    } catch (error) {
      logger.error('Failed to start trade prober', error);
      throw error;
    }
  }

  /**
   * Stop the probing process
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Trade prober is not running');
      return;
    }

    try {
      this.isRunning = false;
      
      if (this.executionInterval) {
        clearInterval(this.executionInterval);
        this.executionInterval = null;
      }
      
      logger.info('Trade prober stopped');
      
    } catch (error) {
      logger.error('Error stopping trade prober', error);
    }
  }

  /**
   * Check if prober is running
   */
  getRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Manually probe a specific pair
   */
  async probePair(pairId: string): Promise<ExecutionResult> {
    try {
      logger.info(`Manually probing pair: ${pairId}`);
      
      const result = await this.executeTrades(pairId);
      
      if (result.success) {
        this.tradeStateManager.markPairProbed(pairId);
      }
      
      return result;
      
    } catch (error) {
      logger.error(`Error manually probing pair ${pairId}`, error);
      
      return {
        success: false,
        pairId,
        tradesExecuted: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private startExecutionLoop(): void {
    this.executionInterval = setInterval(async () => {
      if (!this.isRunning) {
        return;
      }

      try {
        await this.executePendingTrades();
      } catch (error) {
        logger.error('Error in execution loop', error);
      }
    }, CONFIG.EXECUTION_INTERVAL_MS);
  }

  private async executePendingTrades(): Promise<void> {
    try {
      // Get pairs that need execution
      const pairsNeedingExecution = this.tradeStateManager.getPairsNeedingExecution();
      
      if (pairsNeedingExecution.length === 0) {
        logger.debug('No pairs need execution at this time');
        return;
      }

      logger.info(`Found ${pairsNeedingExecution.length} pairs needing execution`);
      
      // Execute trades for each pair
      for (const pairId of pairsNeedingExecution) {
        try {
          const result = await this.executeTrades(pairId);
          
          if (result.success) {
            this.tradeStateManager.markPairProbed(pairId);
            logger.info(`Successfully executed trades for pair ${pairId}`, {
              tradesExecuted: result.tradesExecuted,
              gasUsed: result.gasUsed?.toString()
            });
          } else {
            logger.warn(`Failed to execute trades for pair ${pairId}`, {
              error: result.error
            });
          }
          
          // Small delay between executions to avoid overwhelming the network
          await this.delay(1000);
          
        } catch (error) {
          logger.error(`Error executing trades for pair ${pairId}`, error);
        }
      }
      
    } catch (error) {
      logger.error('Error in executePendingTrades', error);
    }
  }

  private async executeTrades(pairId: string): Promise<ExecutionResult> {
    try {
      logger.debug(`Executing executeTrades for pair: ${pairId}`);
      
      // Prepare transaction
      const tx = await this.coreContract.executeTrades.populateTransaction(pairId);
      
      // Estimate gas
      const gasEstimate = await this.coreContract.executeTrades.estimateGas(pairId);
      const gasLimit = gasEstimate + 50000n; // Add buffer
      
      // Build transaction with gas settings
      const transaction = {
        ...tx,
        gasLimit,
        maxPriorityFeePerGas: CONFIG.MAX_PRIORITY_FEE_PER_GAS,
        maxFeePerGas: CONFIG.MAX_FEE_PER_GAS
      };
      
      // Send transaction
      const response = await this.wallet.sendTransaction(transaction);
      logger.info(`Transaction sent: ${response.hash}`);
      
      // Wait for confirmation
      const receipt = await response.wait();
      
      if (receipt?.status === 1) {
        logger.info(`Transaction confirmed: ${response.hash}`);
        
        return {
          success: true,
          pairId,
          tradesExecuted: 1, // We don't know exact count, assume 1
          gasUsed: receipt.gasUsed,
          timestamp: new Date()
        };
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error) {
      logger.error(`Error executing executeTrades for pair ${pairId}`, error);
      
      return {
        success: false,
        pairId,
        tradesExecuted: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    try {
      return await this.provider.getFeeData().then(data => data.gasPrice || 0n);
    } catch (error) {
      logger.error('Error getting gas price', error);
      return 0n;
    }
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }
}
