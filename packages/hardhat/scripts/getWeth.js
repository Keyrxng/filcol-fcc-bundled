const { getContractAt } = require('@nomiclabs/hardhat-ethers/dist/src/types')
const { getNamedAccounts } = require('hardhat')

const AMOUNT = ethers.utils.parseEther('15')

async function getWeth() {
  const { deployer } = await getNamedAccounts()
  // call weth deposit = {abi, contractAddr}
  const IWeth = await ethers.getContractAt(
    'IWETH',
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    deployer,
  )

  const tx = await IWeth.deposit({ value: AMOUNT })
  await tx.wait(1)
  const wethBal = await IWeth.balanceOf(deployer)
  console.log(`Weth Balance of: ${wethBal} for ${deployer}`)
}

module.exports = { getWeth, AMOUNT }
