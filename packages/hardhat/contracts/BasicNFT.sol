pragma solidity ^0.8.7;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BasicNFT is ERC721 {
    string public constant TOKEN_URI =  
    "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json";
    uint private s_tokenCounter;

    constructor() ERC721("Dawg", "DuG"){
        s_tokenCounter = 0;
    }

    function mintNFT() public returns(uint){
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter += 1;
        return s_tokenCounter;
    }

    function getTokenCounter() public view returns(uint){
        return s_tokenCounter;
    }

    function tokenURI(uint _tokenID) public view override returns(string memory){
        return TOKEN_URI;
    }
}