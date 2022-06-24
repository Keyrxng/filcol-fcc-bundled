const { ethers, getNamedAccounts, deployments, network } = require('hardhat')
const { use, expect, assert } = require('chai')
const { solidity } = require('ethereum-waffle')
const { networkConfig } = require('../../helper-hardhat-config')
const { resolveConfig } = require('prettier')
const localChainId = '31337'

use(solidity)

describe('My Dapp', function () {
  let raffle, vrfCoordV2Mock, raffleEntranceFee, deployer, interval
  const chainId = network.config.chainId

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000)
  })

  describe('Raffle', function () {
    beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer
      await deployments.fixture('all')
      raffle = await ethers.getContract('Raffle', deployer)
      vrfCoordV2Mock = await ethers.getContract(
        'VRFCoordinatorV2Mock',
        deployer,
      )
      raffleEntranceFee = await raffle.getEntranceFee()
      interval = await raffle.getInterval()
    })

    describe('constructor', function () {
      it('inits the raffle correctly', async function () {
        const raffleState = await raffle.getRaffleState()
        const interval = await raffle.getInterval()
        assert.equal(raffleState.toString(), '0')
        assert.equal(interval.toString(), networkConfig[chainId]['interval'])
      })
    })

    describe('enterRaffle', function () {
      it("reverts when you don't pay enough", async function () {
        await expect(raffle.enterRaffle()).to.be.revertedWith('EthInputError')
      })
      it('records players when they enter', async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        console.log('raffleFee: ', raffleEntranceFee)
        const playerFromContract = await raffle.getPlayer(0)
        assert.equal(playerFromContract, deployer)
      })
      it('emits event on enter', async function () {
        await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
          raffle,
          'NewPlayer',
        )
      })
      it("can't enter raffle when calculating", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ])
        await network.provider.send('evm_mine', [])
        await raffle.performUpkeep([])
        await expect(
          raffle.enterRaffle({ value: raffleEntranceFee }),
        ).to.be.revertedWith('NotOpen')
      })
    })

    describe('checkUpkeep', function () {
      it("returns false if people haven't sent any ETH", async function () {
        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ])
        await network.provider.send('evm_mine', [])
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
        assert(!upkeepNeeded)
      })
      it("returns false if raffle isn't open", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ])
        await network.provider.send('evm_mine', [])
        await raffle.performUpkeep([])
        const raffleState = await raffle.getRaffleState()
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
        assert.equal(raffleState.toString(), '1')
        assert.equal(upkeepNeeded, false)
      })
      it("returns false if enough time hasn't passed", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send('evm_increaseTime', [
          interval.toNumber() - 1,
        ])
        await network.provider.send('evm_mine', [])
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
        assert(!upkeepNeeded)
      })
      it('returns true if enough time has passed, has players, eth and is open', async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ])
        await network.provider.send('evm_mine', [])
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
        assert(upkeepNeeded)
      })
    })
    describe('performUpkeep', function () {
      it('it can only run if checkUpkeep is true', async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ])
        await network.provider.send('evm_mine', [])
        const tx = await raffle.performUpkeep([])
        assert(tx)
      })
      it('reverts if upkeep not needed', async function () {
        await expect(raffle.performUpkeep([])).to.be.revertedWith(
          'UpkeepNotNeeded',
        )
      })
      it('updates raffle, emits event and calls vrf', async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ])
        await network.provider.send('evm_mine', [])
        const txResp = await raffle.performUpkeep([])
        const txRec = await txResp.wait(1)
        const reqId = txRec.events[1].args.reqId //[0] would be the vrf contract event emitted
        const raffleState = await raffle.getRaffleState()
        console.log('reqID: ', reqId, 'state: ', raffleState)
        assert(reqId.toNumber() > 0)
        assert(raffleState.toString() == '1')
      })
    })
    describe('fulfillRandomWords', function () {
      beforeEach(async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ])
        await network.provider.send('evm_mine', [])
      })

      it('can only be called after performUpkeep', async function () {
        await expect(
          vrfCoordV2Mock.fulfillRandomWords(0, raffle.address),
        ).to.be.revertedWith('nonexistent request')
        await expect(
          vrfCoordV2Mock.fulfillRandomWords(1, raffle.address),
        ).to.be.revertedWith('nonexistent request')
      })

      // "Way too big"
      it('picks a winner, resets and sends money to winner', async function () {
        const additionalEntrants = 3
        const startingAccountIndex = 1 // deployer = 0
        const accounts = await ethers.getSigners()
        for (
          let i = startingAccountIndex;
          i < startingAccountIndex + additionalEntrants;
          i++
        ) {
          const accountConnectedRaffle = raffle.connect(accounts[i])
          await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
        }
        const startingTimestamp = await raffle.getLastTimestamp()
        await new Promise(async (res, rej) => {
          raffle.once('NewWinner', async () => {
            console.log('Found the event')
            try {
              const recentWinner = await raffle.getRecentWinner()
              const raffleState = await raffle.getRaffleState()
              const endTime = await raffle.getLastTimestamp()
              const numPlayers = await raffle.getPlayers()
              const winnerEndBal = await accounts[1].getBalance()
              console.log('winner: ', recentWinner)
              console.log('account 1: ', accounts[0].address)
              console.log('account 2: ', accounts[1].address)
              console.log('account 3: ', accounts[2].address)
              console.log('account 4: ', accounts[3].address)
              assert.equal(numPlayers.toString(), '0')
              assert.equal(raffleState.toString(), '0')
              assert(endTime > startingTimestamp)

              assert.equal(
                winnerEndBal.toString(),
                winnerStartBal.add(
                  raffleEntranceFee
                    .mul(additionalEntrants)
                    .add(raffleEntranceFee)
                    .toString(),
                ),
              )
            } catch (e) {
              rej(e)
            }
            res()
          })

          const tx = await raffle.performUpkeep([])
          const txRec = await tx.wait(1)
          const winnerStartBal = await accounts[1].getBalance()
          await vrfCoordV2Mock.fulfillRandomWords(
            txRec.events[1].args.reqId,
            raffle.address,
          )
        })
      })
    })
  })
})
