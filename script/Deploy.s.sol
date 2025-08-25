// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";
import { StreamDaemon } from "../src/StreamDaemon.sol";
import { Executor } from "../src/Executor.sol";
import { IUniversalDexInterface } from "../src/interfaces/IUniversalDexInterface.sol";
import { UniswapV2Fetcher } from "../src/adapters/UniswapV2Fetcher.sol";
import { SushiswapFetcher } from "../src/adapters/SushiswapFetcher.sol";
import { UniswapV3Fetcher } from "../src/adapters/UniswapV3Fetcher.sol";
// import {CurveFetcher} from "../src/adapters/CurveFetcher.sol";
// import {BalancerFetcher} from "../src/adapters/BalancerFetcher.sol";

contract DeployScript is Script {
    address constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant CURVE_REGISTRY = 0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5;
    address constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    function run() external {
        vm.startBroadcast();

        UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(SUSHISWAP_FACTORY);

        // Deploy fetchers
        UniswapV3Fetcher uniswapV3Fetcher = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 3000); // Use single fee tier

        // CurveFetcher curveFetcher = new CurveFetcher(CURVE_REGISTRY);
        // BalancerFetcher balancerFetcher = new BalancerFetcher(address(0), BALANCER_VAULT); // Placeholder for pool

        // Create an array of DEX addresses to monitor
        address[] memory dexAddresses = new address[](3);
        dexAddresses[0] = address(uniswapV2Fetcher);
        dexAddresses[1] = address(sushiswapFetcher);
        dexAddresses[2] = address(uniswapV3Fetcher);
        // dexAddresses[3] = address(curveFetcher);
        // dexAddresses[4] = address(balancerFetcher);

        address[] memory routerAddresses = new address[](3);
        routerAddresses[0] = UNISWAP_V2_ROUTER;
        routerAddresses[1] = SUSHISWAP_ROUTER;
        routerAddresses[2] = UNISWAP_V3_ROUTER;

        // Deploy StreamDaemon with the first fetcher as the primary interface
        // and all fetchers in the dexAddresses array
        StreamDaemon streamDaemon = new StreamDaemon(dexAddresses, routerAddresses);

        // Deploy Executor
        Executor executor = new Executor();

        console.log("UniswapV2Fetcher deployed at:", address(uniswapV2Fetcher));
        console.log("SushiswapFetcher deployed at:", address(sushiswapFetcher));
        console.log("UniswapV3Fetcher deployed at:", address(uniswapV3Fetcher));
        // console.log("CurveFetcher deployed at:", address(curveFetcher));
        // console.log("BalancerFetcher deployed at:", address(balancerFetcher));
        console.log("StreamDaemon deployed at:", address(streamDaemon));
        console.log("Executor deployed at:", address(executor));

        console.log("\n=== Testing Reserve Fetching ===");
        (address bestDex, uint256 maxReserveIn, uint256 maxReserveOut) =
            streamDaemon.findHighestReservesForTokenPair(WETH, USDC);
        console.log("Best DEX for WETH/USDC:", bestDex);
        console.log("Max reserve in:", maxReserveIn);
        console.log("Max reserve out:", maxReserveOut);

        (bestDex, maxReserveIn, maxReserveOut) = streamDaemon.findHighestReservesForTokenPair(WETH, WBTC);
        console.log("Best DEX for WETH/WBTC:", bestDex);
        console.log("Max reserve in:", maxReserveIn);
        console.log("Max reserve out:", maxReserveOut);

        (bestDex, maxReserveIn, maxReserveOut) = streamDaemon.findHighestReservesForTokenPair(WETH, DAI);
        console.log("Best DEX for WETH/DAI:", bestDex);
        console.log("Max reserve in:", maxReserveIn);
        console.log("Max reserve out:", maxReserveOut);

        // test for sweet spot calculation
        console.log("\n=== Testing Sweet Spot Calculation ===");
        // Volume in tokens (e.g., 10,000 tokens)
        uint256 testVolume = 10_000 * 1e18;

        // Gas price in dollar terms (approximate)
        // Assuming ETH at $3000 and gas price of 50 gwei
        // 50 gwei * 200000 gas = 0.01 ETH = $30 at current prices
        // We'll use a simplified dollar value directly
        uint256 gasPriceInDollars = 30; // $30 gas cost

        // Ensure minimum of $0.1 as mentioned
        uint256 effectiveGasInDollars = gasPriceInDollars > 0.1 ether ? gasPriceInDollars : 0.1 ether;

        // Test sweet spot for WETH-USDC
        (uint256 sweetSpot, address sweetSpotDex, address router) =
            streamDaemon.evaluateSweetSpotAndDex(WETH, USDC, testVolume, effectiveGasInDollars, false);
        console.log("WETH-USDC Sweet Spot:");
        console.log("Best DEX:", sweetSpotDex);
        console.log("Sweet Spot Value:", sweetSpot);

        // Test sweet spot for WETH-WBTC
        (sweetSpot, sweetSpotDex, router) =
            streamDaemon.evaluateSweetSpotAndDex(WETH, WBTC, testVolume, effectiveGasInDollars, false);
        console.log("WETH-WBTC Sweet Spot:");
        console.log("Best DEX:", sweetSpotDex);
        console.log("Sweet Spot Value:", sweetSpot);

        // Test sweet spot for WETH-DAI
        (sweetSpot, sweetSpotDex, router) =
            streamDaemon.evaluateSweetSpotAndDex(WETH, DAI, testVolume, effectiveGasInDollars, false);
        console.log("WETH-DAI Sweet Spot:");
        console.log("Best DEX:", sweetSpotDex);
        console.log("Sweet Spot Value:", sweetSpot);

        vm.stopBroadcast();
    }
}
