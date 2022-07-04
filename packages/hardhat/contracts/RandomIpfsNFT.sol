pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";


contract RandomIpfsNFT is VRFConsumerBaseV2, ERC721URIStorage, Ownable{

    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }

    uint private s_tokenCounter;
    uint private i_mintFee;
    VRFCoordinatorV2Interface private immutable i_vrfCoord;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subId;
    uint32 private immutable i_callback;
    uint32 private constant NUM_WORDS = 1;
    uint32 private constant MAX_CHANCE = 100;
    uint16 private constant REQUEST_CONF = 3;
    uint private immutable i_interval;
    string[3] internal s_dogTokenUris;

    mapping(uint => address) idToSender; 

    event NFTRequest(uint indexed requestId, address requester);
    event NFTMinted(Breed dogBreed, address dogOwner);

    error RangeOutOfBounds();
    error MintFeeError();
    error TransferFailed();

    constructor(string[3] memory _dogUris, address _vrfCoord, bytes32 _gasLane, uint64 _subId, uint32 _callback, uint _interval) VRFConsumerBaseV2(_vrfCoord) ERC721("RandoIpfsDemo", "RID"){
        i_vrfCoord = VRFCoordinatorV2Interface(_vrfCoord);
        i_gasLane = _gasLane;
        i_subId = _subId;
        i_callback = _callback;
        i_interval = _interval;
        s_dogTokenUris = _dogUris;
    }

    function requstNft() public payable returns(uint requestId) {
        if(msg.value < i_mintFee) {
            revert MintFeeError();
        }
        requestId = i_vrfCoord.requestRandomWords(
            i_gasLane,
            i_subId,
            REQUEST_CONF,
            i_callback,
            NUM_WORDS
        );
        idToSender[requestId] = msg.sender;
        emit NFTRequest(requestId, msg.sender);
    }
    
    function getDogUri(uint _index) public view returns(string memory) {
        return s_dogTokenUris[_index];
    }
    
    function getCounter() public view returns(uint) {
        return s_tokenCounter;
    }

    function withdraw() public onlyOwner {
        uint amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if(!success){
            revert TransferFailed();
        }
    }


    function fulfillRandomWords(uint requestId, uint[] memory randomWords) internal override {
        address dogOwner = idToSender[requestId];
        uint newTokenId = s_tokenCounter;
        uint moddedRng = randomWords[0] & MAX_CHANCE;
        Breed dogBreed = getBreedFromModdedRng(moddedRng);
        _safeMint(dogOwner, newTokenId);
        _setTokenURI(newTokenId, s_dogTokenUris[uint256(dogBreed)]);
        emit NFTMinted(dogBreed, dogOwner);
    }


    function mintNFT() public returns(uint){
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter += 1;
        return s_tokenCounter;
    }

    function getBreedFromModdedRng(uint moddedRng) public pure returns(Breed){
        uint cumulativeSum = 0;
        uint32[3] memory chanceArray = getChanceArray();
        for(uint x = 0; x < chanceArray.length; x++){
            if(moddedRng >= cumulativeSum && moddedRng < cumulativeSum + chanceArray[x]){
                return Breed(x);
            }
            cumulativeSum += chanceArray[x];
        }
        revert RangeOutOfBounds();
    }

    function getMintFee() public view returns (uint) {
        return i_mintFee;
    }

    function getDogTokenUris(uint _index) public view returns (string memory) {
        return s_dogTokenUris[_index];
    }

    function getTokenCounter() public view returns (uint) {
        return s_tokenCounter;
    }

    function getChanceArray() public pure returns(uint32[3] memory) {
        return [10, 30, MAX_CHANCE];
    }

}