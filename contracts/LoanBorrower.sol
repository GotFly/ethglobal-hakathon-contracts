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
    event InterestBorrowerLoanEvent(
        address _borrowerAddress,
        uint _borrowerLpAmount,
        uint _borrowerStableAmount,
        uint _creditorLpAmount,
        uint _creditorStableAmount
    );

    struct Borrower {
        bool exists;
        bool hasLoan;
        uint lpBalanceInit;
        uint stableBalanceInit;
        uint blockNumberInit;
        uint lpBalanceLast;
        uint stableBalanceLast;
        uint blockNumberLast;
        uint arrayIndex;
    }

    uint public baseBorrowersStableAmount;
    mapping(address => Borrower) public borrowers;
    address[] private borrowersList;
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
    function getCollateralFactorAmount() external view returns(uint) {
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
    function setBorrowersLPData(uint _baseBorrowersStableAmount) external onlyOwner {
        baseBorrowersStableAmount = _baseBorrowersStableAmount;

        emit SetBorrowersLPDataEvent(_baseBorrowersStableAmount);
    }

    /// Calculate borrower LP to stable
    /// @param _lpAmount uint
    /// @return uint
    function calcBorrowerLpToStable(uint _lpAmount) internal view returns(uint) {
        return _lpAmount * baseBorrowersStableAmount / borrowerLPToken.totalSupply();
    }

    /// Calculate borrower loan stable amount (borrower take loan)
    /// @param _lpAmount uint
    /// @return uint
    function calcBorrowerLoanStableAmount(uint _lpAmount) internal view returns(uint) {
        uint baseAmount = calcBorrowerLpToStable(_lpAmount);

        return baseAmount * collateralFactorAmount / 100;
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

        borrowersList.push(senderAddress);

        borrowers[senderAddress].lpBalanceInit = _lpAmount;
        borrowers[senderAddress].stableBalanceInit = stableAmount;
        borrowers[senderAddress].blockNumberInit = block.number;
        borrowers[senderAddress].lpBalanceLast = _lpAmount;
        borrowers[senderAddress].stableBalanceLast = stableAmount;
        borrowers[senderAddress].blockNumberLast = block.number;
        borrowers[senderAddress].arrayIndex = borrowersList.length - 1;

        emit InitBorrowerLoanEvent(senderAddress, _lpAmount, stableAmount);
    }

    /// Close borrower loan
    function closeBorrowerLoan() external nonReentrant {
        address senderAddress = msg.sender;
        require(borrowers[senderAddress].hasLoan, "LoanBorrower: loan not found");

        address selfAddress = address(this);
        borrowers[senderAddress].hasLoan = false;
        uint stableAmount = borrowers[senderAddress].stableBalanceLast;

        require(getCreditorStableToken().allowance(senderAddress, selfAddress) >= stableAmount, "LoanBorrower: not enough allowance");
        getCreditorStableToken().transferFrom(senderAddress, selfAddress, stableAmount);

        uint lpAmount = borrowers[senderAddress].lpBalanceLast;
        require(borrowerLPToken.balanceOf(address(this)) >= lpAmount, "LoanBorrower: LP balance is not enough");
        borrowerLPToken.transfer(senderAddress, lpAmount);

        borrowers[senderAddress].lpBalanceInit = 0;
        borrowers[senderAddress].stableBalanceInit = 0;
        borrowers[senderAddress].blockNumberInit = 0;
        borrowers[senderAddress].lpBalanceLast = 0;
        borrowers[senderAddress].stableBalanceLast = 0;
        borrowers[senderAddress].blockNumberLast = 0;
        borrowers[senderAddress].arrayIndex = 0;

        borrowersList[borrowers[senderAddress].arrayIndex] = address(0); // crunch but doesnt matter

        emit CloseBorrowerLoanEvent(senderAddress, lpAmount, stableAmount);
    }

    /// ********************
    /// Liquid profit logic
    /// ********************

    /// Calculate interest borrower profit (hardcode, bun for now its doesnt matter)
    /// @param _borrowerAddress address
    /// @return uint
    function calcInterestBorrowerProfit(address _borrowerAddress) internal view returns(uint) {
        //TODO: update calculation borrower profit logic
        uint borrowerBlocksDif = block.number - borrowers[_borrowerAddress].blockNumberLast;
        if (borrowerBlocksDif == 0) {
            return 0;
        }

        uint percentByBlockValue = 1;
        uint percentByBlockMultiply = 10000;

        return borrowers[_borrowerAddress].lpBalanceInit * percentByBlockValue / percentByBlockMultiply;
    }

    /// Interest borrower loan
    /// @param _borrowerAddress address
    function interestBorrowerLoan(address _borrowerAddress) internal nonReentrant {
        uint fullBorrowerProfit = calcInterestBorrowerProfit(_borrowerAddress);
        if (fullBorrowerProfit == 0) {
            return;
        }

        uint creditorLpProfit = calcCreditorProfitInLP(fullBorrowerProfit);
        uint borrowerLpProfit = fullBorrowerProfit - creditorLpProfit;
        uint borrowerStableProfit = calcBorrowerLpToStable(borrowerLpProfit);

        chargeCreditorProfit(creditorLpProfit);

        borrowers[_borrowerAddress].lpBalanceLast = borrowerLpProfit;
        borrowers[_borrowerAddress].lpBalanceLast = borrowerStableProfit;
        borrowers[_borrowerAddress].blockNumberLast = block.number;

        emit InterestBorrowerLoanEvent(
            _borrowerAddress, borrowerLpProfit, borrowerStableProfit,
            creditorLpProfit, calcBorrowerLpToStable(creditorLpProfit)
        );
    }

    /// Interest deposit profit
    function interestDepositProfit() external nonReentrant onlyOwner {
        for (uint i = 0; i < borrowersList.length; i++) {
            address currentAddress = borrowersList[i];
            if (currentAddress == address(0) || !borrowers[currentAddress].exists || !borrowers[currentAddress].hasLoan) {
                continue;
            }

            interestBorrowerLoan(currentAddress);
        }
    }
}
