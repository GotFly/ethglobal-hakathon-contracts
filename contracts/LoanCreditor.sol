// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./libs/Ownable.sol";
import "./libs/ReentrancyGuard.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ILPERC20.sol";

abstract contract LoanCreditor is Ownable, ReentrancyGuard {

    event SetCreditorStableTokenEvent(address _tokenAddress);
    event SetCreditorLPTokenEvent(address _tokenAddress);
    event AddCreditorLiquidityEvent(address _creditorAddress, uint _stableAmount, uint _lpAmount);
    event RemoveCreditorLiquidityEvent(address _creditorAddress, uint _stableAmount, uint _lpAmount);
    event AddCreditorLandingInterestEvent(uint _stableAmount);
    event CreateBorrowerLoanEvent(address _borrowerAddress, uint _stableAmount);
    event RemoveBorrowerLoanEvent(address _borrowerAddress, uint _lpAmount);
    event SetCreditorProfitInPercentEvent(uint _value);

    struct Creditor {
        bool exists;
        uint lpBalance;
    }

    uint public baseCreditorsLPAmount;
    uint public baseCreditorsStableAmount;
    mapping(address => Creditor) public creditors;
    uint private creditorStablePool;
    IERC20 public creditorStableToken;
    ILPERC20 public creditorLPToken;
    uint public creditorProfitInPercent;

    // How to calculate LP token rate: creditorStablePool / creditorLPToken.totalSupply()

    /// Constructor
    /// @param _baseCreditorsLPAmount uint
    /// @param _baseCreditorsStableAmount uint
    constructor(uint _baseCreditorsLPAmount, uint _baseCreditorsStableAmount) {
        baseCreditorsLPAmount = _baseCreditorsLPAmount;
        baseCreditorsStableAmount = _baseCreditorsStableAmount;
    }

    /// Return creditor stable pool
    /// @return uint
    function getCreditorStablePool() external view returns(uint) {
        return creditorStablePool;
    }

    /// Return creditor stable token
    /// @return IERC20
    function getCreditorStableToken() public view returns(IERC20) {
        return creditorStableToken;
    }

    /// Return creditor profit in percent
    /// @return uint
    function getCreditorProfitInPercent() public view returns(uint) {
        return creditorProfitInPercent;
    }

    /// Return creditor data
    /// @param _creditorAddress address
    /// @return Creditor
    function getCreditorData(address _creditorAddress) external view returns(Creditor memory) {
        return creditors[_creditorAddress];
    }

    /// Return creditor available stable liquidity (check creditorStableToken.balanceOf(address(this)), if it less, so available balance is token balance)
    /// @param _creditorAddress address
    /// @return uint
    function getCreditorAvailableStableLiquidity(address _creditorAddress) external view returns(uint) {
        uint stableBalance = creditorStableToken.balanceOf(address(this));
        uint creditorStable = calcCreditorStableAmount(creditors[_creditorAddress].lpBalance);

        return stableBalance >= creditorStable ? creditorStable : stableBalance;
    }

    /// Return creditor available stable liquidity
    /// @param _creditorAddress address
    /// @return uint
    function getCreditorAvailableLpLiquidity(address _creditorAddress) external view returns(uint) {
        uint lpBalance = calcCreditorLPAmount(creditorStableToken.balanceOf(address(this)));
        uint creditorLp = creditors[_creditorAddress].lpBalance;

        return lpBalance >= creditorLp ? creditorLp : lpBalance;
    }

    /// Set creditor stable token
    /// @param _token IERC20
    function setCreditorStableToken(IERC20 _token) external onlyOwner {
        creditorStableToken = _token;
        emit SetCreditorStableTokenEvent(address(_token));
    }

    /// Set creditor LP token
    /// @param _token ILPERC20
    function setCreditorLPToken(ILPERC20 _token) external onlyOwner {
        creditorLPToken = _token;
        emit SetCreditorLPTokenEvent(address(_token));
    }

    /// Set creditor profit in percent
    /// @param _value uint
    function setCreditorProfitInPercent(uint _value) external onlyOwner {
        require(_value <= 100, "LoanCreditor: invalid profit percent value");
        creditorProfitInPercent = _value;
        emit SetCreditorProfitInPercentEvent(_value);
    }

    /// Calculate creditor LP amount
    /// @param _stableAmount uint
    /// @return uint
    function calcCreditorLPAmount(uint _stableAmount) private view returns(uint) {
        if (creditorStablePool <= 0) {
            return _stableAmount * baseCreditorsLPAmount / baseCreditorsStableAmount;
        }

        return _stableAmount * creditorLPToken.totalSupply() / creditorStablePool;
    }

    /// Calculate creditor stable amount
    /// @param _lpAmount uint
    /// @return uint
    function calcCreditorStableAmount(uint _lpAmount) private view returns(uint) {
        if (creditorStablePool <= 0) { // its cant be, but we check it
            return _lpAmount * baseCreditorsStableAmount / baseCreditorsLPAmount;
        }

        return _lpAmount * creditorStablePool / creditorLPToken.totalSupply();
    }

    /// Add creditor liquidity
    /// @param _stableAmount uint
    function addCreditorLiquidity(uint _stableAmount) external nonReentrant {
        address selfAddress = address(this);
        address senderAddress = msg.sender;

        uint totalAllow = creditorStableToken.allowance(senderAddress, selfAddress);
        require(totalAllow >= _stableAmount, "LoanCreditor: not enough allowance");

        creditorStableToken.transferFrom(senderAddress, selfAddress, _stableAmount);

        uint lpAmount = calcCreditorLPAmount(_stableAmount);

        creditors[senderAddress].exists = true;
        creditors[senderAddress].lpBalance += lpAmount;
        creditorStablePool += _stableAmount;

        creditorLPToken.mint(senderAddress, lpAmount);

        emit AddCreditorLiquidityEvent(senderAddress, _stableAmount, lpAmount);
    }

    /// Remove creditor liquidity (withdraw liquidity)
    /// @param _lpAmount uint
    function removeCreditorLiquidity(uint _lpAmount) external nonReentrant {
        address selfAddress = address(this);
        address senderAddress = msg.sender;

        require(
            _lpAmount <= creditors[senderAddress].lpBalance && _lpAmount <= creditorLPToken.balanceOf(senderAddress),
            "LoanCreditor: not enough lp tokens"
        );
        require(_lpAmount <= creditorLPToken.allowance(senderAddress, selfAddress), "LoanCreditor: not enough allowance"); // we may not do allowance, but we do it

        uint stableAmount = calcCreditorStableAmount(_lpAmount);
        require(creditorStableToken.balanceOf(address(this)) >= stableAmount, "LoanCreditor: not enough liquidity");

        creditors[senderAddress].lpBalance -= _lpAmount;
        creditorStablePool -= stableAmount;

        creditorStableToken.transfer(senderAddress, stableAmount);
        creditorLPToken.burn(senderAddress, _lpAmount);

        emit RemoveCreditorLiquidityEvent(senderAddress, stableAmount, _lpAmount);
    }

    /// Add creditor lending interest
    /// @param _stableAmount uint
    function addCreditorLendingInterest(uint _stableAmount) internal onlyOwner {
        creditorStablePool += _stableAmount;

        emit AddCreditorLandingInterestEvent(_stableAmount);
    }

    /// Create borrower loan
    /// @param _borrowerAddress address
    /// @param _stableAmount uint
    function createBorrowerLoan(address _borrowerAddress, uint _stableAmount) internal {
        require(creditorStablePool >= _stableAmount, "LoanCreditor: stable pool is not enough");
        require(creditorStableToken.balanceOf(address(this)) >= _stableAmount, "LoanCreditor: stable balance is not enough");

        creditorStableToken.transfer(_borrowerAddress, _stableAmount);

        emit CreateBorrowerLoanEvent(_borrowerAddress, _stableAmount);
    }

    /// ********************
    /// Liquid profit logic
    /// ********************

    /// Calculate creditor profit in LP
    /// @param _fullProfitInLp uint
    /// @return uint
    function calcCreditorProfitInLP(uint _fullProfitInLp) internal view returns(uint) {
        return _fullProfitInLp * creditorProfitInPercent / 100;
    }

    /// Charge creditor profit
    /// @param _lpAmount uint
    function chargeCreditorProfit(uint _lpAmount) internal {
        //TODO: add charging creditor profit
    }
}

