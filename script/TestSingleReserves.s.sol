// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";
import { StreamDaemon } from "../src/StreamDaemon.sol";
import { Executor } from "../src/Executor.sol";
import { IUniversalDexInterface } from "../src/interfaces/IUniversalDexInterface.sol";
import { UniswapV2Fetcher } from "../src/adapters/UniswapV2Fetcher.sol";
import { SushiswapFetcher } from "../src/adapters/SushiswapFetcher.sol";
import { UniswapV3Fetcher } from "../src/adapters/UniswapV3Fetcher.sol";

// we are going to rewrite the full suite with a singular call to identify the area where

contract TestReservesScript is Script {
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    function run() external {
        vm.startBroadcast();

        UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);

        uint24[] memory feeTiers = new uint24[](3);
        feeTiers[0] = 500; // 0.05%
        feeTiers[1] = 3000; // 0.3%
        feeTiers[2] = 10_000; // 1%
        UniswapV3Fetcher uniswapV3Fetcher = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, feeTiers[1]);

        address[][] memory tokenPairs = new address[][](1);
        tokenPairs[0] = new address[](2);
        tokenPairs[0][0] = WETH;
        tokenPairs[0][1] = USDC;

        console.log("\n=== Testing Uniswap V2 Reserves ===");
        testReservesForAllPairs(uniswapV2Fetcher, tokenPairs);

        console.log("\n=== Testing Uniswap V3 Reserves ===");
        testReservesForAllPairs(uniswapV3Fetcher, tokenPairs);

        address[] memory dexAddresses = new address[](2);
        dexAddresses[0] = address(uniswapV2Fetcher);
        dexAddresses[1] = address(uniswapV3Fetcher);

        address[] memory routers = new address[](2);

        StreamDaemon streamDaemon = new StreamDaemon(dexAddresses, routers);
        console.log("\n=== Testing StreamDaemon's findHighestReservesForTokenPair ===");
        for (uint256 i = 0; i < tokenPairs.length; i++) {
            address token0 = tokenPairs[i][0];
            address token1 = tokenPairs[i][1];

            (address bestDex, uint256 maxReserveIn, uint256 maxReserveOut) =
                streamDaemon.findHighestReservesForTokenPair(token0, token1);

            maxReserveOut;

            console.log(
                string(abi.encodePacked("Best DEX for ", getTokenSymbol(token0), "-", getTokenSymbol(token1), ": "))
            );
            console.log(bestDex);
            console.log("Highest reserve:", maxReserveIn);
        }

        // Executor executor = new Executor(address(streamDaemon));
        // console.log("\n=== Testing Executor Gas Consumption ===");

        // uint256 gasUsed = executor.gasConsumption();
        // console.log("Initial gas consumption:", gasUsed);

        console.log("\n=== Testing Sweet Spot Calculation ===");

        // For a $10M pool, let's test with ~1% / $100,000
        // now testing ETH at $1500
        uint256 testVolume = 2 * 33_333_333_333_333_333_333; // ~66 eth in 18 decimal

        uint256 effectiveGasInDollars = 1; // $30 gas cost

        // Ensure minimum of $1 as mentioned (updated from $0.1)
        // uint256 effectiveGasInDollars = gasPriceInDollars > 1 ? gasPriceInDollars : 1;

        for (uint256 i = 0; i < tokenPairs.length; i++) {
            address token0 = tokenPairs[i][0];
            address token1 = tokenPairs[i][1];

            (uint256 sweetSpot, address bestFetcher,) =
                streamDaemon.evaluateSweetSpotAndDex(token0, token1, testVolume, effectiveGasInDollars, false);

            console.log(string(abi.encodePacked("Token Pair: ", getTokenSymbol(token0), "-", getTokenSymbol(token1))));
            console.log("Best DEX:", bestFetcher);
            console.log("Sweet Spot:", sweetSpot);
        }

        console.log("methods to add to Executor: ");
        console.log("- executeOnDEX(address token0, address token1)");
        console.log("- executeTrade(address token0, address token1, uint256 amount, address dex)");

        vm.stopBroadcast();
    }

    function testReservesForAllPairs(IUniversalDexInterface fetcher, address[][] memory tokenPairs) internal view {
        for (uint256 i = 0; i < tokenPairs.length; i++) {
            address token0 = tokenPairs[i][0];
            address token1 = tokenPairs[i][1];

            uint256 reservesA;
            uint256 reservesB;
            try fetcher.getReserves(token0, token1) returns (uint256 resA, uint256 resB) {
                reservesA = resA;
                reservesB = resB;
                console.log(
                    string(abi.encodePacked("Reserves for ", getTokenSymbol(token0), "-", getTokenSymbol(token1), ": "))
                );
                console.log(reservesA, reservesB);
            } catch {
                console.log(
                    string(
                        abi.encodePacked(
                            "Failed to get reserves for ", getTokenSymbol(token0), "-", getTokenSymbol(token1)
                        )
                    )
                );
            }
        }
    }

    function getTokenSymbol(address token) internal pure returns (string memory) {
        if (token == WETH) return "WETH";
        if (token == USDC) return "USDC";
        return "UNKNOWN";
    }
}
