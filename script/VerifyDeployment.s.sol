// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Core} from "../src/Core.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";
import {Executor} from "../src/Executor.sol";
import {Registry} from "../src/Registry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VerifyDeployment is Script {
    // Mainnet token addresses
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Deployed contract addresses (set these after deployment)
    address public coreAddress;
    address public streamDaemonAddress;
    address public executorAddress;
    address public registryAddress;
    
    function run() external {
        // Load addresses from environment or set manually
        coreAddress = vm.envAddress("CORE_ADDRESS");
        streamDaemonAddress = vm.envAddress("STREAM_DAEMON_ADDRESS");
        executorAddress = vm.envAddress("EXECUTOR_ADDRESS");
        registryAddress = vm.envAddress("REGISTRY_ADDRESS");
        
        console.log("=== Deployment Verification ===");
        console.log("Core:", coreAddress);
        console.log("StreamDaemon:", streamDaemonAddress);
        console.log("Executor:", executorAddress);
        console.log("Registry:", registryAddress);
        
        // Verify contracts exist
        verifyContractAddresses();
        
        // Test basic functionality
        testBasicFunctionality();
        
        // Test fee configuration
        testFeeConfiguration();
        
        // Test DEX integration
        testDexIntegration();
        
        console.log("\n=== Verification Complete ===");
        console.log("All tests passed! Deployment is ready for use.");
    }
    
    function verifyContractAddresses() internal view {
        console.log("\n--- Verifying Contract Addresses ---");
        
        // Check that contracts exist at specified addresses
        uint256 coreCodeSize = coreAddress.code.length;
        uint256 streamDaemonCodeSize = streamDaemonAddress.code.length;
        uint256 executorCodeSize = executorAddress.code.length;
        uint256 registryCodeSize = registryAddress.code.length;
        
        require(coreCodeSize > 0, "Core contract not found at address");
        require(streamDaemonCodeSize > 0, "StreamDaemon contract not found at address");
        require(executorCodeSize > 0, "Executor contract not found at address");
        require(registryCodeSize > 0, "Registry contract not found at address");
        
        console.log("OK All contracts found at specified addresses");
        console.log("  Core code size:", coreCodeSize, "bytes");
        console.log("  StreamDaemon code size:", streamDaemonCodeSize, "bytes");
        console.log("  Executor code size:", executorCodeSize, "bytes");
        console.log("  Registry code size:", registryCodeSize, "bytes");
    }
    
    function testBasicFunctionality() internal view {
        console.log("\n--- Testing Basic Functionality ---");
        
        Core core = Core(coreAddress);
        StreamDaemon streamDaemon = StreamDaemon(streamDaemonAddress);
        Executor executor = Executor(executorAddress);
        Registry registry = Registry(registryAddress);
        
        // Test Core contract configuration
        address coreStreamDaemon = address(core.streamDaemon());
        address coreExecutor = address(core.executor());
        address coreRegistry = address(core.registry());
        
        require(coreStreamDaemon == streamDaemonAddress, "Core StreamDaemon address mismatch");
        require(coreExecutor == executorAddress, "Core Executor address mismatch");
        require(coreRegistry == registryAddress, "Core Registry address mismatch");
        
        console.log("OK Core contract dependencies correctly configured");
        
        // Test fee configuration
        uint16 streamProtocolFee = core.streamProtocolFeeBps();
        uint16 streamBotFee = core.streamBotFeeBps();
        uint16 instasettleProtocolFee = core.instasettleProtocolFeeBps();
        
        require(streamProtocolFee > 0, "Stream protocol fee not set");
        require(streamBotFee > 0, "Stream bot fee not set");
        require(instasettleProtocolFee > 0, "Instasettle protocol fee not set");
        
        console.log("OK Fee configuration verified:");
        console.log("  Stream Protocol Fee:", streamProtocolFee, "bps");
        console.log("  Stream Bot Fee:", streamBotFee, "bps");
        console.log("  Instasettle Protocol Fee:", instasettleProtocolFee, "bps");
    }
    
    function testFeeConfiguration() internal view {
        console.log("\n--- Testing Fee Configuration ---");
        
        Core core = Core(coreAddress);
        
        // Test fee constants
        uint16 maxBps = core.MAX_BPS();
        uint16 maxFeeCapBps = core.MAX_FEE_CAP_BPS();
        
        require(maxBps == 10000, "MAX_BPS should be 10000");
        require(maxFeeCapBps == 100, "MAX_FEE_CAP_BPS should be 100");
        
        console.log("OK Fee constants correctly set");
        console.log("  MAX_BPS:", maxBps);
        console.log("  MAX_FEE_CAP_BPS:", maxFeeCapBps);
        
        // Test that current fees are within bounds
        uint16 streamProtocolFee = core.streamProtocolFeeBps();
        uint16 streamBotFee = core.streamBotFeeBps();
        uint16 instasettleProtocolFee = core.instasettleProtocolFeeBps();
        
        require(streamProtocolFee <= maxFeeCapBps, "Stream protocol fee exceeds cap");
        require(streamBotFee <= maxFeeCapBps, "Stream bot fee exceeds cap");
        require(instasettleProtocolFee <= maxFeeCapBps, "Instasettle protocol fee exceeds cap");
        
        console.log("OK All fees within acceptable bounds");
    }
    
    function testDexIntegration() internal view {
        console.log("\n--- Testing DEX Integration ---");
        
        StreamDaemon streamDaemon = StreamDaemon(streamDaemonAddress);
        Registry registry = Registry(registryAddress);
        
        // Test that StreamDaemon can find reserves for common pairs
        console.log("Testing WETH/USDC pair...");
        (address bestDex, uint256 maxReserveIn, uint256 maxReserveOut) = 
            streamDaemon.findHighestReservesForTokenPair(WETH, USDC);
        
        require(bestDex != address(0), "No DEX found for WETH/USDC");
        require(maxReserveIn > 0, "No reserves found for WETH/USDC");
        require(maxReserveOut > 0, "No reserves found for WETH/USDC");
        
        console.log("OK WETH/USDC reserves found:");
        console.log("  Best DEX:", bestDex);
        console.log("  Max Reserve In:", maxReserveIn);
        console.log("  Max Reserve Out:", maxReserveOut);
        
        // Test sweet spot calculation
        console.log("Testing sweet spot calculation...");
        uint256 testVolume = 1000 * 1e18; // 1000 WETH
        (uint256 sweetSpot, address sweetSpotDex, address router) = 
            streamDaemon.evaluateSweetSpotAndDex(WETH, USDC, testVolume, 0, false);
        
        require(sweetSpot > 0, "Sweet spot calculation failed");
        require(sweetSpotDex != address(0), "Sweet spot DEX not found");
        require(router != address(0), "Sweet spot router not found");
        
        console.log("OK Sweet spot calculation working:");
        console.log("  Sweet Spot:", sweetSpot);
        console.log("  Best DEX:", sweetSpotDex);
        console.log("  Router:", router);
        
        // Test registry router mapping
        console.log("Testing registry router mapping...");
        address uniswapV2Router = registry.getRouter("UniswapV2");
        address uniswapV3Router = registry.getRouter("UniswapV3");
        address sushiswapRouter = registry.getRouter("Sushiswap");
        
        require(uniswapV2Router != address(0), "UniswapV2 router not set in registry");
        require(uniswapV3Router != address(0), "UniswapV3 router not set in registry");
        require(sushiswapRouter != address(0), "Sushiswap router not set in registry");
        
        console.log("OK Registry router mapping verified");
    }
    
    // Helper function to test with a specific deployer
    function testWithDeployer(uint256 deployerPrivateKey) external {
        address deployer = vm.addr(deployerPrivateKey);
        console.log("Testing with deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Test owner-only functions
        Core core = Core(coreAddress);
        
        // Test fee update (should succeed for owner)
        uint16 newFee = 15; // 15 bps
        core.setStreamProtocolFeeBps(newFee);
        
        require(core.streamProtocolFeeBps() == newFee, "Fee update failed");
        console.log("OK Owner can update fees");
        
        // Reset to original fee
        core.setStreamProtocolFeeBps(10);
        
        vm.stopBroadcast();
    }
} 