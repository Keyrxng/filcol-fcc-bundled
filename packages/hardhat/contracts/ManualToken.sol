// SPDX-License-Identifier: SEE LICENSE IN LICENSE

// skipped the ERC20 section of the tut as I'm compentent enough with it

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


pragma solidity >=0.8.0 <0.9.0;

contract ManualToken is ERC20 {
    
    constructor() ERC20("MyToken", "MYTK"){
        _mint(msg.sender, 1000000000 ** decimals());
    }


}