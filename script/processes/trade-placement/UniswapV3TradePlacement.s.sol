// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../SingleDexProtocol.s.sol";
import "../../../src/Utils.sol";
import "../../../src/adapters/UniswapV3Fetcher.sol";

contract UniswapV3TradePlacement is SingleDexProtocol {
    function setUp() public {
        console.log("UniswapV3TradePlacement: Starting setup");
        UniswapV3Fetcher uniswapV3Fetcher = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, UNISWAP_V3_FEE);
        console.log("UniswapV3TradePlacement: Created fetcher at", address(uniswapV3Fetcher));
        setUpSingleDex(address(uniswapV3Fetcher), UNISWAP_V3_ROUTER);
        console.log("UniswapV3TradePlacement: Setup complete");
    }

    function run() external {
        testPlaceTradeWETHUSDC();
    }

    function testPlaceTradeWETHUSDC() public {
        console.log("UniswapV3TradePlacement: Starting trade test");
        console.log("UniswapV3TradePlacement: Using fetcher at", dexFetcher);
        console.log("UniswapV3TradePlacement: Using router at", dexRouter);
        
        uint256 amountIn = formatTokenAmount(WETH, 1);
        uint256 amountOutMin = formatTokenAmount(USDC, 1800);

        approveToken(WETH, address(core), amountIn);

        bytes memory tradeData = abi.encode(
            WETH,
            USDC,
            amountIn,
            amountOutMin,
            false,
            false  // usePriceBased - set to false for backward compatibility
        );

        core.placeTrade(tradeData);

        // Get the trade details
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];

        Utils.Trade memory trade = core.getTrade(tradeId);

        // Verify trade details (trade has already been executed once upon placement)
        assertEq(trade.owner, address(this), "Trade owner should be test contract");
        assertEq(trade.tokenIn, WETH, "Token in should be WETH");
        assertEq(trade.tokenOut, USDC, "Token out should be USDC");
        assertEq(trade.amountIn, amountIn, "Amount in should match");
        assertTrue(trade.amountRemaining < amountIn, "Amount remaining should be less than amount in after initial execution");
        assertEq(trade.targetAmountOut, amountOutMin, "Target amount out should match");
        assertTrue(trade.realisedAmountOut > 0, "Realised amount out should be greater than 0 after initial execution");
        assertEq(trade.attempts, 1, "Attempts should be 1 initially");
        assertTrue(trade.lastSweetSpot < 4, "Last sweet spot should be less than 4 after initial execution");
        assertEq(trade.isInstasettlable, false, "Should not be instasettlable");

        console.log("Trade placed and initially executed successfully");
        console.log("Trade ID:", tradeId);
        console.log("Amount In:", trade.amountIn);
        console.log("Amount Remaining:", trade.amountRemaining);
        console.log("Target Amount Out:", trade.targetAmountOut);
        console.log("Realised Amount Out:", trade.realisedAmountOut);
        console.log("Attempts:", trade.attempts);
        console.log("Last Sweet Spot:", trade.lastSweetSpot);
        console.log("Is Instasettlable:", trade.isInstasettlable);

        // Execute the trade
        core.executeTrades(pairId);

        // Get updated trade details
        trade = core.getTrade(tradeId);

        // Verify trade execution
        assertTrue(trade.amountRemaining < amountIn, "Amount remaining should be less than amount in");
        assertTrue(trade.realisedAmountOut > 0, "Should have realised amount out");
        assertTrue(trade.lastSweetSpot < 4, "Sweet spot should have decreased");

        console.log("Trade executed successfully");
        console.log("Updated Amount Remaining:", trade.amountRemaining);
        console.log("Updated Realised Amount Out:", trade.realisedAmountOut);
        console.log("Updated Last Sweet Spot:", trade.lastSweetSpot);
    }
}
