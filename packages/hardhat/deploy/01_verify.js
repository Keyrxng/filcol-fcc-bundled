// deploy/01_verify

/*
  Etherscan returning a zero bytecode address after deployment re-running yarn hardhat deploy will reuse
  the contracts deployed from 00_deploy and attempt to verify after an arbitrary time between the two

*/

const { ethers, network } = require('hardhat')
const localChainId = '31337'
const { networkConfig } = require('../helper-hardhat-config')

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()
  let vrfCoordV2Addr, subId
  let fee = networkConfig[chainId]['entranceFee']
  let gasLane = networkConfig[chainId]['gasLane']
  let callbackGas = networkConfig[chainId]['callbackGas']
  let interval = networkConfig[chainId]['interval']
  vrfCoordV2Addr = networkConfig[chainId]['vrfCoordinatorV2']
  subId = networkConfig[chainId]['subId']
  console.log('vrfAddr: ', vrfCoordV2Addr)
  console.log('deployerAddr: ', deployer)

  const Raffle = await ethers.getContract('Raffle', deployer)

  try {
    if (chainId !== localChainId) {
      await run('verify:verify', {
        address: Raffle.address,
        contract: 'contracts/Raffle.sol:Raffle',
        constructorArguments: [
          vrfCoordV2Addr,
          fee,
          gasLane,
          subId,
          callbackGas,
          interval,
        ],
      })
    }
  } catch (error) {
    console.error(error)
  }
}
module.exports.tags = ['all', 'Raffle']
