import { ethers } from 'ethers';
import { CONFIG, CORE_ABI, EVENT_SIGNATURES } from './config';
import { TradeStateManager } from './tradeStateManager';
import { TradeCreatedEvent, TradeStreamExecutedEvent, TradeCancelledEvent, TradeSettledEvent } from './types';
import { logger } from './logger';

export class EventListener {
  private provider: ethers.WebSocketProvider;
  private coreContract: ethers.Contract;
  private tradeStateManager: TradeStateManager;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(tradeStateManager: TradeStateManager) {
    this.tradeStateManager = tradeStateManager;
    this.provider = new ethers.WebSocketProvider(CONFIG.INFURA_WS_URL);
    this.coreContract = new ethers.Contract(CONFIG.CORE_CONTRACT_ADDRESS, CORE_ABI, this.provider);
    
    this.setupEventHandlers();
    this.setupConnectionHandlers();
  }

  /**
   * Start listening for events
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting event listener...');
      
      // Listen for all relevant events
      await this.listenToTradeCreated();
      await this.listenToTradeStreamExecuted();
      await this.listenToTradeCancelled();
      await this.listenToTradeSettled();
      
      this.isConnected = true;
      logger.info('Event listener started successfully');
      
    } catch (error) {
      logger.error('Failed to start event listener', error);
      throw error;
    }
  }

  /**
   * Stop listening for events
   */
  async stop(): Promise<void> {
    try {
      this.isConnected = false;
      await this.provider.destroy();
      logger.info('Event listener stopped');
    } catch (error) {
      logger.error('Error stopping event listener', error);
    }
  }

  /**
   * Check if listener is connected
   */
  getConnected(): boolean {
    return this.isConnected;
  }

  private setupEventHandlers(): void {
    // TradeCreated event
    this.coreContract.on('TradeCreated', async (
      tradeId: bigint,
      user: string,
      tokenIn: string,
      tokenOut: string,
      amountIn: bigint,
      amountRemaining: bigint,
      minAmountOut: bigint,
      realisedAmountOut: bigint,
      isInstasettlable: boolean,
      instasettleBps: bigint,
      lastSweetSpot: bigint,
      usePriceBased: boolean
    ) => {
      try {
        const event: TradeCreatedEvent = {
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
        
        logger.debug('TradeCreated event processed', {
          tradeId: event.tradeId,
          pairId,
          user,
          lastSweetSpot: lastSweetSpot.toString()
        });
      } catch (error) {
        logger.error('Error processing TradeCreated event', error);
      }
    });

    // TradeStreamExecuted event
    this.coreContract.on('TradeStreamExecuted', async (
      tradeId: bigint,
      amountIn: bigint,
      realisedAmountOut: bigint,
      lastSweetSpot: bigint
    ) => {
      try {
        const event: TradeStreamExecutedEvent = {
          tradeId: tradeId.toString(),
          amountIn,
          realisedAmountOut,
          lastSweetSpot
        };

        this.tradeStateManager.processTradeStreamExecuted(event);
        
        logger.debug('TradeStreamExecuted event processed', {
          tradeId: event.tradeId,
          newLastSweetSpot: lastSweetSpot.toString()
        });
      } catch (error) {
        logger.error('Error processing TradeStreamExecuted event', error);
      }
    });

    // TradeCancelled event
    this.coreContract.on('TradeCancelled', async (
      tradeId: bigint,
      amountRemaining: bigint,
      realisedAmountOut: bigint
    ) => {
      try {
        const event: TradeCancelledEvent = {
          tradeId: tradeId.toString(),
          amountRemaining,
          realisedAmountOut
        };

        this.tradeStateManager.processTradeCancelled(event);
        
        logger.debug('TradeCancelled event processed', {
          tradeId: event.tradeId
        });
      } catch (error) {
        logger.error('Error processing TradeCancelled event', error);
      }
    });

    // TradeSettled event
    this.coreContract.on('TradeSettled', async (
      tradeId: bigint,
      settler: string,
      totalAmountIn: bigint,
      totalAmountOut: bigint,
      totalFees: bigint
    ) => {
      try {
        const event: TradeSettledEvent = {
          tradeId: tradeId.toString(),
          settler,
          totalAmountIn,
          totalAmountOut,
          totalFees
        };

        this.tradeStateManager.processTradeSettled(event);
        
        logger.debug('TradeSettled event processed', {
          tradeId: event.tradeId,
          settler,
          totalFees: totalFees.toString()
        });
      } catch (error) {
        logger.error('Error processing TradeSettled event', error);
      }
    });
  }

  private setupConnectionHandlers(): void {
    this.provider.on('connect', () => {
      logger.info('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.provider.on('disconnect', () => {
      logger.warn('WebSocket disconnected');
      this.isConnected = false;
      this.attemptReconnect();
    });

    this.provider.on('error', (error) => {
      logger.error('WebSocket error', error);
      this.isConnected = false;
      this.attemptReconnect();
    });
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached, stopping listener');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.provider.destroy();
        this.provider = new ethers.WebSocketProvider(CONFIG.INFURA_WS_URL);
        this.coreContract = new ethers.Contract(CONFIG.CORE_CONTRACT_ADDRESS, CORE_ABI, this.provider);
        
        this.setupEventHandlers();
        this.setupConnectionHandlers();
        
        await this.start();
      } catch (error) {
        logger.error('Reconnection failed', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  private async listenToTradeCreated(): Promise<void> {
    // This is handled by the event handler setup
  }

  private async listenToTradeStreamExecuted(): Promise<void> {
    // This is handled by the event handler setup
  }

  private async listenToTradeCancelled(): Promise<void> {
    // This is handled by the event handler setup
  }

  private async listenToTradeSettled(): Promise<void> {
    // This is handled by the event handler setup
  }

  /**
   * Generate a deterministic pairId from token addresses
   */
  private generatePairId(tokenIn: string, tokenOut: string): string {
    // Sort tokens to ensure consistent pairId regardless of input order
    const [token0, token1] = [tokenIn.toLowerCase(), tokenOut.toLowerCase()].sort();
    return ethers.keccak256(ethers.toUtf8Bytes(`${token0}-${token1}`));
  }
}
