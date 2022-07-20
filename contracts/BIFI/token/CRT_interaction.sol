// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "hardhat/console.sol";

contract CRTInteraction is Ownable{
    using SafeMath for uint256;

    address public CRTaddress;
    constructor(address _CRTadd) public{
        CRTaddress = _CRTadd;
    }

    function _reward(address to, uint256 amount) private{
        IERC20 tokenCRT = IERC20(CRTaddress);
        tokenCRT.transfer(to, amount);
    }
    fallback () external payable {
    }
    receive() external payable {
        address recipient = msg.sender;
        uint256 amount = msg.value.mul(10);
        console.log("Recipient:", recipient);
        console.log("Amount:", amount);
        _reward(recipient, amount);

    }
}