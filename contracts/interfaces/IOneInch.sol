// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IOneInch {
    function uniswapV3Swap(
        uint256 amount,
        uint256 minReturn,
        uint256[] calldata pools
    ) external returns (uint256 returnAmount);
}
