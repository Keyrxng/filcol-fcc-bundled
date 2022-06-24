// deploy/00_deploy_your_contract.js

const { ethers, network } = require('hardhat')
const { verify } = require('../utils/verify')
const localChainId = '31337'
const { networkConfig } = require('../helper-hardhat-config')

// const sleep = (ms) =>
//   new Promise((r) =>
//     setTimeout(() => {
//       console.log(`waited for ${(ms / 1000).toFixed(3)} seconds`);
//       r();
//     }, ms)
//   );

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = await getChainId()

  log('----------------------')

  const args = []
  const BasicNFT = await deploy('BasicNFT', {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: 1,
  })

  try {
    if (chainId !== localChainId) {
      await run('verify:verify', {
        address: BasicNFT.address,
        contract: 'contracts/BasicNFT.sol:BasicNFT',
        constructorArguments: args,
      })
    }
  } catch (error) {
    console.error(error)
  }
}
module.exports.tags = ['BasicNFT']
