// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { console } from "forge-std/console.sol";
import { Deploys } from "test/shared/Deploys.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { MockERC20 } from "test/mock/MockERC20.sol";

contract SweetSpotAlgoTest is Deploys {
    MockERC20 tokenIn;
    MockERC20 tokenOut;

    function setUp() public override {
        super.setUp();

        console.log("executor", address(executor));
        console.log("streamDaemon", address(streamDaemon));
        console.log("registry", address(registry));
        console.log("core", address(core));

        // Deploy mock tokens with different decimals
        tokenIn = new MockERC20("Token In", "TKI", 18);
        tokenOut = new MockERC20("Token Out", "TKO", 18);
    }

    function test_SweetSpotAlgo_NormalCase() public {
        // Setup: 1M tokens in reserves, 100k volume
        uint256 reserveIn = 500_000_000 * 10 ** 18;
        uint256 reserveOut = 500_000 * 10 ** 18;
        uint256 volume = 4_000_000 * 10 ** 18; // 100k tokens
        uint256 effectiveGas = 1; // $1 gas

        uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), volume, reserveIn, reserveOut, effectiveGas
        );

        // Sweet spot should be between 4 and 500
        assertTrue(sweetSpot >= 4 && sweetSpot <= 500, "Sweet spot out of bounds");
    }

    function test_SweetSpotAlgo_MinimumSweetSpot() public {
        // Setup: Very small reserves and volume to test minimum sweet spot
        uint256 reserveIn = 100 * 10 ** 18; // 100 tokens
        uint256 reserveOut = 100 * 10 ** 18; // 100 tokens
        uint256 volume = 1 * 10 ** 18; // 1 token
        uint256 effectiveGas = 1; // $1 gas

        uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), volume, reserveIn, reserveOut, effectiveGas
        );

        assertEq(sweetSpot, 4, "Should return minimum sweet spot of 4");
    }

    function test_SweetSpotAlgo_MaximumSweetSpot() public {
        // Setup: Very large reserves and volume to test maximum sweet spot
        uint256 reserveIn = 1_000_000_000 * 10 ** 18; // 1B tokens
        uint256 reserveOut = 1_000_000_000 * 10 ** 18; // 1B tokens
        uint256 volume = 1_000_000 * 10 ** 18; // 1M tokens
        uint256 effectiveGas = 1; // $1 gas

        uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), volume, reserveIn, reserveOut, effectiveGas
        );

        assertEq(sweetSpot, 500, "Should return maximum sweet spot of 500");
    }

    function test_SweetSpotAlgo_RevertOnZeroReserves() public {
        uint256 volume = 100_000 * 10 ** 18;
        uint256 effectiveGas = 1;

        vm.expectRevert("No reserves or appropriate gas estimation");
        streamDaemon._sweetSpotAlgo(
            address(tokenIn),
            address(tokenOut),
            volume,
            0, // zero reserveIn
            1_000_000 * 10 ** 6,
            effectiveGas
        );
    }

    function test_SweetSpotAlgo_RevertOnZeroGas() public {
        uint256 reserveIn = 1_000_000 * 10 ** 18;
        uint256 reserveOut = 1_000_000 * 10 ** 6;
        uint256 volume = 100_000 * 10 ** 18;

        vm.expectRevert("No reserves or appropriate gas estimation");
        streamDaemon._sweetSpotAlgo(
            address(tokenIn),
            address(tokenOut),
            volume,
            reserveIn,
            reserveOut,
            0 // zero effectiveGas
        );
    }
}
