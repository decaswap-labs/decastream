// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Core} from "../src/Core.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";
import {Executor} from "../src/Executor.sol";
import {Registry} from "../src/Registry.sol";
import {UniswapV2Fetcher} from "../src/adapters/UniswapV2Fetcher.sol";
import {SushiswapFetcher} from "../src/adapters/SushiswapFetcher.sol";
import {PancakeSwapFetcher} from "../src/adapters/PancakeSwapFetcher.sol";

/**
 * @title DeployBarebones
 * @notice Deploys the 1SLiquidity protocol with UniswapV2, Sushiswap, and PancakeSwap support
 * @dev This deployment includes only the core DEXs for initial mainnet launch. Additional DEXs
 *      can be added later via:
 *      1. Deploy additional fetchers (e.g., UniswapV3Fetcher, CurveFetcher, BalancerFetcher)
 *      2. Call StreamDaemon.registerDex()
 *      3. Configure Registry with additional router addresses
 * 
 * Architecture Benefits:
 * - StreamDaemon uses dynamic arrays and can work with any number of DEXs
 * - Registry supports dynamic DEX type registration
 * - Core contract is DEX-agnostic and will work with any DEXs registered
 * - No hard dependencies on specific DEX implementations
 */
contract DeployBarebones is Script {
    // =========================
    // Mainnet Addresses
    // =========================
    
    // DEX Factories
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    address constant PANCAKESWAP_FACTORY = 0x1097053Fd2ea711dad45caCcc45EfF7548fCB362; // PancakeSwap V2 factory
    
    // DEX Routers
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    address constant PANCAKESWAP_ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E; // PancakeSwap V2 router
    
    // =========================
    // Deployment Variables
    // =========================
    
    // Deployed contract addresses (will be populated during deployment)
    address public streamDaemon;
    address public executor;
    address public registry;
    address public core;
    
    // =========================
    // Configuration Constants
    // =========================
    
    // Fee configuration (basis points)
    uint16 constant INITIAL_STREAM_PROTOCOL_FEE_BPS = 20;    // 0.2%
    uint16 constant INITIAL_STREAM_BOT_FEE_BPS = 10;         // 0.1%
    uint16 constant INITIAL_INSTASETTLE_PROTOCOL_FEE_BPS = 30; // 0.3%
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying BARE BONES protocol to mainnet (UniswapV2, Sushiswap, PancakeSwap)");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // =========================
        // Step 1: Deploy DEX Fetchers
        // =========================
        console.log("\n=== Deploying DEX Fetchers (Barebones) ===");
        
        UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        console.log("UniswapV2Fetcher deployed at:", address(uniswapV2Fetcher));
        
        SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(SUSHISWAP_FACTORY);
        console.log("SushiswapFetcher deployed at:", address(sushiswapFetcher));
        
        PancakeSwapFetcher pancakeSwapFetcher = new PancakeSwapFetcher(PANCAKESWAP_ROUTER);
        console.log("PancakeSwapFetcher deployed at:", address(pancakeSwapFetcher));
        
        // =========================
        // Step 2: Deploy Core Infrastructure
        // =========================
        console.log("\n=== Deploying Core Infrastructure ===");
        
        // Create arrays for StreamDaemon (3 DEXs: UniswapV2, Sushiswap, PancakeSwap)
        address[] memory dexAddresses = new address[](3);
        dexAddresses[0] = address(uniswapV2Fetcher);
        dexAddresses[1] = address(sushiswapFetcher);
        dexAddresses[2] = address(pancakeSwapFetcher);
        
        address[] memory routerAddresses = new address[](3);
        routerAddresses[0] = UNISWAP_V2_ROUTER;
        routerAddresses[1] = SUSHISWAP_ROUTER;
        routerAddresses[2] = PANCAKESWAP_ROUTER;
        
        // Deploy StreamDaemon with 3 DEXs
        StreamDaemon streamDaemonContract = new StreamDaemon(dexAddresses, routerAddresses);
        streamDaemon = address(streamDaemonContract);
        console.log("StreamDaemon deployed at:", streamDaemon);
        
        // Deploy Executor
        Executor executorContract = new Executor();
        executor = address(executorContract);
        console.log("Executor deployed at:", executor);
        
        // Deploy Registry
        Registry registryContract = new Registry();
        registry = address(registryContract);
        console.log("Registry deployed at:", registry);
        
        // =========================
        // Step 3: Deploy Core Contract
        // =========================
        console.log("\n=== Deploying Core Contract ===");
        
        Core coreContract = new Core(streamDaemon, executor, registry);
        core = address(coreContract);
        console.log("Core deployed at:", core);
        
        // =========================
        // Step 4: Configure Registry
        // =========================
        console.log("\n=== Configuring Registry (Barebones) ===");
        
        registryContract.setRouter("UniswapV2", UNISWAP_V2_ROUTER);
        registryContract.setRouter("Sushiswap", SUSHISWAP_ROUTER);
        registryContract.setRouter("PancakeSwap", PANCAKESWAP_ROUTER);
        
        console.log("Registry configured with 3 DEX routers");
        
        // =========================
        // Step 5: Configure Core Fees
        // =========================
        console.log("\n=== Configuring Core Fees ===");
        
        coreContract.setStreamProtocolFeeBps(INITIAL_STREAM_PROTOCOL_FEE_BPS);
        coreContract.setStreamBotFeeBps(INITIAL_STREAM_BOT_FEE_BPS);
        coreContract.setInstasettleProtocolFeeBps(INITIAL_INSTASETTLE_PROTOCOL_FEE_BPS);
        
        console.log("Core fees configured:");
        console.log("  Stream Protocol Fee:", INITIAL_STREAM_PROTOCOL_FEE_BPS, "bps");
        console.log("  Stream Bot Fee:", INITIAL_STREAM_BOT_FEE_BPS, "bps");
        console.log("  Instasettle Protocol Fee:", INITIAL_INSTASETTLE_PROTOCOL_FEE_BPS, "bps");
        
        // =========================
        // Step 6: Verify Deployment
        // =========================
        console.log("\n=== Deployment Verification ===");
        
        // Verify StreamDaemon has the correct number of DEXs
        // require(StreamDaemon(streamDaemon).dexs.length == 3, "StreamDaemon should have 3 DEXs");
        // console.log("StreamDaemon has", StreamDaemon(streamDaemon).dexs.length, "DEXs registered");
        
        // Verify Registry has the correct routers
        require(registryContract.getRouter("UniswapV2") == UNISWAP_V2_ROUTER, "UniswapV2 router mismatch");
        require(registryContract.getRouter("Sushiswap") == SUSHISWAP_ROUTER, "Sushiswap router mismatch");
        require(registryContract.getRouter("PancakeSwap") == PANCAKESWAP_ROUTER, "PancakeSwap router mismatch");
        console.log("Registry has all 3 routers configured correctly");
        
        // Verify Core has correct dependencies
        require(address(coreContract.streamDaemon()) == streamDaemon, "Core StreamDaemon mismatch");
        require(address(coreContract.executor()) == executor, "Core Executor mismatch");
        require(address(coreContract.registry()) == registry, "Core Registry mismatch");
        console.log("Core has all dependencies configured correctly");
        
        vm.stopBroadcast();
        
        // =========================
        // Deployment Summary
        // =========================
        console.log("\nBARE BONES DEPLOYMENT COMPLETE!");
        console.log("=====================================");
        console.log("StreamDaemon:", streamDaemon);
        console.log("Executor:", executor);
        console.log("Registry:", registry);
        console.log("Core:", core);
        console.log("=====================================");
        console.log("DEXs Supported: UniswapV2, Sushiswap, PancakeSwap");
        console.log("Ready for mainnet trading!");
        console.log("To add more DEXs later:");
        console.log("1. Deploy additional fetchers");
        console.log("2. Call StreamDaemon.registerDex()");
        console.log("3. Configure Registry with new routers");
    }
    
    /**
     * @notice Helper function to verify deployment state
     * @dev Can be called after deployment to double-check everything is configured correctly
     */
    function verifyDeployment() external view {
        require(streamDaemon != address(0), "StreamDaemon not deployed");
        require(executor != address(0), "Executor not deployed");
        require(registry != address(0), "Registry not deployed");
        require(core != address(0), "Core not deployed");
        
        StreamDaemon streamDaemonContract = StreamDaemon(streamDaemon);
        Registry registryContract = Registry(registry);
        Core coreContract = Core(core);
        
        // Verify StreamDaemon
        // require(StreamDaemon(streamDaemon).dexs.length == 3, "Incorrect DEX count");
        
        // Verify Registry
        require(registryContract.getRouter("UniswapV2") != address(0), "UniswapV2 not configured");
        require(registryContract.getRouter("Sushiswap") != address(0), "Sushiswap not configured");
        require(registryContract.getRouter("PancakeSwap") != address(0), "PancakeSwap not configured");
        
        // Verify Core dependencies
        require(address(coreContract.streamDaemon()) == streamDaemon, "Core StreamDaemon mismatch");
        require(address(coreContract.executor()) == executor, "Core Executor mismatch");
        require(address(coreContract.registry()) == registry, "Core Registry mismatch");
        
        console.log("All deployment verification checks passed!");
    }
} 