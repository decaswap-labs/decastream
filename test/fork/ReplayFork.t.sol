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
        vm.createSelectFork({ blockNumber: 23_698_241, urlOrAlias: "mainnet" });
    }

    function test_ReplayFork() public {
        address from = address(0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6);
        Core core = Core(0xDe054C37000a639d33b886df0E48B011c2092474);

        vm.prank(from);
        core.executeTrades(bytes32(0x96e50e0e17d065e8070c5511096fbb18939595495b63c76f2e97af7a5bf13155));
    }
}
