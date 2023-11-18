// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./libs/Ownable.sol";
import "./interfaces/IERC20.sol";
import "./libs/ReentrancyGuard.sol";
import "./interfaces/IERC20Upgradeable.sol";
import "./interfaces/IOneInch.sol";
import "./interfaces/IBeefyVault.sol";
import "./interfaces/IGammaHypervisor.sol";
import "./interfaces/ILoanExchanger.sol";

contract LoanExchanger is ILoanExchanger, Ownable, ReentrancyGuard {

    event SetManipulatorEvent(address _manipulator);

    IERC20 public borrowerPullToken;
    uint public borrowerPullId;
    IBeefyVault public beefyVault;
    IOneInch public oneInch;
    IERC20 public baseStableCoin;
    address private manipulator;

    constructor(
        IERC20 _borrowerPullToken,
        uint _borrowerPullId,
        IBeefyVault _beefyVault,
        IOneInch _oneInch,
        IERC20 _baseStableCoin,
        address _manipulator
    ) {
        borrowerPullToken = _borrowerPullToken;
        borrowerPullId = _borrowerPullId;
        beefyVault = _beefyVault;
        oneInch = _oneInch;
        baseStableCoin = _baseStableCoin;
        setManipulator(_manipulator);
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

    /// Exchange Moo tokens to initial crypto
    /// @param _amount uint            Beefy moo tokens
    /// @param _beefyVault IBeefyVault Beefy vault
    /// @return uint                   tokenA value
    /// @return uint                   tokenB value
    function exchangeMooToken(uint _amount, IBeefyVault _beefyVault) private returns (uint, uint) {
        require(_beefyVault.balanceOf(address(this)) >= _amount, "Exchanger: invalid vault tokens balance");
        require(_beefyVault.approve(address(_beefyVault), _amount), "Exchanger: approve beefy request failed");

        IERC20Upgradeable _gammaHypervisor = _beefyVault.want();
        _beefyVault.withdraw(_amount);

        address _myAddress = address(this);
        uint _gammaTokensAmount = _gammaHypervisor.balanceOf(_myAddress);
        require(_gammaHypervisor.approve(address(_gammaHypervisor), _gammaTokensAmount), "Exchanger: approve gamma request failed");

        uint256 _temp = 0;
        uint256[4] memory minWithdrawals = [_temp, _temp, _temp, _temp];
        return IGammaHypervisor(address(_gammaHypervisor)).withdraw(_gammaTokensAmount, _myAddress, _myAddress,minWithdrawals);
    }

    // Swap token
    /// @param _amount uint  Tokens to swap amount
    /// @param token IERC20  Token to swap
    /// @param pool uint     Swap pool
    /// @return uint         Swapped value
    function swapToken(uint _amount, IERC20 token, uint pool) private nonReentrant returns (uint) {
        require(token.balanceOf(address(this)) >= _amount, "Exchanger: invalid tokens balance");
        require(token.approve(address(oneInch), _amount), "Exchanger: approve 1inch request failed");
        uint[] memory pools = new uint[](1);
        pools[0] = pool;
        return oneInch.uniswapV3Swap(_amount, 0, pools);
    }

    /// Swap LP tokens
    function swapTokens() external onlyManipulator {
        uint lpValue = beefyVault.allowance(msg.sender, address(this));
        beefyVault.transferFrom(msg.sender, address(this), lpValue);

        (uint tokenA, ) = exchangeMooToken(lpValue, beefyVault);
        swapToken(tokenA, borrowerPullToken, borrowerPullId);

        uint stableValue = baseStableCoin.balanceOf(address(this));

//        baseStableCoin.transfer(msg.sender, stableValue);
        baseStableCoin.approve(msg.sender, stableValue);
    }

    /// Return price per share
    /// @return uint
    function getPricePerShare() external view returns(uint) {
        return beefyVault.getPricePerFullShare();
    }

    /// Withdraw coins to owner
    /// @param _target address  Target address
    /// @param _amount uint  Transfer amount
    function withdrawCoins(address _target, uint _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Exchanger: balance not enough");
        (bool success, ) = _target.call{value: _amount}("");
        require(success, "Exchanger: transfer failed");
    }

    /// Transfer tokens
    /// @param _token IERC20  Token address
    /// @param _target address  Destination address
    /// @param _amount uint  Transfer amount
    function withdrawTokens(IERC20 _token, address _target, uint _amount) external onlyOwner {
        require(_token.balanceOf(address(this)) >= _amount, "Exchanger: not enough tokens");
        require(_token.transfer(_target, _amount), "Exchanger: transfer request failed");
    }
}
