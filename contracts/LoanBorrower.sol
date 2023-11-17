// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./LoanCreditor.sol";
import "hardhat/console.sol";

abstract contract LoanBorrower is LoanCreditor {

    event SetBorrowerLPTokenEvent(address _tokenAddress);
    event SetCollateralFactorAmountEvent(uint _amount);
    event SetBorrowersLPDataEvent(uint _baseBorrowersStableAmount);
    event InitBorrowerLoanEvent(address _borrowerAddress, uint _lpAmount, uint _stableAmount);
    event CloseBorrowerLoanEvent(address _borrowerAddress, uint _lpAmount, uint _stableAmount);

    struct Borrower {
        bool exists;
        bool hasLoan;
        uint lpBalanceInit;
        uint stableBalanceInit;
        uint blockNumberInit;
        uint lpBalanceCurrent;
        uint stableBalanceCurrent;
    }

    uint public baseBorrowersStableAmount;
    mapping(address => Borrower) public borrowers;
    uint private borrowerLPPool;
    IERC20 public borrowerLPToken;
    uint private collateralFactorAmount; // in percent, less than 100

    /// Constructor
    /// @param _borrowerLPToken uint
    /// @param _collateralFactorAmount uint
    /// @param _baseCreditorsLPAmount uint
    /// @param _baseCreditorsStableAmount uint
    constructor(IERC20 _borrowerLPToken, uint _collateralFactorAmount, uint _baseCreditorsLPAmount, uint _baseCreditorsStableAmount)
    LoanCreditor(_baseCreditorsLPAmount, _baseCreditorsStableAmount) {
        setBorrowerLPToken(_borrowerLPToken);
        setCollateralFactorAmount(_collateralFactorAmount);
    }

    /// Return collateral factor amount
    /// @return uint
    function getCollateralFactorAmount() public view returns(uint) {
        return collateralFactorAmount;
    }

    /// Return borrower data
    /// @param _borrowerAddress address
    /// @return Borrower
    function getBorrowerData(address _borrowerAddress) external view returns(Borrower memory) {
        return borrowers[_borrowerAddress];
    }

    /// Set borrower LP token
    /// @param _lpToken ILPERC20
    function setBorrowerLPToken(IERC20 _lpToken) public onlyOwner {
        borrowerLPToken = _lpToken;

        emit SetBorrowerLPTokenEvent(address(_lpToken));
    }

    /// Set collateral factor amount
    /// @param _amount uint
    function setCollateralFactorAmount(uint _amount) public onlyOwner {
        require(_amount < 100, "LoanBorrower: wrong collateral factor amount");
        collateralFactorAmount = _amount;

        emit SetCollateralFactorAmountEvent(_amount);
    }

    /// Set borrower LP data (method for deployment, not for production)
    /// @param _baseBorrowersStableAmount uint
    function setBorrowersLPData(uint _baseBorrowersStableAmount) public onlyOwner {
        baseBorrowersStableAmount = _baseBorrowersStableAmount;

        emit SetBorrowersLPDataEvent(_baseBorrowersStableAmount);
    }

    /// Calculate borrower loan stable amount (borrower take loan)
    /// @param _lpAmount uint
    /// @return uint
    function calcBorrowerLoanStableAmount(uint _lpAmount) internal view returns(uint) {
        uint baseAmount = _lpAmount * baseBorrowersStableAmount / borrowerLPToken.totalSupply();

        return baseAmount * collateralFactorAmount / 100;
    }

    /// Calculate borrower loan stable amount (borrower returns loan)
    /// @param _stableAmount uint
    /// @return uint
    function calcBorrowerLoanLPAmount(uint _stableAmount) internal view returns(uint) {
        //TODO: update this logic
        // uint baseAmount = _lpAmount * baseBorrowersLPAmount / baseBorrowersStableAmount;
        uint baseAmount = _stableAmount * borrowerLPToken.totalSupply() / baseBorrowersStableAmount;

        uint res = baseAmount * 100 / collateralFactorAmount;

        return res;
    }

    /// Init borrow loan
    /// @param _lpAmount uint
    function initBorrowerLoan(uint _lpAmount) external nonReentrant {
        address senderAddress = msg.sender;
        require(!borrowers[senderAddress].hasLoan, "LoanBorrower: borrower has loan already");

        address selfAddress = address(this);
        borrowers[senderAddress].exists = true;
        borrowers[senderAddress].hasLoan = true;

        require(_lpAmount <= borrowerLPToken.allowance(senderAddress, selfAddress), "LoanBorrower: not enough allowance");
        borrowerLPToken.transferFrom(senderAddress, selfAddress, _lpAmount);

        uint stableAmount = calcBorrowerLoanStableAmount(_lpAmount);
        createBorrowerLoan(senderAddress, stableAmount);

        borrowers[senderAddress].lpBalanceInit = _lpAmount;
        borrowers[senderAddress].stableBalanceInit = _lpAmount;
        borrowers[senderAddress].blockNumberInit = block.number;
        borrowers[senderAddress].lpBalanceCurrent = _lpAmount;
        borrowers[senderAddress].stableBalanceCurrent = _lpAmount;

        emit InitBorrowerLoanEvent(senderAddress, _lpAmount, stableAmount);
    }

    /// Close borrower loan
    /// @param _stableAmount uint
    function closeBorrowerLoan(uint _stableAmount) external nonReentrant {
        address senderAddress = msg.sender;
        require(borrowers[senderAddress].hasLoan, "LoanBorrower: loan not found");

        address selfAddress = address(this);
        borrowers[senderAddress].hasLoan = false;

        require(_stableAmount <= getCreditorStableToken().allowance(senderAddress, selfAddress), "LoanBorrower: not enough allowance");
        getCreditorStableToken().transferFrom(senderAddress, selfAddress, _stableAmount);

        uint lpAmount = calcBorrowerLoanLPAmount(_stableAmount);
        require(borrowerLPToken.balanceOf(address(this)) >= lpAmount, "LoanBorrower: LP balance is not enough");
        borrowerLPToken.transfer(senderAddress, lpAmount);

        borrowers[senderAddress].lpBalanceInit = 0;
        borrowers[senderAddress].stableBalanceInit = 0;
        borrowers[senderAddress].blockNumberInit = 0;
        borrowers[senderAddress].lpBalanceCurrent = 0;
        borrowers[senderAddress].stableBalanceCurrent = 0;

        emit CloseBorrowerLoanEvent(senderAddress, lpAmount, _stableAmount);
    }

    /// Liquidation borrower loan
    /// @param _borrowerAddress address
    function liquidBorrowerLoan(address _borrowerAddress) external nonReentrant {
        // TODO: add liquidation logic
    }
}
