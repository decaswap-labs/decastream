// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniversalDexInterface.sol";

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IUniswapV3Pool {
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);

    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    )
        external
        returns (int256 amount0, int256 amount1);
}

/**
 * @dev configurable fetcher for Uniswap V3 pools
 */
contract UniswapV3Fetcher is IUniversalDexInterface {
    address public factory;
    uint24 public fee;

    constructor(address _factory, uint24 _fee) {
        factory = _factory;
        fee = _fee;
    }

    function getReserves(
        address tokenA,
        address tokenB
    )
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        address pool = IUniswapV3Factory(factory).getPool(tokenA, tokenB, fee);
        if (pool == address(0)) {
            return (0, 0);
        }

        // Get pool data
        (uint160 sqrtPriceX96,,,,,,) = IUniswapV3Pool(pool).slot0();
        uint128 liquidity = IUniswapV3Pool(pool).liquidity();
        bool isToken0 = tokenA == IUniswapV3Pool(pool).token0();

        // Calculate virtual reserves using the formula from Uniswap V3
        // For a concentrated liquidity pool, the virtual reserves are:
        // reserve0 = L * (1/sqrt(P))
        // reserve1 = L * sqrt(P)
        // where L is liquidity and P is price

        // First calculate sqrt(P) from sqrtPriceX96
        // sqrtPriceX96 = sqrt(P) * 2^96
        // sqrt(P) = sqrtPriceX96 / 2^96
        uint256 sqrtPrice = uint256(sqrtPriceX96) * 1e9 >> 96; // Scale down sqrtPriceX96

        // Calculate virtual reserves
        // Use fixed point arithmetic to avoid overflow
        uint256 reserve0 = (uint256(liquidity) * 1e9) / sqrtPrice; // ! WARNING if sqrtPrice is 0, this will revert
        uint256 reserve1 = (uint256(liquidity) * sqrtPrice) / 1e9;
        // @audit this should rather getSingleFixQuote() from the contract in order to determine the depth within ticks,
        // +/- 1%.
        // for testing purposes it is satisfactory but for productoin this need correcting

        // Adjust for token decimals
        if (isToken0) {
            return (reserve0, reserve1);
        } else {
            return (reserve1, reserve0);
        }
    }

    function getPoolAddress(address tokenIn, address tokenOut) external view override returns (address) {
        return IUniswapV3Factory(factory).getPool(tokenIn, tokenOut, fee);
    }

    function getDexType() external pure override returns (string memory) {
        return "UniswapV3";
    }

    function getDexVersion() external pure override returns (string memory) {
        return "V3";
    }

    function getPrice(address tokenIn, address tokenOut, uint256 amountIn) external view override returns (uint256) {
        // For UniswapV3, calculate price based on reserves
        (uint256 reserveIn, uint256 reserveOut) = this.getReserves(tokenIn, tokenOut);
        
        if (reserveIn == 0 || reserveOut == 0) {
            return 0;
        }
        
        // Simple price calculation based on reserves ratio
        // This is a simplified version - UniswapV3 has more complex pricing with concentrated liquidity
        return (amountIn * reserveOut) / reserveIn;
    }
}
