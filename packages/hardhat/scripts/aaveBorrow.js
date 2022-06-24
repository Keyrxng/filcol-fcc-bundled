const { getNamedAccounts, ethers } = require('hardhat')
const { getWeth, AMOUNT } = require('./getWeth')

const lendingPoolAddrProv = '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5'

async function main() {
  await getWeth()
  const { deployer } = await getNamedAccounts()
  const lendingPool = await getLendingPool(deployer)

  console.log('Lending Pool Address: ', lendingPool.address)

  const wethAddr = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

  await approveERC20(wethAddr, lendingPool.address, AMOUNT, deployer)
  console.log('Depositing...')
  await lendingPool.deposit(wethAddr, AMOUNT, deployer, 0)
  console.log('Deposited!!')

  let { totalDebtETH, availableBorrowsETH } = await getUserBorrowData(
    lendingPool,
    deployer,
  )

  const daiPrice = await getDAIPrice()
  const amountToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
  console.log(`You can borrow ${amountToBorrow}`)
  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountToBorrow.toString(),
  )

  console.log('Amount to borrow in dai: ', amountDaiToBorrowWei.toString())
  const daiTokenAddr = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  await borrowDAI(daiTokenAddr, lendingPool, amountDaiToBorrowWei, deployer)
  await getUserBorrowData(lendingPool, deployer)
  await repayDai(amountDaiToBorrowWei, daiTokenAddr, lendingPool, deployer)
  await getUserBorrowData(lendingPool, deployer)
}

async function repayDai(amount, daiTokenAddr, lendingPool, account) {
  await approveERC20(daiTokenAddr, lendingPool.address, amount, account)
  const repayTx = await lendingPool.repay(daiTokenAddr, amount, 1, account)
  await repayTx.wait(1)
  console.log('repaid!')
}

async function borrowDAI(daiAddr, lendingPool, amountDaiToBorrowWei, account) {
  const borrowTx = await lendingPool.borrow(
    daiAddr,
    amountDaiToBorrowWei,
    1,
    0,
    account,
  )
  await borrowTx.wait(1)
  console.log(`You've borrowed!`)
}

async function getDAIPrice() {
  const daiEthPriceFeed = await ethers.getContractAt(
    'AggregatorV3Interface',
    '0x773616E4d11A78F511299002da57A0a94577F1f4',
  )
  const price = (await daiEthPriceFeed.latestRoundData())[1]
  console.log('Dai/Eth price is: ', price.toString())
  return price
}

async function getUserBorrowData(lendingPool, account) {
  const {
    totalCollateralETH,
    totalDebtETH,
    availableBorrowsETH,
  } = await lendingPool.getUserAccountData(account)

  console.log(`You have ${totalCollateralETH} worth of ETH deposited`)
  console.log(`You have ${totalDebtETH} worth of ETH borrowed`)
  console.log(`You have ${availableBorrowsETH} worth of ETH to borrow with`)
  return { availableBorrowsETH, totalDebtETH }
}

async function getLendingPool(account) {
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    'ILendingPoolAddressesProvider',
    lendingPoolAddrProv,
    account,
  )
  const lendingPoolAddr = await lendingPoolAddressesProvider.getLendingPool()
  const lendingPool = await ethers.getContractAt(
    'ILendingPool',
    lendingPoolAddr,
    account,
  )
  return lendingPool
}

async function approveERC20(contractAddr, spenderAddr, amountToSpend, account) {
  const erc20Token = await ethers.getContractAt('IERC20', contractAddr, account)
  const tx = await erc20Token.approve(spenderAddr, amountToSpend)
  await tx.wait(1)
  console.log(
    `approved ${spenderAddr} for ${amountToSpend} on behalf of ${account} at ${contractAddr}`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log('error: ', error)
    process.exit(1)
  })
