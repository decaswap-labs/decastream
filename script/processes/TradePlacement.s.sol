// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../Protocol.s.sol";
import "../../src/Utils.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TradePlacement is Protocol {
    using SafeERC20 for IERC20;

    function setUp() public virtual override {
        console.log("TradePlacement: setUp() start");
        super.setUp();
        console.log("TradePlacement: setUp() end");
    }

    function run() external virtual override {
        console.log("TradePlacement: run() start");
        testPlaceTradeWETHUSDC();
        test_RevertWhen_InsufficientAllowance();
        test_RevertWhen_InsufficientBalance();
        console.log("TradePlacement: run() end");
    }

    function testPlaceTradeWETHUSDC() public {
        console.log("TradePlacement: testPlaceTradeWETHUSDC() start");

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
        assertTrue(
            trade.amountRemaining < amountIn, "Amount remaining should be less than amount in after initial execution"
        );
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

        console.log("TradePlacement: testPlaceTradeWETHUSDC() end");
    }

    function placeTradeWETHUSDC(bool isInstasettlable) public virtual returns (uint256 tradeId) {
        // Setup initial balances
        uint256 amountIn = formatTokenAmount(WETH, 1); // 1 WETH
        uint256 amountOutMin = formatTokenAmount(USDC, 1800); // Expected USDC output with 0.1% slippage
        uint256 botGasAllowance = 0.0005 ether;

        // Log WETH balance before approval
        uint256 wethBalance = getTokenBalance(WETH, address(this));
        require(wethBalance >= amountIn, "Insufficient WETH balance");

        // Approve Core to spend WETH
        uint256 allowanceBefore = IERC20(WETH).allowance(address(this), address(core));

        approveToken(WETH, address(core), amountIn);

        uint256 allowanceAfter = IERC20(WETH).allowance(address(this), address(core));
        allowanceAfter;

        // Record initial balances
        uint256 initialWethBalance = getTokenBalance(WETH, address(core));
        uint256 initialUsdcBalance = getTokenBalance(USDC, address(core));

        // Create the trade data
        bytes memory tradeData = abi.encode(
            WETH, // tokenIn
            USDC, // tokenOut
            amountIn, // amountIn
            amountOutMin, // amountOutMin
            isInstasettlable ? true : false, // isInstasettlable
            false  // usePriceBased - set to false for backward compatibility
        );

        // Place trade
        core.placeTrade(tradeData);

        // Verify trade was placed
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);

        // // Get the trade details
        tradeId = tradeIds[0];
        // (
        //     address owner,
        //     uint96 cumulativeGasEntailed,
        //     uint8 attempts,
        //     address tokenIn,
        //     address tokenOut,
        //     uint256 amountIn_,
        //     uint256 amountRemaining,
        //     uint256 targetAmountOut,
        //     uint256 realisedAmountOut,
        //     uint256 tradeId_,
        //     uint256 instasettleBps,
        //     uint256 botGasAllowance_,
        //     uint256 lastSweetSpot,
        //     bool isInstasettlable
        // ) = core.trades(tradeId);

        // targetAmountOut;
        // botGasAllowance_;

        // // Verify trade struct values
        // assertEq(owner, address(this), "Trade owner should be this contract");
        // assertEq(tokenIn, WETH, "TokenIn should be WETH");
        // assertEq(tokenOut, USDC, "TokenOut should be USDC");
        // assertEq(amountIn_, amountIn, "AmountIn should match input");
        // assertNotEq(amountRemaining, 0, "Amount remaining should not be 0 after execution");
        // // assertEq(targetAmountOut, amountIn, "Target amount out should match input");
        // assertTrue(realisedAmountOut > 0, "Realised amount out should be greater than 0");
        // assertEq(tradeId_, tradeId, "Trade ID should match");
        // // assertEq(botGasAllowance_, botGasAllowance, "Bot gas allowance should match input");
        // assertEq(instasettleBps, 100, "Instasettle BPS should be 100");
        // console.log("Here be the last sweetie spot", lastSweetSpot);
        // assertTrue(lastSweetSpot >= 3, "Last sweet spot should be >= 4");
        // assertEq(isInstasettlable, false, "Should not be instasettlable");
        // assertEq(attempts, 1, "Should have 1 attempt");
        // assertTrue(cumulativeGasEntailed > 0, "Should have gas entailed");

        // Verify balances
        // uint256 finalWethBalance = getTokenBalance(WETH, address(core));
        // uint256 finalUsdcBalance = getTokenBalance(USDC, address(core));

        // assertEq(finalWethBalance - initialWethBalance, amountIn * 3 / 4, "WETH balance not decreased correctly"); //
        // we know sweet spot comes out at 4 for this tx
        // assertEq(
        //     initialUsdcBalance + realisedAmountOut, finalUsdcBalance, "USDC balance should increase by realised
        // amount"
        // );

        // // Verify trade execution metrics
        // assertTrue(realisedAmountOut >= amountOutMin, "Realised amount should be >= minimum amount");
        // assertTrue(cumulativeGasEntailed <= botGasAllowance, "Gas used should be <= allowance");

        // // Log execution details
        // console.log("Trade Execution Details:");
        // console.log("Trade ID:", tradeId);
        // console.log("Amount In:", amountIn);
        // console.log("Amount Out:", realisedAmountOut);
        // console.log("Gas Used:", cumulativeGasEntailed);
        // console.log("Sweet Spot:", lastSweetSpot);
        // console.log("Attempts:", attempts);
        console.log("Trade Placed and Stream Executed");
    }

    function test_RevertWhen_InsufficientAllowance() public {
        uint256 amountIn = formatTokenAmount(WETH, 1);
        uint256 amountOutMin = formatTokenAmount(USDC, 1800);

        // Don't approve tokens

        vm.expectRevert();
        core.placeTrade(abi.encode(WETH, USDC, amountIn, amountOutMin, false, false));
    }

    function test_RevertWhen_InsufficientBalance() public {
        uint256 amountIn = formatTokenAmount(WETH, 1000); // Try to trade 1000 WETH
        uint256 amountOutMin = formatTokenAmount(USDC, 1_800_000);

        approveToken(WETH, address(core), amountIn);

        vm.expectRevert();
        core.placeTrade(abi.encode(WETH, USDC, amountIn, amountOutMin, false, false));
    }

    // function test_RevertWhen_ToxicTrade() public {
    //     // Setup initial balances
    //     uint256 amountIn = formatTokenAmount(WETH, 1);
    //     uint256 amountOutMin = formatTokenAmount(USDC, 1000); // Set a very low minimum to trigger toxic trade

    //     // Approve Core to spend WETH
    //     approveToken(WETH, address(core), amountIn);

    //     // Place trade
    //     core.placeTrade(
    //         abi.encode(
    //             WETH,
    //             USDC,
    //             amountIn,
    //             amountOutMin,
    //             false,
    //             0.1 ether
    //         )
    //     );

    //     // Try to execute trade - should revert with ToxicTrade error
    //     vm.expectRevert(abi.encodeWithSelector(Core.ToxicTrade.selector, 0));
    //     bytes32 pairId = keccak256(abi.encode(WETH, USDC));
    //     core.executeTrades(pairId);
    // }
}
