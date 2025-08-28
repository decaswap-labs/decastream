// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// import {StreamDaemon} from "./StreamDaemon.sol";
// let's rather use safeApprove from openzeppelin
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/dex/IUniswapV2Router.sol";
import "./interfaces/dex/IUniswapV3Router.sol";
import "./interfaces/dex/IBalancerVault.sol";
import "./interfaces/dex/ICurvePool.sol";
import "forge-std/console.sol";

contract Executor {
    using SafeERC20 for IERC20;

    error ZeroAmount();
    error SwapFailed();

    event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    function executeUniswapV2Trade(
        bytes memory params // @audit consider adding validation for params length
    )
        external
        returns (uint256)
    {
        // Decode all parameters
        (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient, address router) =
            abi.decode(params, (address, address, uint256, uint256, address, address));

        if (amountIn == 0) revert ZeroAmount();

        IERC20(tokenIn).forceApprove(router, amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            recipient,
            block.timestamp + 300 // @audit standardize deadline across all DEXes
        );

        // @audit consider additional validation on amountOut
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amounts[amounts.length - 1]); // @audit consider adding more
            // event data
        return amounts[amounts.length - 1];
    }

    function executeUniswapV3Trade(
        bytes memory params // @audit consider adding validation for params length
    )
        external
        returns (uint256)
    {
        // Decode all parameters
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient,
            uint24 fee,
            uint160 sqrtPriceLimitX96,
            address router
        ) = abi.decode(params, (address, address, uint256, uint256, address, uint24, uint160, address));

        if (amountIn == 0) revert ZeroAmount();

        IERC20(tokenIn).forceApprove(router, amountIn);

        console.log("block.timestamp", block.timestamp);

        IUniswapV3Router.ExactInputSingleParams memory swapParams = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient, // @audit verify recipient is not zero address
            deadline: block.timestamp + 300, // @audit standardize deadline across all DEXes
            amountIn: amountIn,
            amountOutMinimum: amountOutMin, // @audit consider minimum slippage threshold
            sqrtPriceLimitX96: sqrtPriceLimitX96 // @audit document impact of this parameter
         });

        uint256 amountOut = IUniswapV3Router(router).exactInputSingle(swapParams);

        // @audit consider additional validation on amountOut
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut); // @audit consider adding more event data
            // (recipient, fee)
        return amountOut;
    }

    function executeBalancerTrade(
        bytes memory params // @audit consider adding validation for params length
    )
        external
        returns (uint256)
    {
        // Decode all parameters
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient, // @audit verify recipient is not zero address
            bytes32 poolId,
            address router
        ) = abi.decode(params, (address, address, uint256, uint256, address, bytes32, address));

        if (amountIn == 0) revert ZeroAmount();

        IERC20(tokenIn).forceApprove(router, amountIn);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: 0, // GIVEN_IN @audit check if this is the correct kind
            assetIn: tokenIn,
            assetOut: tokenOut,
            amount: amountIn,
            userData: "" // @audit document what userData could be used for
         });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: msg.sender,
            fromInternalBalance: false,
            recipient: recipient,
            toInternalBalance: false
        });

        IBalancerVault(router).swap(singleSwap, funds, amountOutMin, block.timestamp + 300); // @audit standardize
            // deadline

        uint256 amountOut = IERC20(tokenOut).balanceOf(address(this));

        // @audit consider additional validation on amountOut
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut); // @audit consider adding more event data
        return amountOut;
    }

    function executeCurveTrade(
        bytes memory params // @audit consider adding validation for params length
    )
        external
        returns (uint256)
    {
        // Decode all parameters
        (
            address pool,
            int128 i,
            int128 j,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient, // @audit verify recipient is not zero address
            address router
        ) = abi.decode(params, (address, int128, int128, uint256, uint256, address, address));

        if (amountIn == 0) revert ZeroAmount();

        IERC20(pool).forceApprove(router, amountIn);

        ICurvePool(router).exchange(i, j, amountIn, amountOutMin); // @audit consider adding deadline parameter

        uint256 amountOut = IERC20(pool).balanceOf(address(this));

        // @audit consider additional validation on amountOut
        emit TradeExecuted(pool, pool, amountIn, amountOut); // @audit consider adding more event data
        return amountOut;
    }
}
