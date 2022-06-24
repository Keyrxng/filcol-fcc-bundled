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

  const BASE_FEE = ethers.utils.parseEther('0.25')
  const GAS_PRICE_LINK = 1e9
  const VRF_SUB_AMOUNT = ethers.utils.parseEther('30')

  let vrfCoordV2Addr, subId
  let fee = networkConfig[chainId]['entranceFee']
  let gasLane = networkConfig[chainId]['gasLane']
  let callbackGas = networkConfig[chainId]['callbackGas']
  let interval = networkConfig[chainId]['interval']

  // if (chainId === localChainId) {
  //   log('local network detected! Deploying mocks...')
  //   await deploy('VRFCoordinatorV2Mock', {
  //     from: deployer,
  //     args: [BASE_FEE, GAS_PRICE_LINK],
  //     log: true,
  //     waitConfirmations: 1,
  //   })
  //   log('Mocks deployed')
  //   log('---------------------------------------')
  //   const vrfCoordV2Mock = await ethers.getContract('VRFCoordinatorV2Mock')
  //   vrfCoordV2Addr = vrfCoordV2Mock.address
  //   const txReq = await vrfCoordV2Mock.createSubscription()
  //   const txRec = await txReq.wait(1)
  //   subId = txRec.events[0].args.subId
  //   await vrfCoordV2Mock.fundSubscription(subId, VRF_SUB_AMOUNT)
  // } else {
  vrfCoordV2Addr = networkConfig[chainId]['vrfCoordinatorV2']
  subId = networkConfig[chainId]['subId']
  console.log('vrfAddr: ', vrfCoordV2Addr)
  console.log('deployerAddr: ', deployer)
  // }

  const Raffle = await deploy('Raffle', {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    args: [vrfCoordV2Addr, fee, gasLane, subId, callbackGas, interval],
    log: true,
    waitConfirmations: 1,
  })

  // Getting a previously deployed contract
  // const Raffle = await ethers.getContract('Raffle', deployer)
  /*  await Raffle.setPurpose("Hello");
  
    To take ownership of Raffle using the ownable library uncomment next line and add the 
    address you want to be the owner. 
    // await Raffle.transferOwnership(YOUR_ADDRESS_HERE);

    //const Raffle = await ethers.getContractAt('Raffle', "0xaAC799eC2d00C013f1F11c37E654e59B0429DF6A") //<-- if you want to instantiate a version of a contract at a specific address!
  */

  /*
  //If you want to send value to an address from the deployer
  const deployerWallet = ethers.provider.getSigner()
  await deployerWallet.sendTransaction({
    to: "0x34aA3F359A9D614239015126635CE7732c18fDF3",
    value: ethers.utils.parseEther("0.001")
  })
  */

  /*
  //If you want to send some ETH to a contract on deploy (make your constructor payable!)
  const Raffle = await deploy("Raffle", [], {
  value: ethers.utils.parseEther("0.05")
  });
  */

  /*
  //If you want to link a library into your contract:
  // reference: https://github.com/austintgriffith/scaffold-eth/blob/using-libraries-example/packages/hardhat/scripts/deploy.js#L19
  const Raffle = await deploy("Raffle", [], {}, {
   LibraryName: **LibraryAddress**
  });
  */

  // Verify from the command line by running `yarn verify`

  // You can also Verify your contracts with Etherscan here...
  // You don't want to verify on localhost
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
