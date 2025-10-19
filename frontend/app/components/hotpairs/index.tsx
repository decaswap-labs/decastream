'use client'

import { useEffect, useState, useRef } from 'react'
import { useAnimation } from 'framer-motion'
import { motion, Variants } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Navbar from '../navbar'
import { FireIcon } from '../home/SELSection/HotPair/fire-icon'
import PairsTable from './pairs-table'
import TopPairsCarousel from './top-pairs-carousel'
import VolumeSection from './VolumeSection'
import WinSection from './WinSection'
import { HeroBgImage } from './hotpairs-icons'
import Button from '../button'
import TokenPairsSection from './TokenPairsSection'
import {
  calculateSlippageSavings,
  calculateSweetSpot,
  normalizeAmount,
} from '@/app/lib/gas-calculations'
import { DexCalculatorFactory } from '@/app/lib/dex/calculators'
import {
  fetchSpecificPair,
  useTokenEnhancer,
} from '@/app/lib/hooks/hotpairs/useEnhancedTokens'
import { useQueryClient } from '@tanstack/react-query'

const HotPairs = () => {
  const router = useRouter()
  const [volumeAmount, setVolumeAmount] = useState(0)
  const [winAmount, setWinAmount] = useState(0)
  const [activeHotPair, setActiveHotPair] = useState<any>(null)
  const [volumeActive, setVolumeActive] = useState(true)
  const [winActive, setWinActive] = useState(true)
  const [winLoading, setWinLoading] = useState(false)
  const [volumeLoading, setVolumeLoading] = useState(false)

  const [selectedBaseToken, setSelectedBaseToken] = useState<any>(null)
  const [selectedOtherToken, setSelectedOtherToken] = useState<any>(null)
  const [slippageSavingsUsd, setSlippageSavingsUsd] = useState<any>(null)

  const controls = useAnimation()
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const queryClient = useQueryClient()
  const { enhanceTokenPair } = useTokenEnhancer()

  // Dynamic height for icons area (from top to cards section)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cardsRef = useRef<HTMLDivElement | null>(null)
  const [iconsHeight, setIconsHeight] = useState<number>(0)

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current || !cardsRef.current) return
      const containerTop = containerRef.current.getBoundingClientRect().top
      const cardsTop = cardsRef.current.getBoundingClientRect().top
      const h = Math.max(0, Math.floor(cardsTop - containerTop))
      setIconsHeight(h)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    controls.start('visible')
  }, [controls])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
        delay: 0,
      },
    },
  }

  const handleActiveHotPair = async (pair: any) => {
    console.log('🔥 handleActiveHotPair called with pair:', pair)
    if (!pair) return

    // Check if the pair has individual DEX reserve fields
    const hasDexReserves = pair.reservesAUniswapV2 !== undefined

    let completePair = pair

    // If the pair doesn't have DEX reserves, fetch the complete data
    if (!hasDexReserves && pair.tokenAAddress && pair.tokenBAddress) {
      try {
        const result = await queryClient.fetchQuery({
          queryKey: ['specificPair', pair.tokenAAddress, pair.tokenBAddress],
          queryFn: () =>
            fetchSpecificPair({
              tokenA: pair.tokenAAddress,
              tokenB: pair.tokenBAddress,
            }),
        })

        if (result.data) {
          const enhancedData = enhanceTokenPair(result.data)
          completePair = {
            ...enhancedData,
            slippageSavingsUsd:
              enhancedData.slippageSavings * (enhancedData.tokenBUsdPrice || 1),
          }
          console.log('✅ Complete pair data fetched with DEX reserves')
        }
      } catch (error) {
        console.error('❌ Error fetching complete pair data:', error)
        // Continue with original pair data if fetch fails
      }
    }

    setActiveHotPair(completePair)
    setVolumeAmount(completePair?.reserveAtotaldepth)
    setWinAmount(completePair?.percentageSavings || 0)
    setSlippageSavingsUsd(completePair?.slippageSavingsUsd)

    setVolumeActive(true)
    setWinActive(true)

    setSelectedBaseToken({
      icon: completePair.tokenAIcon,
      symbol: completePair.tokenASymbol,
      tokenAddress: completePair?.tokenAAddress,
    })
    setSelectedOtherToken({
      icon: completePair?.tokenBIcon,
      symbol: completePair?.tokenBSymbol,
      tokenAddress: completePair?.tokenBAddress,
    })
  }

  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (delayOffset: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
        ease: 'easeOut',
        delay: 0.15 + delayOffset,
      },
    }),
  }

  const handleSwitchTokens = () => {
    const newPair = {
      ...activeHotPair,
      tokenAIcon: activeHotPair.tokenBIcon,
      tokenBIcon: activeHotPair.tokenAIcon,
      tokenAAddress: activeHotPair.tokenBAddress,
      tokenBAddress: activeHotPair.tokenAAddress,
      tokenASymbol: activeHotPair.tokenBSymbol,
      tokenBSymbol: activeHotPair.tokenASymbol,
    }

    setActiveHotPair(newPair)
  }

  const handleVolumeAmountChange = async (amount: number) => {
    console.log('🔄 handleVolumeAmountChange called with amount:', amount)

    if (!activeHotPair) {
      console.log('⏹️ Skipping calculation - no active hotpair')
      return
    }

    // Update the UI immediately for responsiveness
    setVolumeAmount(amount)

    // If entering the original value, restore the stored backend values
    if (amount === activeHotPair?.reserveAtotaldepth) {
      console.log('✨ Restoring stored backend values')
      setWinAmount(activeHotPair?.percentageSavings || 0)
      setSlippageSavingsUsd(activeHotPair?.slippageSavingsUsd)
      setWinLoading(false)
      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      return
    }

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set loading state
    setWinLoading(true)
    setVolumeLoading(false)

    // Debounce the calculation - wait 300ms after user stops typing
    debounceTimerRef.current = setTimeout(async () => {
      const calculator = DexCalculatorFactory.createCalculator(
        activeHotPair?.highestLiquidityADex || 'uniswap-v2',
        undefined,
        '1'
      )

      const tradeVolumeBN = normalizeAmount(
        amount.toString(),
        activeHotPair?.tokenADecimals
      )

      // Get the best DEX reserves based on highestLiquidityADex
      const dexName = activeHotPair?.highestLiquidityADex || 'uniswap-v2'
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
        bestDexReserveA =
          activeHotPair?.reservesAUniswapV3_500 || bestDexReserveA
        bestDexReserveB =
          activeHotPair?.reservesBUniswapV3_500 || bestDexReserveB
      } else if (dexName === 'uniswap-v3-3000') {
        bestDexReserveA =
          activeHotPair?.reservesAUniswapV3_3000 || bestDexReserveA
        bestDexReserveB =
          activeHotPair?.reservesBUniswapV3_3000 || bestDexReserveB
      } else if (dexName === 'uniswap-v3-10000') {
        bestDexReserveA =
          activeHotPair?.reservesAUniswapV3_10000 || bestDexReserveA
        bestDexReserveB =
          activeHotPair?.reservesBUniswapV3_10000 || bestDexReserveB
      }

      // Calculate sweet spot using the trade volume and best DEX reserves
      const sweetSpot = calculateSweetSpot(
        tradeVolumeBN, // Trade volume (user input)
        BigInt(bestDexReserveA), // Best DEX reserve A
        BigInt(bestDexReserveB), // Best DEX reserve B
        activeHotPair?.tokenADecimals,
        activeHotPair?.tokenBDecimals,
        0
      )

      console.log('sweetSpot ===>', sweetSpot)

      const feeTier = activeHotPair?.highestLiquidityADex
        ? activeHotPair?.highestLiquidityADex?.startsWith('uniswap-v3')
          ? parseInt(activeHotPair?.highestLiquidityADex.split('-')[2])
          : activeHotPair?.highestLiquidityADex?.startsWith('balancer-') ||
            activeHotPair?.highestLiquidityADex === 'balancer'
          ? 0
          : activeHotPair?.highestLiquidityADex?.startsWith('curve-') ||
            activeHotPair?.highestLiquidityADex === 'curve'
          ? 0
          : 3000
        : 3000

      // Calculate slippage savings using total reserves for trade volume
      // but best DEX reserves for the quote calculations
      const { savings, percentageSavings } = await calculateSlippageSavings(
        calculator.getProvider(),
        tradeVolumeBN,
        activeHotPair?.highestLiquidityADex || 'uniswap-v2',
        feeTier,
        BigInt(bestDexReserveA),
        BigInt(bestDexReserveB),
        activeHotPair?.tokenADecimals,
        activeHotPair?.tokenBDecimals,
        activeHotPair?.tokenAAddress,
        activeHotPair?.tokenBAddress,
        sweetSpot,
        activeHotPair?.pairAddress // Pool address for Curve/Balancer
      )
      console.log('savings ===>', savings)
      console.log('percentageSavings ===>', percentageSavings)

      const savingsInUSD = savings * (activeHotPair?.tokenBUsdPrice || 1)
      setWinAmount(Number(percentageSavings.toFixed(2)) || 0)
      setSlippageSavingsUsd(savingsInUSD)
      setWinLoading(false)
    }, 300) // 300ms debounce delay
  }

  const handleWinAmountChange = (amount: number) => {
    setWinAmount(amount)
    setWinLoading(false)
    // setVolumeLoading(true)

    // After one seond set volume loading to false
    // setTimeout(() => {
    //   setVolumeLoading(false)
    // }, 1000)
  }

  const handleMainStreamClick = () => {
    if (activeHotPair) {
      // Navigate to swaps page with active token pair as query parameters
      const searchParams = new URLSearchParams({
        from: activeHotPair.tokenASymbol,
        to: activeHotPair.tokenBSymbol,
      })

      router.push(`/?${searchParams.toString()}`)
    }
  }

  const clearAllSelectedTokens = () => {
    setSelectedBaseToken(null)
    setSelectedOtherToken(null)
    setActiveHotPair(null)
    setVolumeAmount(0)
    setWinAmount(0)
    setVolumeActive(false)
    setWinActive(false)
  }

  // console.log('activeHotPair ===>', activeHotPair)
  // console.log('selectedBaseToken ===>', selectedBaseToken)
  // console.log('selectedOtherToken ===>', selectedOtherToken)

  // console.log('activeHotPair ===>', activeHotPair)
  // console.log('winAmount ===>', winAmount)
  // console.log('volumeAmount ===>', volumeAmount)

  return (
    <>
      <div className="relative min-h-screen overflow-hidden">
        <Navbar />

        <HeroBgImage className="absolute -top-28 right-0 w-full h-full object-cover" />
        <div
          ref={containerRef}
          className="mt-[60px] mb-10 mx-auto relative z-10 w-full px-4 md:max-w-6xl"
        >
          <div className="flex flex-col items-center justify-center gap-2 md:gap-2 md:max-w-6xl w-full mx-auto mb-10 sm:mb-16">
            <motion.div
              className="flex items-center gap-2"
              initial="hidden"
              animate={controls}
              variants={titleVariants}
            >
              <FireIcon
                className="transition-all duration-300 w-12 h-12"
                isActive={true}
              />
              <h1
                className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent text-center"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, #00FF85 0%, #00CCFF 100%)',
                }}
              >
                Hot Pairs
              </h1>
            </motion.div>
            <div className="flex flex-col items-center justify-center gap-2">
              <motion.h2
                className="text-3xl md:text-[2.75rem] font-bold text-white text-center leading-[1.3] md:leading-[1.2]"
                initial="hidden"
                animate={controls}
                variants={titleVariants}
              >
                Execute the Hottest High Market Cap / Low Liquidity Trades.
              </motion.h2>
              <motion.h2
                className="text-3xl md:text-[2.75rem] font-bold text-white text-center"
                initial="hidden"
                animate={controls}
                variants={titleVariants}
              >
                Stream with One Click.
              </motion.h2>
            </div>
          </div>

          {/* Cards section */}
          <motion.div
            initial="hidden"
            animate={controls}
            variants={sectionVariants}
            custom={0.2}
          >
            <TopPairsCarousel
              activeHotPair={activeHotPair}
              setActiveHotPair={handleActiveHotPair}
            />
          </motion.div>

          <motion.div
            ref={cardsRef}
            className="flex flex-col items-center gap-8 mt-24 md:mt-32"
            initial="hidden"
            animate={controls}
            variants={sectionVariants}
            custom={0}
          >
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <div className="w-full md:max-w-[25rem] md:min-w-[25rem]">
                <VolumeSection
                  amount={volumeAmount}
                  setAmount={handleVolumeAmountChange}
                  isLoading={volumeLoading}
                  inValidAmount={false}
                  pair={activeHotPair}
                  switchTokens={handleSwitchTokens}
                  clearActiveTokenPair={() => {
                    setVolumeAmount(0)
                    // setActiveHotPair(null)
                    // setWinAmount(0)
                    // setVolumeActive(false)
                    // setWinActive(false)
                    // setSelectedBaseToken(null)
                    // setSelectedOtherToken(null)
                  }}
                  active={volumeActive}
                  handleActive={() => {
                    setVolumeActive(true)
                    setWinActive(false)
                  }}
                  disabled={!activeHotPair}
                />
              </div>
              <div className="w-full md:max-w-[25rem] md:min-w-[25rem]">
                <WinSection
                  amount={winAmount}
                  setAmount={handleWinAmountChange}
                  isLoading={winLoading}
                  inValidAmount={false}
                  // active={winActive}
                  handleActive={() => {
                    setVolumeActive(false)
                    setWinActive(true)
                  }}
                  slippageSavingsUsd={slippageSavingsUsd}
                  active={false}
                  disabled={true}
                  // disabled={!activeHotPair}
                />
              </div>
            </div>
            <Button
              text="STREAM NOW"
              className="h-12 max-w-14 text-[#40f798]"
              disabled={!activeHotPair}
              onClick={handleMainStreamClick}
            />
          </motion.div>

          <motion.div
            initial="hidden"
            animate={controls}
            variants={sectionVariants}
            custom={0.4}
            className="mt-24 md:mt-28"
          >
            <TokenPairsSection
              selectedBaseToken={selectedBaseToken}
              selectedOtherToken={selectedOtherToken}
              setSelectedBaseToken={setSelectedBaseToken}
              setSelectedOtherToken={setSelectedOtherToken}
              clearAllSelectedTokens={clearAllSelectedTokens}
              clearBaseAndOtherTokens={() => {
                setSelectedBaseToken(null)
                setSelectedOtherToken(null)
              }}
              // triggerChangeOfTokens={(token: any, otherToken: any) => {
              //   if (
              //     token?.symbol?.toUpperCase() !==
              //       selectedBaseToken?.symbol?.toUpperCase() ||
              //     otherToken?.symbol?.toUpperCase() !==
              //       selectedOtherToken?.symbol?.toUpperCase()
              //   ) {
              //     setTriggerChangeOfActiveHotPair(true)
              //   }
              // }}
              handleActiveHotPair={handleActiveHotPair}
            />
          </motion.div>

          <motion.div
            initial="hidden"
            animate={controls}
            variants={sectionVariants}
            custom={0.4}
            className="mt-24 md:mt-36"
          >
            <PairsTable
              selectedTokenAddress={
                selectedBaseToken && selectedOtherToken
                  ? activeHotPair?.tokenAAddress
                  : ''
              }
            />
          </motion.div>
        </div>
      </div>
    </>
  )
}

export default HotPairs
