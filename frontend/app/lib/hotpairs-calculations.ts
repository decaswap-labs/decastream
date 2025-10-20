import { ethers, providers } from 'ethers'
import { Contract } from 'ethers'
import { CONTRACT_ADDRESSES } from './config/contracts'
import {
  UniswapV2RouterABI,
  UniswapV3QuoterABI,
  CurvePoolABI,
  BalancerVaultABI,
} from './config/abis'

/**
 * Get the best DEX reserves based on the DEX name
 * @param dexName - The name of the DEX (e.g., 'uniswap-v2', 'sushiswap', 'curve', etc.)
 * @param activeHotPair - The active hot pair object containing reserve data
 * @returns An object with bestDexReserveA and bestDexReserveB
 */
export function getBestDexReserves(
  dexName: string,
  activeHotPair: any
): { bestDexReserveA: string; bestDexReserveB: string } {
  let bestDexReserveA = activeHotPair?.reserveAtotaldepthWei
  let bestDexReserveB = activeHotPair?.reserveBtotaldepthWei

  // Map DEX name to reserve fields
  if (dexName === 'uniswap-v2') {
    bestDexReserveA = activeHotPair?.reservesAUniswapV2 || bestDexReserveA
    bestDexReserveB = activeHotPair?.reservesBUniswapV2 || bestDexReserveB
  } else if (dexName === 'sushiswap') {
    bestDexReserveA = activeHotPair?.reservesASushiswap || bestDexReserveA
    bestDexReserveB = activeHotPair?.reservesBSushiswap || bestDexReserveB
  } else if (dexName.startsWith('curve')) {
    bestDexReserveA = activeHotPair?.reservesACurve || bestDexReserveA
    bestDexReserveB = activeHotPair?.reservesBCurve || bestDexReserveB
  } else if (dexName.startsWith('balancer')) {
    bestDexReserveA = activeHotPair?.reservesABalancer || bestDexReserveA
    bestDexReserveB = activeHotPair?.reservesBBalancer || bestDexReserveB
  } else if (dexName === 'uniswap-v3-500') {
    bestDexReserveA = activeHotPair?.reservesAUniswapV3_500 || bestDexReserveA
    bestDexReserveB = activeHotPair?.reservesBUniswapV3_500 || bestDexReserveB
  } else if (dexName === 'uniswap-v3-3000') {
    bestDexReserveA = activeHotPair?.reservesAUniswapV3_3000 || bestDexReserveA
    bestDexReserveB = activeHotPair?.reservesBUniswapV3_3000 || bestDexReserveB
  } else if (dexName === 'uniswap-v3-10000') {
    bestDexReserveA = activeHotPair?.reservesAUniswapV3_10000 || bestDexReserveA
    bestDexReserveB = activeHotPair?.reservesBUniswapV3_10000 || bestDexReserveB
  }

  return { bestDexReserveA, bestDexReserveB }
}

export function calculateSweetSpotForHotPairs(
  tradeVolume: bigint,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number,
  sellAmount: number
): number {
  // Convert all values to ETH format (not wei)
  const scaledReserveA = Number(reserveA) / 10 ** decimalsA
  const scaledReserveB = Number(reserveB) / 10 ** decimalsB
  const scaledVolume = Number(tradeVolume) / 10 ** decimalsA

  // Calculate alpha based on which reserve is larger
  const alpha =
    scaledReserveA > scaledReserveB
      ? scaledReserveA / (scaledReserveB * scaledReserveB)
      : scaledReserveB / (scaledReserveA * scaledReserveA)

  // Calculate V^2 using ETH format values
  const volumeSquared = scaledVolume * scaledVolume

  let streamCount = 0

  // Check if reserve ratio is less than 0.001
  const reserveRatio = (scaledReserveB / scaledReserveA) * 100

  if (reserveRatio < 0.001) {
    // Calculate N = sqrt(alpha * V^2)
    streamCount = Math.sqrt(alpha * volumeSquared)
  } else {
    // Calculate N = sqrt(V^2 / Rin)
    streamCount = Math.sqrt(volumeSquared / scaledReserveA)
  }

  // If pool depth < 0.2%, set streamCount to 4
  let poolDepth = scaledVolume / scaledReserveA
  if (poolDepth < 0.002) {
    streamCount = 4
  }

  // Round to nearest integer and ensure minimum value of 4
  return Math.max(4, Math.round(streamCount))
}

export async function calculateSlippageSavingsForHotPairs(
  provider: providers.Provider,
  tradeVolume: bigint,
  dex: string,
  feeTier: number,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number,
  tokenIn: string,
  tokenOut: string,
  sweetSpot: number,
  poolAddress?: string
): Promise<{ savings: number; percentageSavings: number }> {
  try {
    if (dex === 'uniswap-v2' || dex === 'sushiswap') {
      const routerAddress =
        dex === 'uniswap-v2'
          ? CONTRACT_ADDRESSES.UNISWAP_V2.ROUTER
          : CONTRACT_ADDRESSES.SUSHISWAP.ROUTER

      const router = new Contract(routerAddress, UniswapV2RouterABI, provider)

      const amountOut = await router.getAmountOut(
        tradeVolume,
        reserveA,
        reserveB
      )
      const amountOutInETH = Number(amountOut) / 10 ** decimalsB

      const sweetSpotAmountOut = await router.getAmountOut(
        tradeVolume / BigInt(sweetSpot),
        reserveA,
        reserveB
      )
      const sweetSpotAmountOutInETH =
        Number(sweetSpotAmountOut) / 10 ** decimalsB
      const scaledSweetSpotAmountOutInETH = sweetSpotAmountOutInETH * sweetSpot

      const savings = scaledSweetSpotAmountOutInETH - amountOutInETH
      const raw = amountOutInETH / scaledSweetSpotAmountOutInETH
      let percentageSavings = (1 - raw) * 100
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
      percentageSavings = Number(percentageSavings.toFixed(3))

      return { savings, percentageSavings }
    }

    if (dex.startsWith('uniswap-v3')) {
      const quoter = new Contract(
        CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        UniswapV3QuoterABI,
        provider
      )

      const data = quoter.interface.encodeFunctionData(
        'quoteExactInputSingle',
        [tokenIn, tokenOut, feeTier, tradeVolume, 0]
      )

      const result = await provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data,
      })

      const dexQuoteAmountOut = quoter.interface.decodeFunctionResult(
        'quoteExactInputSingle',
        result
      )[0]

      const dexQuoteAmountOutInETH = Number(dexQuoteAmountOut) / 10 ** decimalsB

      const sweetSpotQuote = quoter.interface.encodeFunctionData(
        'quoteExactInputSingle',
        [tokenIn, tokenOut, feeTier, tradeVolume / BigInt(sweetSpot), 0]
      )

      const sweetSpotQuoteResult = await provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data: sweetSpotQuote,
      })

      const sweetSpotQuoteAmountOut = quoter.interface.decodeFunctionResult(
        'quoteExactInputSingle',
        sweetSpotQuoteResult
      )[0]

      const sweetSpotQuoteAmountOutInETH =
        Number(sweetSpotQuoteAmountOut) / 10 ** decimalsB
      const scaledSweetSpotQuoteAmountOutInETH =
        sweetSpotQuoteAmountOutInETH * sweetSpot

      const savings =
        scaledSweetSpotQuoteAmountOutInETH - dexQuoteAmountOutInETH
      const raw = dexQuoteAmountOutInETH / scaledSweetSpotQuoteAmountOutInETH
      let percentageSavings = (1 - raw) * 100
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
      percentageSavings = Number(percentageSavings.toFixed(3))

      return { savings, percentageSavings }
    }

    // Handle Curve pools
    if (dex.startsWith('curve') || dex === 'curve') {
      console.log('Calculating Curve slippage savings')

      if (!poolAddress) {
        console.error('Pool address required for Curve')
        return { savings: 0, percentageSavings: 0 }
      }

      try {
        const poolContract = new Contract(poolAddress, CurvePoolABI, provider)

        // Find token indices
        let tokenInIndex = -1
        let tokenOutIndex = -1

        // Try to find token indices
        for (let i = 0; i < 8; i++) {
          try {
            const coin = await poolContract.coins(i)
            if (coin.toLowerCase() === tokenIn.toLowerCase()) tokenInIndex = i
            if (coin.toLowerCase() === tokenOut.toLowerCase()) tokenOutIndex = i
            if (tokenInIndex !== -1 && tokenOutIndex !== -1) break
          } catch {
            break
          }
        }

        if (tokenInIndex === -1 || tokenOutIndex === -1) {
          console.error('Could not find token indices in Curve pool')
          return { savings: 0, percentageSavings: 0 }
        }

        // Get quote for full amount
        let amountOut: bigint
        try {
          amountOut = await poolContract.get_dy(
            tokenInIndex,
            tokenOutIndex,
            tradeVolume
          )
        } catch {
          try {
            amountOut = await poolContract.get_dy_underlying(
              tokenInIndex,
              tokenOutIndex,
              tradeVolume
            )
          } catch (error) {
            console.error('Error getting Curve quote:', error)
            return { savings: 0, percentageSavings: 0 }
          }
        }

        const amountOutInETH = Number(amountOut) / 10 ** decimalsB

        // Get quote for sweet spot amount
        let sweetSpotAmountOut: bigint
        try {
          sweetSpotAmountOut = await poolContract.get_dy(
            tokenInIndex,
            tokenOutIndex,
            tradeVolume / BigInt(sweetSpot)
          )
        } catch {
          try {
            sweetSpotAmountOut = await poolContract.get_dy_underlying(
              tokenInIndex,
              tokenOutIndex,
              tradeVolume / BigInt(sweetSpot)
            )
          } catch (error) {
            console.error('Error getting Curve sweet spot quote:', error)
            return { savings: 0, percentageSavings: 0 }
          }
        }

        const sweetSpotAmountOutInETH =
          Number(sweetSpotAmountOut) / 10 ** decimalsB
        const scaledSweetSpotAmountOutInETH =
          sweetSpotAmountOutInETH * sweetSpot

        const savings = scaledSweetSpotAmountOutInETH - amountOutInETH
        const raw = amountOutInETH / scaledSweetSpotAmountOutInETH
        let percentageSavings = (1 - raw) * 100
        percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
        percentageSavings = Number(percentageSavings.toFixed(3))

        console.log('Curve - amountOut:', amountOutInETH)
        console.log(
          'Curve - scaledSweetSpotAmountOut:',
          scaledSweetSpotAmountOutInETH
        )
        console.log('Curve - savings:', savings)
        console.log('Curve - percentageSavings:', percentageSavings)

        return { savings, percentageSavings }
      } catch (error) {
        console.error('Error in Curve calculation:', error)
        return { savings: 0, percentageSavings: 0 }
      }
    }

    // Handle Balancer pools
    if (dex.startsWith('balancer') || dex === 'balancer') {
      console.log('Calculating Balancer slippage savings')

      if (!poolAddress) {
        console.error('Pool ID required for Balancer')
        return { savings: 0, percentageSavings: 0 }
      }

      try {
        const vault = new Contract(
          CONTRACT_ADDRESSES.BALANCER.VAULT,
          BalancerVaultABI,
          provider
        )

        // Helper to build swap query
        const getQuote = async (amountIn: bigint): Promise<bigint> => {
          const swaps = [
            {
              poolId: poolAddress,
              assetInIndex: 0,
              assetOutIndex: 1,
              amount: amountIn.toString(),
              userData: '0x',
            },
          ]

          const assets = [tokenIn, tokenOut]
          const funds = {
            sender: ethers.constants.AddressZero,
            fromInternalBalance: false,
            recipient: ethers.constants.AddressZero,
            toInternalBalance: false,
          }

          const result = await vault.queryBatchSwap(0, swaps, assets, funds)
          return BigInt(result[1]) * BigInt(-1)
        }

        const amountOut = await getQuote(tradeVolume)
        const amountOutInETH = Number(amountOut) / 10 ** decimalsB

        const sweetSpotAmountOut = await getQuote(
          tradeVolume / BigInt(sweetSpot)
        )
        const sweetSpotAmountOutInETH =
          Number(sweetSpotAmountOut) / 10 ** decimalsB
        const scaledSweetSpotAmountOutInETH =
          sweetSpotAmountOutInETH * sweetSpot

        const savings = scaledSweetSpotAmountOutInETH - amountOutInETH
        const raw = amountOutInETH / scaledSweetSpotAmountOutInETH
        let percentageSavings = (1 - raw) * 100
        percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
        percentageSavings = Number(percentageSavings.toFixed(3))

        console.log('Balancer - amountOut:', amountOutInETH)
        console.log(
          'Balancer - scaledSweetSpotAmountOut:',
          scaledSweetSpotAmountOutInETH
        )
        console.log('Balancer - savings:', savings)
        console.log('Balancer - percentageSavings:', percentageSavings)

        return { savings, percentageSavings }
      } catch (error) {
        console.error('Error in Balancer calculation:', error)
        return { savings: 0, percentageSavings: 0 }
      }
    }

    console.warn(`Unsupported DEX: ${dex}`)
    return { savings: 0, percentageSavings: 0 }
  } catch (error) {
    console.error('Error calculating slippage savings:', error)
    return { savings: 0, percentageSavings: 0 }
  }
}
