const { ethers, getNamedAccounts, deployments, network } = require('hardhat')
const { use, expect, assert } = require('chai')
const { solidity } = require('ethereum-waffle')
const { networkConfig } = require('../helper-hardhat-config')
const { resolveConfig } = require('prettier')
const { devChain } = require('../../helper-hardhat-config')
const localChainId = '31337'

use(solidity)

describe('My Dapp', function () {
  let raffle, vrfCoordV2Mock, raffleEntranceFee, deployer, interval
  const chainId = network.config.chainId

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000)
  })

  chainId !== localChainId
    ? describe.skip
    : describe('Raffle', function () {
        beforeEach(async function () {
          deployer = (await getNamedAccounts()).deployer
          raffle = await ethers.getContract('Raffle', deployer)
          raffleEntranceFee = await raffle.getEntranceFee()
        })

        describe('', function () {
          it('works with live keepers and vrf', async function () {
            const startingTimestamp = await raffle.getLastTimestamp()

            const accounts = await ethers.getSigners()

            await new Promise(async (res, rej) => {
              raffle.once('NewWinner', async () => {
                console.log('NewWinner event fired')
                res()
                try {
                  const recentWinner = await raffle.getRecentWinner()
                  const state = await raffle.getRaffleState()
                  const winnerBal = await accounts[0].getBalance()
                  const endTime = await raffle.getLastTimestamp()

                  await expect(raffle.getPlayer(0)).to.be.reverted
                  assert.equal(recentWinner.toString(), accounts[0].address)
                  assert.equal(state, 0)
                  assert.equal(
                    winnerBal.toString,
                    winnerStartBal.add(raffleEntranceFee).toString(),
                  )
                  assert(endTime > startingTimestamp)
                  res()
                } catch (e) {
                  rej(e)
                }
              })
              await raffle.enterRaffle({ value: raffleEntranceFee })
              const winnerStartBal = await accounts[0].getBalance()
            })
          })
        })
      })
})
