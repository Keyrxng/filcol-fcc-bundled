pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "hardhat/console.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

/**
  @title ChainlinkVRF & Keepers Tut
  @author @Keyrxng
  @notice Patrick Collins Free Code Camp Raffle Section
  @dev Uses Chainlink keepers and chainlink VRF to provide true randomness as part of a lottery

 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface{

    enum RaffleState{
      OPEN,
      CALCULATING
    }


  uint private immutable i_fee;
  address payable[] private s_players;
  VRFCoordinatorV2Interface private immutable i_vrfCoord;
  bytes32 private immutable i_gasLane;
  uint64 private immutable i_subId;
  uint32 private immutable i_callback;
  uint32 private constant NUM_WORDS = 1;
  uint16 private constant REQUEST_CONF = 3;
  uint private immutable i_interval;

  address private s_recentWinner;
  RaffleState private s_RaffleState;
  uint private s_lastTimestamp;
  

  event NewPlayer(address indexed player);
  event WinnerRequest(uint indexed reqId);
  event NewWinner(address indexed winner);
  error EthInputError(uint entered, uint required);
  error UpkeepNotNeeded(uint balance, uint numPlayers, uint state);
  error TransferFailed();
  error NotOpen();


  constructor(address _vrfCoordV2, uint _entranceFee, bytes32 _gasLane, uint64 _subId, uint32 _callbackGas, uint _interval) VRFConsumerBaseV2(_vrfCoordV2) {
    i_fee = _entranceFee;
    i_vrfCoord = VRFCoordinatorV2Interface(_vrfCoordV2);
    i_gasLane = _gasLane;
    i_subId = _subId;
    i_callback = _callbackGas;
    s_RaffleState = RaffleState.OPEN;
    s_lastTimestamp = block.timestamp;
    i_interval = _interval;
  }

  function enterRaffle() public payable {
    if (msg.value < i_fee) {
      revert EthInputError({
        entered: msg.value,
        required: i_fee
      });
    }
    if (s_RaffleState != RaffleState.OPEN){
      revert NotOpen();
    }
      s_players.push(payable(msg.sender));
      emit NewPlayer(msg.sender);
    }
  

  function checkUpkeep(bytes memory /*checkData */) public override returns(bool upkeepNeeded, bytes memory /*performData*/) {
    bool isOpen = (RaffleState.OPEN == s_RaffleState);
    bool timePassed = ((block.timestamp - s_lastTimestamp) > i_interval);
    bool hasPlayers = (s_players.length > 0);
    bool hasBalance = address(this).balance > 0;
    upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
  }

  function performUpkeep(bytes calldata /*performData*/) external override {
    (bool upkeepNeed, ) = checkUpkeep("");
    if(!upkeepNeed) {
      revert UpkeepNotNeeded({balance: address(this).balance, numPlayers: s_players.length, state: uint(s_RaffleState)});
    }
    s_RaffleState = RaffleState.CALCULATING;
      uint reqId = i_vrfCoord.requestRandomWords(
        i_gasLane,
        i_subId,
        REQUEST_CONF,
        i_callback,
        NUM_WORDS
      );
      emit WinnerRequest(reqId);

  }

  function fulfillRandomWords(uint /*_reqId*/, uint[] memory _randoWords ) internal override {
    uint winnerIndex = _randoWords[0] % s_players.length;
    address payable recentWinner = s_players[winnerIndex];
    s_recentWinner = recentWinner;
    s_RaffleState = RaffleState.OPEN;
    s_players = new address payable[](0);
    s_lastTimestamp = block.timestamp;
    (bool success, ) = recentWinner.call{value: address(this).balance}("");
    if(!success){
      revert TransferFailed();
    }
    emit NewWinner(recentWinner);
    }

  function  getRecentWinner() public view returns(address) {
      return s_recentWinner;
    }
  function  getNumWords() public pure returns(uint) {
      return NUM_WORDS;
    }
  function  getRaffleState() public view returns(RaffleState) {
    return s_RaffleState;
    }
  function getPlayers() public view returns(uint) {
      return s_players.length;
    }
      function getPlayer(uint _index) public view returns(address) {
      return s_players[_index];
    }
  function  getLastTimestamp() public view returns(uint) {
      return s_lastTimestamp;
    }
  function getReqConf() public pure returns(uint){
      return REQUEST_CONF;
    }
  function getEntranceFee() public view returns(uint){
      return i_fee;
    }
  function getInterval() public view returns(uint){
      return i_interval;
    }

  // to support receiving ETH by default
  receive() external payable {}
  fallback() external payable {}
}
