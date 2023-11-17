// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./BaseLpToken.sol";

contract LoanCreditorLpTestToken is BaseLpToken {

    constructor(address _manipulator, uint _totalSupply) BaseLpToken(_manipulator, "LoanCreditorLpTestToken", "LCLTT") {
        _mint(msg.sender, _totalSupply * 10 ** decimals());
    }

    /// Return token decimals
    /// @return uint8
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}
