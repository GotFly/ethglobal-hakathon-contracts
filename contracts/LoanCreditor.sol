// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ILPERC20.sol";

abstract contract LoanCreditor is Ownable, ReentrancyGuard {

    event SetCreditorStableTokenEvent(address _tokenAddress);
    event SetCreditorLPTokenEvent(address _tokenAddress);
    event AddCreditorLiquidityEvent(address _creditorAddress, uint _stableAmount, uint _lpAmount);
    event RemoveCreditorLiquidityEvent(address _creditorAddress, uint _stableAmount, uint _lpAmount);
    event AddCreditorLandingInterestEvent(uint _stableAmount);

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
    function getCreditorStablePool() public view returns(uint) {
        return creditorStablePool;
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
        require(stableAmount >= creditorStableToken.balanceOf(address(this)), "LoanCreditor: not enough liquidity");

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
}
