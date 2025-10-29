// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { Fork_Test } from "test/fork/Fork.t.sol";
import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { Config } from "../../config/Config.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IUniversalDexInterface } from "src/interfaces/IUniversalDexInterface.sol";
import { Core } from "src/Core.sol";

import "forge-std/console.sol";

contract ReplayForkTest is Test {
    function setUp() public virtual {
        vm.createSelectFork({ blockNumber: 23_647_628, urlOrAlias: "mainnet" });
    }

    function test_ReplayFork() public {
        address from = address(0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6);
        Core core = Core(0x3875b8b82E58733C1667224eB8bF5f449d7dbB74);

        vm.prank(from);
        core.executeStream(24);
    }
}
