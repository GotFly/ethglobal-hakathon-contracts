// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./LoanCreditor.sol";

contract Loan is LoanCreditor {

    /// Constructor
    /// @param _baseCreditorsLPAmount uint
    /// @param _baseCreditorsStableAmount uint
    constructor(uint _baseCreditorsLPAmount, uint _baseCreditorsStableAmount)
    LoanCreditor(_baseCreditorsLPAmount, _baseCreditorsStableAmount)
    {}
}

