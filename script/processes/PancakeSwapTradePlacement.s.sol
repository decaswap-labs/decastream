// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../SingleDexProtocol.s.sol";
import "../../src/Utils.sol";
import "../../src/adapters/PancakeSwapFetcher.sol";
import "../../src/interfaces/dex/IUniswapV2Router.sol";

contract PancakeSwapTradePlacement is SingleDexProtocol {
    // Use UniswapV2 router for testing since we're on Ethereum mainnet fork
    // In production, this would be the actual PancakeSwap router on BSC
    address constant PANCAKESWAP_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D; // UniswapV2 router for testing
    
    function setUp() public {
        // Deploy PancakeSwapFetcher with PANCAKESWAP_ROUTER
        PancakeSwapFetcher pancakeSwapFetcher = new PancakeSwapFetcher(PANCAKESWAP_ROUTER);
        
        // Set up protocol with only PancakeSwap
        setUpSingleDex(address(pancakeSwapFetcher), PANCAKESWAP_ROUTER);

        console.log("PancakeSwap test setup complete (using UniswapV2 router for testing)");
    }

    function run() external {
        testPancakeSwapSpecificFeatures();
        testPancakeSwapTradePlacement();
    }

    function testPancakeSwapSpecificFeatures() public {
        console.log("Testing PancakeSwap-specific features");
        
        // Test that PancakeSwapFetcher can be deployed and has correct properties
        PancakeSwapFetcher pancakeSwapFetcher = PancakeSwapFetcher(dexFetcher);
        
        // Test DEX type identification
        string memory dexType = pancakeSwapFetcher.getDexType();
        assertEq(dexType, "PancakeSwap", "DEX type should be PancakeSwap");
        
        // Test router address retrieval
        address routerAddress = pancakeSwapFetcher.router();
        assertEq(routerAddress, PANCAKESWAP_ROUTER, "Router address should match PANCAKESWAP_ROUTER");
        
        // Test version
        string memory version = pancakeSwapFetcher.getDexVersion();
        assertEq(version, "V2", "DEX version should be V2");
        
        console.log("PancakeSwap-specific features test passed");
        console.log("Router address:", routerAddress);
        console.log("DEX type:", dexType);
        console.log("DEX version:", version);
    }

    function testPancakeSwapTradePlacement() public {
        console.log("Testing PancakeSwap trade placement");
        
        // Test WETH to USDC trade
        testPlaceTradeWETHUSDC();
        
        console.log("PancakeSwap trade placement tests completed");
    }

    function testPlaceTradeWETHUSDC() public {
        console.log("Testing WETH to USDC trade on PancakeSwap");
        
        PancakeSwapFetcher pancakeSwapFetcher = PancakeSwapFetcher(dexFetcher);
        
        // Get initial balances
        uint256 initialWETH = getTokenBalance(WETH, address(this));
        uint256 initialUSDC = getTokenBalance(USDC, address(this));
        
        console.log("Initial WETH balance:", initialWETH);
        console.log("Initial USDC balance:", initialUSDC);
        
        // Approve USDC for Core (in case we get some back)
        IERC20(USDC).approve(address(core), type(uint256).max);
        
        // Prepare trade data
        uint256 tradeAmount = formatTokenAmount(WETH, 1) / 10; // 0.1 WETH
        uint256 minOut = formatTokenAmount(USDC, 1500) / 10; // 150 USDC (conservative)
        
        console.log("Trade amount:", tradeAmount);
        console.log("Min output:", minOut);
        
        // Get trade data from registry
        IRegistry.TradeData memory tradeData = registry.prepareTradeData(
            address(pancakeSwapFetcher),
            WETH,
            USDC,
            tradeAmount,
            minOut,
            address(this)
        );
        
        console.log("Trade data prepared successfully");
        console.log("Executor selector:", vm.toString(tradeData.selector));
        console.log("Router:", tradeData.router);
        
        // Execute trade via Core
        vm.startPrank(address(this));
        
        // Transfer WETH to Core
        IERC20(WETH).transfer(address(core), tradeAmount);
        
        // Execute the trade using Core.placeTrade
        bytes memory coreTradeData = abi.encode(
            WETH,
            USDC,
            tradeAmount,
            minOut,
            false, // isInstasettlable
            false  // usePriceBased - set to false for backward compatibility
        );
        
        core.placeTrade(coreTradeData);
        
        vm.stopPrank();
        
        // Get the trade details
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];
        
        Utils.Trade memory trade = core.getTrade(tradeId);
        
        console.log("Trade executed successfully");
        console.log("Trade ID:", tradeId);
        console.log("Amount In:", trade.amountIn);
        console.log("Amount Remaining:", trade.amountRemaining);
        console.log("Target Amount Out:", trade.targetAmountOut);
        console.log("Realised Amount Out:", trade.realisedAmountOut);
        
        // Verify trade results
        assertEq(trade.owner, address(this), "Trade owner should be test contract");
        assertEq(trade.tokenIn, WETH, "Token in should be WETH");
        assertEq(trade.tokenOut, USDC, "Token out should be USDC");
        assertEq(trade.amountIn, tradeAmount, "Amount in should match");
        assertTrue(trade.realisedAmountOut > 0, "Should have realised some output");
        
        console.log("WETH to USDC trade test PASSED");
    }
} 