# 1SLiquidity Protocol

This repo contains the code for the **1SLiquidity Protocol**. It is a work in progress and will be updated as it's developed.

Currently the project is in the _Specification_ sprint, where docs and diagrams are being created to outline the project and serve for the team of engineers that will be building the protocol.

## Boilerplate

Ever gone through the laborious process of checking each DEX to get the best trade? What if you don't care and just send it on whichever DEX you happen to be used to? This exposure to front running, pool manipulation and unpredictable slippage rates will be a thing of the past.

One click and the **1SLiquidity Protocol** will route your trade across the DEX with the optimum trade conditions and '**Stream**' it out chunk by chunk, block by block. As market conditions change, we adapt, finding the best performing DEX on this stream by stream basis. When your trade is fully settled, you receive your tokens in precisely the threshold you defined. Taking too long? **Cancel** the trade at any time and return tokens exchanged to that point.

**Instasettle** furthermore allows anyone to instantly settle a trade across the contract in full. Users get to define thresholds in BPS and viewing traders can settle at these rates in one click. Both maker and taker get instant (block) settling.

## Foundry

Built using Foundry for smart contracts.

## Deployment Strategy

### Initial Mainnet Launch

The protocol will be deployed with **3 core DEXs** for the initial mainnet launch:

- **UniswapV2** - Ethereum's most established DEX
- **Sushiswap** - High liquidity alternative
- **PancakeSwap** - Popular DEX with unique features

### Deployment Scripts

- `DeployBarebones.s.sol` - Initial mainnet deployment (3 DEXs)
- `DeployMainnet.s.sol` - Full deployment with all DEXs (for future use)

### Adding DEXs Post-Launch

Additional DEXs can be added without redeploying core contracts:

- Deploy new fetcher contracts
- Register with StreamDaemon
- Configure Registry routers
- See [DEX Integration Guide](DEX_INTEGRATION_GUIDE.md) for details

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
