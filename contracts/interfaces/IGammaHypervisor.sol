// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./IERC20Upgradeable.sol";

interface IGammaHypervisor is IERC20Upgradeable {
    function withdraw(
        uint256,
        address,
        address,
        uint256[4] memory
    ) external returns (uint256, uint256);
}
