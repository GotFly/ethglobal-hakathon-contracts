// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../libs/ERC20.sol";

abstract contract BaseLpToken is ERC20 {

    address private manipulator;

    constructor(address _manipulator, string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        manipulator = _manipulator;
    }

    /// Only manipulator modifier
    modifier onlyManipulator {
        require(manipulator == msg.sender, "BaseLpToken: only manipulator");
        _;
    }

    /// Mint token
    /// @param _account address
    /// @param _amount uint256
    function mint(address _account, uint256 _amount) external onlyManipulator {
        _mint(_account, _amount);
    }

    /// Burn token
    /// @param _account address
    /// @param _amount uint256
    function burn(address _account, uint256 _amount) external onlyManipulator {
        _burn(_account, _amount);
    }

    /// Burn self tokens
    /// @param _amount uint256
    function selfBurn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }
}
