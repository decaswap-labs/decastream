# DECAStream Protocol Bot 🤖

A TypeScript bot that monitors the DECAStream Protocol for trade events and automatically executes the `executeTrades` function to maintain protocol efficiency.

## 🎯 **Purpose**

The bot listens for `TradeCreated` and `TradeStreamExecuted` events, intelligently tracks trade states, and probes the `executeTrades` function every 24 seconds (approximately 2 blocks) when trades need execution.

## 🏗️ **Architecture**

### **Core Components:**

1. **`EventListener`** - Monitors blockchain events via Infura WebSocket

   - Listens for `TradeCreated`, `TradeStreamExecuted`, `TradeCancelled`, `TradeSettled`
   - Generates deterministic `pairId` from token addresses
   - Handles WebSocket reconnection with exponential backoff

2. **`TradeStateManager`** - Tracks trade and pair states

   - Maps `tradeId` → `lastSweetSpot` to determine execution needs
   - Only calls `executeTrades` when `lastSweetSpot > 0`
   - Intelligent cleanup of completed trades

3. **`TradeProber`** - Executes transactions

   - Calls `executeTrades(pairId)` on Core contract
   - Manages gas settings and transaction confirmation
   - Runs every 24 seconds via interval

4. **`DECABot`** - Main orchestrator
   - Coordinates all components
   - Provides status monitoring and statistics
   - Handles graceful shutdown

## 🚀 **Quick Start**

### **1. Install Dependencies**

```bash
cd decabot
npm install
```

### **2. Configure Environment**

Create `.env` file:

```bash
# Infura WebSocket URL (from your pro account)
INFURA_WS_URL=wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID

# Core contract address (set after deployment)
CORE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Bot wallet private key (for executing transactions)
BOT_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# Logging level
LOG_LEVEL=info
NODE_ENV=production
```

### **3. Build & Run**

```bash
# Build TypeScript
npm run build

# Start the bot
npm start

# Or run in development mode
npm run dev
```

## 📊 **How It Works**

### **Event Monitoring:**

1. Bot connects to Infura WebSocket
2. Listens for `TradeCreated` events from Core contract
3. Generates `pairId` from `tokenIn` + `tokenOut` addresses
4. Tracks trade state with `lastSweetSpot` value

### **Intelligent Execution:**

1. Every 24 seconds, checks which pairs need execution
2. Only calls `executeTrades` when trades have `lastSweetSpot > 0`
3. Monitors `TradeStreamExecuted` events to update trade states
4. Removes pairs when all trades are completed (`lastSweetSpot == 0`)

### **Trade Lifecycle:**

```
TradeCreated → Track pairId + lastSweetSpot
     ↓
TradeStreamExecuted → Update lastSweetSpot
     ↓
If lastSweetSpot > 0 → Continue monitoring
If lastSweetSpot == 0 → Remove from tracking
```

## ⚙️ **Configuration**

### **Environment Variables:**

- `INFURA_WS_URL` - Your Infura Pro WebSocket endpoint
- `CORE_CONTRACT_ADDRESS` - Deployed Core contract address
- `BOT_PRIVATE_KEY` - Bot wallet private key for transactions
- `LOG_LEVEL` - Logging verbosity (info, warn, error, debug)

### **Gas Settings:**

- Execution interval: 24 seconds (2 blocks)
- Gas limit: 500,000 + buffer
- Max priority fee: 2 gwei
- Max fee: 50 gwei

## 🔧 **Development**

### **Scripts:**

```bash
npm run build      # Build TypeScript to JavaScript
npm run start      # Run built JavaScript
npm run dev        # Run TypeScript directly with ts-node
```

### **Project Structure:**

```
decabot/
├── src/
│   ├── bot.ts              # Main bot orchestrator
│   ├── eventListener.ts    # WebSocket event monitoring
│   ├── tradeProber.ts      # Transaction execution
│   ├── tradeStateManager.ts # Trade state tracking
│   ├── config.ts           # Configuration & constants
│   ├── types.ts            # TypeScript interfaces
│   ├── logger.ts           # Logging implementation
│   └── index.ts            # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

## 📈 **Monitoring & Statistics**

The bot provides real-time statistics:

- Total trades tracked
- Active trades count
- Pairs being monitored
- Pairs needing execution
- Event listener connection status
- Trade prober status

## 💾 **Data Persistence**

The bot automatically persists trade state to disk:

- **Automatic Persistence**: Every 5 minutes and on state changes
- **Shutdown Persistence**: Final state saved before exit
- **Restart Recovery**: Bot resumes with previous trade state after restart
- **Data Location**: Stored in `data/` folder as JSON files
- **Historical Tracking**: Maintains complete trade lifecycle history

## 🚨 **Error Handling**

- **WebSocket Reconnection**: Automatic with exponential backoff
- **Transaction Failures**: Logged with detailed error information
- **Graceful Shutdown**: Handles SIGTERM, SIGINT signals
- **Unhandled Errors**: Caught and logged before exit

## 🔒 **Security**

- Private key stored in environment variables
- No hardcoded secrets
- Gas limits to prevent excessive spending
- Transaction confirmation waiting

## 🚀 **Deployment**

### **GitHub Actions (Recommended):**

```yaml
name: Run DECA Bot
on:
  schedule:
    - cron: "*/13 * * * *" # Every 13 seconds
  workflow_dispatch: # Manual trigger

jobs:
  run-bot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: |
          cd decabot
          npm ci
          npm run build
          npm start
        env:
          INFURA_WS_URL: ${{ secrets.INFURA_WS_URL }}
          CORE_CONTRACT_ADDRESS: ${{ secrets.CORE_CONTRACT_ADDRESS }}
          BOT_PRIVATE_KEY: ${{ secrets.BOT_PRIVATE_KEY }}
```

### **Manual Deployment:**

1. Set up environment variables
2. Build with `npm run build`
3. Run with `npm start`
4. Use PM2 or systemd for process management

## 🧪 **Testing**

The bot includes comprehensive error handling and logging. Test scenarios:

- WebSocket disconnection/reconnection
- Invalid contract addresses
- Insufficient gas balance
- Transaction failures
- Graceful shutdown

## 📝 **Logs**

Bot provides detailed logging:

- Event processing
- Transaction execution
- Error conditions
- Statistics updates
- Connection status

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 **License**

ISC License - see package.json for details

## ⚠️ **Disclaimer**

This bot is designed for the DECAStream Protocol. Use at your own risk. Ensure proper testing on testnets before mainnet deployment.

---

**Built with ❤️ for the DECAStream Protocol**
