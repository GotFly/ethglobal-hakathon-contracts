// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./LoanBorrower.sol";

contract Loan is LoanBorrower {

    /// Constructor
    /// @param _borrowerLPToken uint
    /// @param _collateralFactorAmount uint
    /// @param _baseCreditorsLPAmount uint
    /// @param _baseCreditorsStableAmount uint
    constructor(ILPERC20 _borrowerLPToken, uint _collateralFactorAmount, uint _baseCreditorsLPAmount, uint _baseCreditorsStableAmount)
    LoanBorrower(_borrowerLPToken, _collateralFactorAmount, _baseCreditorsLPAmount, _baseCreditorsStableAmount)
    {}

    function interestDepositProfit() external onlyOwner {
        // TODO: make creditors deposit profit logic
    }
}

