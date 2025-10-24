// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { Script, console } from "forge-std/Script.sol";
import { UniswapV2Fetcher } from "src/adapters/UniswapV2Fetcher.sol";
import { UniswapV3Fetcher } from "src/adapters/UniswapV3Fetcher.sol";
import { SushiswapFetcher } from "src/adapters/SushiswapFetcher.sol";
import { CurveFetcher } from "src/adapters/CurveFetcher.sol";
import { BalancerV2Fetcher } from "src/adapters/BalancerV2Fetcher.sol";
import { BalancerV2PoolRegistry } from "src/adapters/BalancerV2PoolRegistry.sol";
import { MockFetcher1, MockFetcher2 } from "test/mock/MockFetcher.sol";
import { CurveMetaFetcher } from "src/adapters/CurveMetaFetcher.sol";

contract HelperConfig is Script {
    struct DexTypeRouter {
        string dexType;
        address router;
    }

    DexTypeRouter[] public activeDexTypesRouters;
    address[] public activeDexes;
    address[] public activeRouters;
    address public owner = makeAddr("owner");
    BalancerV2PoolRegistry public balancerV2PoolRegistry;

    constructor() {
        if (block.chainid == 1) {
            console.log("Deploying on Mainnet");
            //Registry.sol
            address UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
            address UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
            address SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
            address BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
            address curveMetaRegistry = 0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC;

            UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f); // UniswapV2

            // UniswapV3 with different fee tiers
            UniswapV3Fetcher uniswapV3Fetcher500 = new UniswapV3Fetcher(0x1F98431c8aD98523631AE4a59f267346ea31F984, 500); // UniswapV3
                // 0.05%
            UniswapV3Fetcher uniswapV3Fetcher3000 =
                new UniswapV3Fetcher(0x1F98431c8aD98523631AE4a59f267346ea31F984, 3000); // UniswapV3 0.3%
            UniswapV3Fetcher uniswapV3Fetcher10000 =
                new UniswapV3Fetcher(0x1F98431c8aD98523631AE4a59f267346ea31F984, 10_000); // UniswapV3 1%

            SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac); // Sushiswap
            balancerV2PoolRegistry = new BalancerV2PoolRegistry(owner);
            BalancerV2Fetcher balancerV2Fetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(balancerV2PoolRegistry));
            CurveMetaFetcher curveFetcher = new CurveMetaFetcher(curveMetaRegistry);

            activeDexTypesRouters.push(DexTypeRouter({ dexType: "UniswapV2", router: UNISWAP_V2_ROUTER }));
            activeDexTypesRouters.push(DexTypeRouter({ dexType: "UniswapV3", router: UNISWAP_V3_ROUTER }));
            activeDexTypesRouters.push(DexTypeRouter({ dexType: "Sushiswap", router: SUSHISWAP_ROUTER }));
            activeDexTypesRouters.push(DexTypeRouter({ dexType: "CurveMeta", router: address(curveFetcher) }));
            activeDexTypesRouters.push(DexTypeRouter({ dexType: "BalancerV2", router: address(balancerV2Fetcher) }));

            // StreamDaemon.sol
            activeDexes.push(address(uniswapV2Fetcher));
            activeDexes.push(address(uniswapV3Fetcher500));
            activeDexes.push(address(uniswapV3Fetcher3000));
            activeDexes.push(address(uniswapV3Fetcher10000));
            activeDexes.push(address(sushiswapFetcher));
            activeDexes.push(address(curveFetcher));
            activeDexes.push(address(balancerV2Fetcher));

            activeRouters.push(UNISWAP_V2_ROUTER);
            activeRouters.push(UNISWAP_V3_ROUTER); // for 500 fee tier
            activeRouters.push(UNISWAP_V3_ROUTER); // for 3000 fee tier
            activeRouters.push(UNISWAP_V3_ROUTER); // for 10000 fee tier
            activeRouters.push(SUSHISWAP_ROUTER);
            activeRouters.push(address(curveFetcher));
            activeRouters.push(address(balancerV2Fetcher));
        } else if (block.chainid == 31_337) {
            console.log("Deploying on anvil");
            address router1 = address(0x0000000000000000000000000000000000000001);
            address router2 = address(0x0000000000000000000000000000000000000002);

            activeDexTypesRouters.push(DexTypeRouter({ dexType: "Mock1", router: router1 }));
            activeDexTypesRouters.push(DexTypeRouter({ dexType: "Mock2", router: router2 }));

            MockFetcher1 mockFetcher1 = new MockFetcher1();
            MockFetcher2 mockFetcher2 = new MockFetcher2();

            // StreamDaemon.sol
            activeDexes.push(address(mockFetcher1));
            activeDexes.push(address(mockFetcher2));

            activeRouters.push(router1);
            activeRouters.push(router2);
        } else {
            revert("Unsupported network");
        }
    }

    function getActiveDexTypesRouters() public view returns (DexTypeRouter[] memory) {
        return activeDexTypesRouters;
    }

    function getActiveDexes() public view returns (address[] memory) {
        return activeDexes;
    }

    function getActiveRouters() public view returns (address[] memory) {
        return activeRouters;
    }

    function getBalancerV2PoolRegistry() public view returns (address) {
        return address(balancerV2PoolRegistry);
    }

    function getOwner() public view returns (address) {
        return owner;
    }
}
