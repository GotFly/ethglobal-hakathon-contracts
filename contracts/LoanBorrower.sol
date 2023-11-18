// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./LoanCreditor.sol";
import "./LoanExchanger.sol";

abstract contract LoanBorrower is LoanCreditor {

    event SetBorrowerLPTokenEvent(address _tokenAddress);
    event SetCollateralFactorAmountEvent(uint _amount);
    event InitBorrowerLoanEvent(address _borrowerAddress, uint _lpAmount, uint _stableAmount);
    event CloseBorrowerLoanEvent(address _borrowerAddress, uint _lpAmount, uint _stableAmount);
    event InterestBorrowerLoanEvent(
        address _borrowerAddress,
        uint _borrowerLpAmount,
        uint _borrowerStableAmount,
        uint _creditorLpAmount,
        uint _creditorStableAmount
    );
    event SetLoanExchangerEvent(address _address);

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

    mapping(address => Borrower) public borrowers;
    address[] private borrowersList;
    uint private borrowerLPPool;
    IERC20 public borrowerLPToken;
    uint private collateralFactorAmount; // in percent, less than 100
    ILoanExchanger private loanExchanger;

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

    /// Return loan exchanger
    /// @return ILoanExchanger
    function getLoanExchanger() public view returns(ILoanExchanger) {
        return loanExchanger;
    }

    /// Set loan exchanger
    /// @param _exchangerAddress ILoanExchanger
    function setLoanExchanger(ILoanExchanger _exchangerAddress) external onlyOwner {
        loanExchanger = _exchangerAddress;
        emit SetLoanExchangerEvent(address(_exchangerAddress));
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

    /// Calculate borrower LP to stable
    /// @param _lpAmount uint
    /// @return uint
    function calcBorrowerLpToStable(uint _lpAmount) internal view returns(uint) {
        return _lpAmount * loanExchanger.getPricePerShare();
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

        // TODO: needs optimization
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

        // TODO: needs optimization
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
        uint currentLpPrice = loanExchanger.getPricePerShare();
        uint stableValue = borrowers[_borrowerAddress].lpBalanceLast * currentLpPrice;
        if (stableValue <= borrowers[_borrowerAddress].stableBalanceLast) {
            return 0;
        }

        uint res = (stableValue - borrowers[_borrowerAddress].stableBalanceLast) / currentLpPrice;

        return res;
    }

    /// Interest borrower loan
    /// @param _borrowerAddress address
    function interestBorrowerLoan(address _borrowerAddress) internal {
        uint fullBorrowerProfit = calcInterestBorrowerProfit(_borrowerAddress);
        if (fullBorrowerProfit == 0) {
            return;
        }

        uint creditorLpProfit = calcCreditorProfitInLP(fullBorrowerProfit);
        uint borrowerLpProfit = fullBorrowerProfit - creditorLpProfit;

        require(address(loanExchanger) != address(0), "LoanBorrower: exchanger is not set");
        require(borrowerLPToken.balanceOf(address(this)) >= creditorLpProfit, "LoanBorrower: LP balance not enough");
        borrowerLPToken.approve(address(loanExchanger), creditorLpProfit);
        //TODO: update this logic
        loanExchanger.swapTokens();
        uint exchangedStableBalance = getCreditorStableToken().allowance(address(loanExchanger), address(this));
        getCreditorStableToken().transferFrom(address(loanExchanger), address(this), exchangedStableBalance);

        borrowers[_borrowerAddress].lpBalanceLast -= creditorLpProfit;
        borrowers[_borrowerAddress].stableBalanceLast += exchangedStableBalance;
        borrowers[_borrowerAddress].blockNumberLast = block.number;

        emit InterestBorrowerLoanEvent(
            _borrowerAddress, borrowerLpProfit, exchangedStableBalance,
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
