// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../interfaces/IUniversalDexInterface.sol";
import "../interfaces/dex/IUniswapV2Router.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract PancakeSwapFetcher is IUniversalDexInterface {
    address public router;
    
    constructor(address _router) {
        router = _router;
    }
    
    function getDexType() external pure returns (string memory) {
        return "PancakeSwap";
    }
    
    function getDexVersion() external pure returns (string memory) {
        return "V2";
    }
    
    function getPoolAddress(address tokenIn, address tokenOut) external view returns (address) {
        // PancakeSwap V2 uses the same factory pattern as UniswapV2
        // For now, return the router address as the pool identifier
        return router;
    }
    
    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB) {
        // PancakeSwap V2 uses the same interface as UniswapV2
        // We can get reserves from the router's getAmountsOut function
        address[] memory path = new address[](2);
        path[0] = tokenA;
        path[1] = tokenB;
        
        try IUniswapV2Router(router).getAmountsOut(1e18, path) returns (uint256[] memory amounts) {
            // Calculate reserves based on the swap ratio
            // This is a simplified approach - in production you'd query the actual pair contract
            uint256 amountOut = amounts[1];
            uint256 decimalsA = IERC20Metadata(tokenA).decimals();
            uint256 decimalsB = IERC20Metadata(tokenB).decimals();
            
            // Use a reasonable estimate for reserves based on the actual quote
            // If we get 1e18 of tokenA, we get amountOut of tokenB
            // So the ratio is amountOut / 1e18
            // For reasonable reserves, we can scale this up
            uint256 baseReserve = 1000000 * (10 ** decimalsA); // 1M tokens as base
            reserveA = baseReserve;
            reserveB = (amountOut * baseReserve) / 1e18;
        } catch {
            // Fallback to zero reserves if the call fails
            reserveA = 0;
            reserveB = 0;
        }
    }
    
    function getPrice(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        try IUniswapV2Router(router).getAmountsOut(amountIn, path) returns (uint256[] memory amounts) {
            return amounts[1];
        } catch {
            return 0;
        }
    }
} 