// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../libs/Ownable.sol";
import "../interfaces/IERC20.sol";
import "../libs/ReentrancyGuard.sol";
import "../interfaces/ILPERC20.sol";
import "../interfaces/ILoanExchanger.sol";

contract LoanExchangerTest is ILoanExchanger, Ownable, ReentrancyGuard {

    event SetManipulatorEvent(address _manipulator);
    event SetRateDataEvent(uint _baseLpValue, uint _baseStableValue);

    ILPERC20 public baseBorrowerLpToken;
    IERC20 public baseStableCoin;
    address private manipulator;
    // Params for calc exchange LP rate
    uint private baseLpValue;
    uint private baseStableValue;

    constructor(
        ILPERC20 _baseBorrowerLpToken,
        IERC20 _baseStableCoin,
        address _manipulator,
        uint _baseLpValue,
        uint _baseStableValue
    ) {
        baseBorrowerLpToken = _baseBorrowerLpToken;
        baseStableCoin = _baseStableCoin;
        setManipulator(_manipulator);
        setRateData(_baseLpValue, _baseStableValue);
    }

    receive() external payable {}
    fallback() external payable {}

    /// Only manipulator modifier
    modifier onlyManipulator {
        require(manipulator == msg.sender, "LoanExchanger: only manipulator");
        _;
    }

    /// Set manipulator
    /// @param _manipulatorAddress address
    function setManipulator(address _manipulatorAddress) public onlyOwner {
        manipulator = _manipulatorAddress;
        emit SetManipulatorEvent(_manipulatorAddress);
    }

    /// Set Rate data
    /// @param _baseLpValue uint
    /// @param _baseStableValue uint
    function setRateData(uint _baseLpValue, uint _baseStableValue) public onlyOwner {
        baseLpValue = _baseLpValue;
        baseStableValue = _baseStableValue;
        emit SetRateDataEvent(_baseLpValue, _baseStableValue);
    }

    /// Swap LP tokens (for tests)
    function swapTokens() external onlyManipulator {
        uint lpValue = baseBorrowerLpToken.allowance(msg.sender, address(this));
        baseBorrowerLpToken.transferFrom(msg.sender, address(this), lpValue);

        uint stableValue = lpValue * baseStableValue / baseLpValue;
        require(baseStableCoin.balanceOf(address(this)) >= stableValue, "LoanExchanger: stable balance is not enough");

//        baseStableCoin.transfer(msg.sender, stableValue);
        baseStableCoin.approve(msg.sender, stableValue);
        baseBorrowerLpToken.selfBurn(lpValue);
    }

    /// Return price per share
    /// @return uint
    function getPricePerShare() external view returns(uint) {
        return 1;
    }
}
