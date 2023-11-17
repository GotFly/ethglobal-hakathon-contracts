// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../libs/ERC20.sol";

contract LoanCreditorStableTestToken is ERC20 {

    constructor(uint _totalSupply) ERC20("LoanCreditorStableTestToken", "LCSTT") {
        _mint(msg.sender, _totalSupply * 10 ** decimals());
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}
