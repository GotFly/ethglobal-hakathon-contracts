// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.0;

import "./IERC20.sol";

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface ILPERC20 is IERC20 {

    /// Mint token
    /// @param _account address
    /// @param _amount uint256
    function mint(address _account, uint256 _amount) external;

    /// Burn token
    /// @param _account address
    /// @param _amount uint256
    function burn(address _account, uint256 _amount) external;
}
