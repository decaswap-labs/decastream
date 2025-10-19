import { ethers, providers } from 'ethers'
import { Contract } from 'ethers'
import { CONTRACT_ADDRESSES } from './config/contracts'
import {
  UniswapV2RouterABI,
  UniswapV3QuoterABI,
  CurvePoolABI,
  BalancerVaultABI,
} from './config/abis'

interface GasCalculationResult {
  botGasLimit: bigint
  streamCount: number
}

interface Reserves {
  token0: string
  token1: string
}

interface TokenDecimals {
  token0: number
  token1: number
}

interface ReservesResponse {
  reserves: Reserves
  decimals: TokenDecimals
}

// Utility to normalize amount based on decimals
export function normalizeAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0')
  return BigInt(whole + paddedFraction)
}

export function calculateSweetSpot(
  tradeVolume: bigint,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number,
  sellAmount: number
): number {
  // Sweet spot formula: N = sqrt(alpha * V^2)
  // where:
  // N = number of streams
  // V = trade volume
  // alpha = reserveA/reserveB^2 (or reserveB/reserveA^2 depending on the magnitude of the reserves)

  console.log('==========Calculating Sweet Spot (Frontend)==========')

  // Convert all values to ETH format (not wei)
  const scaledReserveA = Number(reserveA) / 10 ** decimalsA
  const scaledReserveB = Number(reserveB) / 10 ** decimalsB
  const scaledVolume = Number(tradeVolume) / 10 ** decimalsA

  console.log('scaledReserveA', scaledReserveA)
  console.log('scaledReserveB', scaledReserveB)
  console.log('tradeVolume', scaledVolume)

  // Calculate alpha based on which reserve is larger
  const alpha =
    scaledReserveA > scaledReserveB
      ? scaledReserveA / (scaledReserveB * scaledReserveB)
      : scaledReserveB / (scaledReserveA * scaledReserveA)
  console.log('alpha', alpha)

  // Calculate V^2 using ETH format values
  const volumeSquared = scaledVolume * scaledVolume
  console.log('volumeSquared', volumeSquared)

  let streamCount = 0

  // Check if reserve ratio is less than 0.001
  const reserveRatio = (scaledReserveB / scaledReserveA) * 100
  console.log('reserveRatio', reserveRatio)

  if (reserveRatio < 0.001) {
    // Calculate N = sqrt(alpha * V^2)
    streamCount = Math.sqrt(alpha * volumeSquared)
    console.log('Reserve ratio less than 0.001, streamCount = ', streamCount)
  } else {
    // Calculate N = sqrt(V^2 / Rin)
    streamCount = Math.sqrt(volumeSquared / scaledReserveA)
    console.log('Reserve ratio greater than 0.001, streamCount = ', streamCount)
  }

  // If pool depth < 0.2%, set streamCount to 4
  let poolDepth = scaledVolume / scaledReserveA
  console.log('poolDepth%', poolDepth)
  if (poolDepth < 0.002) {
    console.log('Pool depth less than 0.2%, streamCount = 4')
    streamCount = 4
  }

  console.log('streamCount', streamCount)

  // Round to nearest integer and ensure minimum value of 4
  return Math.max(4, Math.round(streamCount))
}

// Cache for ETH price to avoid too many API calls
let cachedEthPrice: bigint | null = null
let lastEthPriceFetch = 0
const ETH_PRICE_CACHE_MS = 60_000 // 1 minute

async function getEthPrice(): Promise<bigint> {
  const now = Date.now()
  if (cachedEthPrice && now - lastEthPriceFetch < ETH_PRICE_CACHE_MS) {
    return cachedEthPrice
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
    )
    if (!response.ok) {
      throw new Error('Failed to fetch ETH price')
    }
    const data = await response.json()
    const price = BigInt(Math.floor(data.ethereum.usd))
    cachedEthPrice = price
    lastEthPriceFetch = now
    return price
  } catch (error) {
    console.error('Error fetching ETH price:', error)
    // Fallback to a reasonable default if API fails
    return BigInt(2000)
  }
}

async function calculateGasAllowance(
  provider: providers.Provider,
  streamCount: number
): Promise<bigint> {
  // Get current gas price
  const gasPrice = await provider.getFeeData()
  if (!gasPrice.gasPrice) {
    throw new Error('Failed to get gas price')
  }

  // Get current ETH price from CoinGecko
  const ETH_PRICE_USD = await getEthPrice()
  const ONE_DOLLAR_IN_WEI = BigInt(10) ** BigInt(18) / ETH_PRICE_USD // Convert $1 to wei
  const gasPriceBigInt = BigInt(gasPrice.gasPrice.toString())
  const nominalGas = ONE_DOLLAR_IN_WEI / gasPriceBigInt

  // Calculate total gas cost for all streams
  const totalGasCost = gasPriceBigInt * nominalGas * BigInt(streamCount)

  return totalGasCost
}

// Utility to fetch and cache average block time
let cachedBlockTime: number | null = null
let lastBlockTimeFetch = 0
const BLOCK_TIME_CACHE_MS = 60_000 // 1 minute

export async function getAverageBlockTime(
  provider: any,
  numBlocks: number = 20
): Promise<number> {
  try {
    const now = Date.now()
    if (cachedBlockTime && now - lastBlockTimeFetch < BLOCK_TIME_CACHE_MS) {
      console.log('Using cached block time:', cachedBlockTime)
      return cachedBlockTime
    }

    const latestBlock = await provider.getBlockNumber()
    const latest = await provider.getBlock(latestBlock)
    const first = await provider.getBlock(latestBlock - numBlocks)

    if (!latest || !first) {
      console.log('Missing block details, using fallback time of 12s')
      return 12
    }

    const avg = (latest.timestamp - first.timestamp) / numBlocks
    cachedBlockTime = avg
    lastBlockTimeFetch = now
    return avg
  } catch (error) {
    console.error('Error in getAverageBlockTime:', error)
    return 12
  }
}

export async function calculateGasAndStreams(
  provider: providers.Provider,
  tradeVolume: string,
  reserves: ReservesResponse,
  sellAmount: number
): Promise<GasCalculationResult> {
  try {
    const reserve0 = BigInt(reserves.reserves.token0)
    const reserve1 = BigInt(reserves.reserves.token1)

    const tradeVolumeBN = normalizeAmount(tradeVolume, reserves.decimals.token0)

    const sweetSpot = calculateSweetSpot(
      tradeVolumeBN,
      reserve0,
      reserve1,
      reserves.decimals.token0,
      reserves.decimals.token1,
      sellAmount
    )
    console.log('sweetSpot ===>', sweetSpot)

    const gasAllowance = await calculateGasAllowance(provider, sweetSpot)

    return {
      botGasLimit: gasAllowance,
      streamCount: sweetSpot,
    }
  } catch (error) {
    console.error('Error in calculateGasAndStreams:', error)
    throw error
  }
}

export async function calculateSlippageSavings(
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
