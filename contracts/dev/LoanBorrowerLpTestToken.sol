// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./BaseLpToken.sol";

contract LoanBorrowerLpTestToken is BaseLpToken {

    constructor(address _manipulator, uint _totalSupply) BaseLpToken(_manipulator, "LoanBorrowerLpTestToken", "BCLTT") {
        _mint(msg.sender, _totalSupply * 10 ** decimals());
    }

    /// Return token decimals
    /// @return uint8
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}
