// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface ILoanExchanger {

    /// Swap tokens
    function swapTokens() external;

    /// Return price per share
    /// @return uint
    function getPricePerShare() external view returns(uint);
}
