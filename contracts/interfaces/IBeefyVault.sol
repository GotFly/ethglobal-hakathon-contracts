// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./IERC20Upgradeable.sol";

interface IBeefyVault is IERC20Upgradeable {
    function withdraw(uint256) external;
    function withdrawAll() external;
    function getPricePerFullShare() external view returns (uint256);
    function upgradeStrat() external;
    function balance() external view returns (uint256);
    function want() external view returns (IERC20Upgradeable);
}
