const { expect } = require("chai");
import { addressBook } from "blockchain-addressbook";
import { ethers } from "hardhat";
import { chainCallFeeMap } from "../../utils/chainCallFeeMap";

const { zapNativeToToken, getVaultWant, unpauseIfPaused, getUnirouterData } = require("../../utils/testHelpers");
const { delay } = require("../../utils/timeHelpers");

const TIMEOUT = 10 * 60 * 100000;

const chainName = "polygon";
const chainData = addressBook[chainName];
const { beefyfinance } = chainData.platforms;

const AccountConfig = {
  balance: "0x1000000000000000000", //in hex
}

async function setBalance(_address, _balance){
  await ethers.provider.send("hardhat_setBalance", [
      _address,
      _balance,
    ]);
}
async function mineNBlocks(n) {
  for (let index = 0; index < n; index++) {
    await ethers.provider.send('evm_mine');
  }
}
const config = {
  CRT: "0x09793b34606afd6995d953b2721f8c70c0a9086e",
  vault: "0x93c9f29CF2496e73f3d8b07055e2359267207147",
  vaultContract: "BeefyVaultV6",
  strategyContract: "StrategyCommonChefLP",
  testAmount: ethers.utils.parseEther("1000"),
  wnative: chainData.tokens.WNATIVE.address,
  keeper: beefyfinance.keeper,
  strategyOwner: beefyfinance.strategyOwner,
  vaultOwner: beefyfinance.vaultOwner,
};

describe("VaultLifecycleTest", () => {
  let vault, strategy, unirouter, want, deployer, keeper, other, CRTToken;

  beforeEach(async () => {
    [deployer, keeper, other] = await ethers.getSigners();
    //set balance
    setBalance(deployer.address, AccountConfig.balance);
    setBalance(keeper.address, AccountConfig.balance);
    setBalance(other.address, AccountConfig.balance);

    vault = await ethers.getContractAt(config.vaultContract, config.vault);
    const strategyAddr = await vault.strategy();
    strategy = await ethers.getContractAt(config.strategyContract, strategyAddr);

    const unirouterAddr = await strategy.unirouter();
    const unirouterData = getUnirouterData(unirouterAddr);
    unirouter = await ethers.getContractAt(unirouterData.interface, unirouterAddr);
    CRTToken = await ethers.getContractAt("Crypthesia", config.CRT);
    want = await getVaultWant(vault, config.wnative);
    console.log(`Want ${want.address}`);
    await zapNativeToToken({
      amount: config.testAmount,
      want,
      nativeTokenAddr: config.wnative,
      unirouter,
      swapSignature: unirouterData.swapSignature,
      recipient: deployer.address,
    });
    const wantBal = await want.balanceOf(deployer.address);
    await want.transfer(other.address, wantBal.div(2));
  });

  it("User can deposit and withdraw from the vault.", async () => {
    await unpauseIfPaused(strategy, keeper);
    const wantBalStart = await want.balanceOf(deployer.address);

    console.log(`want start:`,wantBalStart.toString());
    await want.approve(vault.address, wantBalStart);
    await vault.depositAll();
    console.log("depositing:", (await want.balanceOf(deployer.address)).toString());
    await vault.withdrawAll();

    const wantBalFinal = await want.balanceOf(deployer.address);
    console.log(`want final`, wantBalFinal.toString());

    expect(wantBalFinal).to.be.lte(wantBalStart);
    expect(wantBalFinal).to.be.gt(wantBalStart.mul(99).div(100));
  }).timeout(TIMEOUT);

  // it("Harvests work as expected.", async () => {
  //   await unpauseIfPaused(strategy, keeper);

  //   const wantBalStart = await want.balanceOf(deployer.address);
  //   await want.approve(vault.address, wantBalStart);
  //   console.log("Pending CRT 0:", (await strategy.pendingCRT(deployer.address)).toString());
  //   await vault.depositAll();

  //   const vaultBal = await vault.balance();
  //   const pricePerShare = await vault.getPricePerFullShare();
  //   await mineNBlocks(20);
  //   const callRewardBeforeHarvest = await strategy.callReward();
  //   expect(callRewardBeforeHarvest).to.be.gt(0);
  //   await strategy.harvest({ gasPrice: 5000000 });
  //   const vaultBalAfterHarvest = await vault.balance();
  //   const pricePerShareAfterHarvest = await vault.getPricePerFullShare();
  //   const callRewardAfterHarvest = await strategy.callReward();
  //   console.log("Pending CRT 1:", (await strategy.pendingCRT(deployer.address)).toString());
  //   await vault.withdrawAll();
  //   const wantBalFinal = await want.balanceOf(deployer.address);

  //   expect(vaultBalAfterHarvest).to.be.gt(vaultBal);
  //   expect(pricePerShareAfterHarvest).to.be.gt(pricePerShare);
  //   expect(callRewardBeforeHarvest).to.be.gt(callRewardAfterHarvest);
    
  //   expect(wantBalFinal).to.be.gt(wantBalStart.mul(99).div(100));

  //   const lastHarvest = await strategy.lastHarvest();
  //   expect(lastHarvest).to.be.gt(0);
  //   console.log("CRT Token of Strategy", (await CRTToken.balanceOf(strategy.address)).toString());
  // }).timeout(TIMEOUT);

//   it("Manager can panic.", async () => {
//     await unpauseIfPaused(strategy, keeper);

//     const wantBalStart = await want.balanceOf(deployer.address);
//     await want.approve(vault.address, wantBalStart);
//     await vault.depositAll();

//     const vaultBal = await vault.balance();
//     const balOfPool = await strategy.balanceOfPool();
//     const balOfWant = await strategy.balanceOfWant();
//     await strategy.connect(keeper).panic();
//     const vaultBalAfterPanic = await vault.balance();
//     const balOfPoolAfterPanic = await strategy.balanceOfPool();
//     const balOfWantAfterPanic = await strategy.balanceOfWant();

//     expect(vaultBalAfterPanic).to.be.gt(vaultBal.mul(99).div(100));
//     expect(balOfPool).to.be.gt(balOfWant);
//     expect(balOfWantAfterPanic).to.be.gt(balOfPoolAfterPanic);

//     // Users can't deposit.
//     const tx = vault.depositAll();
//     await expect(tx).to.be.revertedWith("Pausable: paused");

//     // User can still withdraw
//     await vault.withdrawAll();
//     const wantBalFinal = await want.balanceOf(deployer.address);
//     expect(wantBalFinal).to.be.gt(wantBalStart.mul(99).div(100));
//   }).timeout(TIMEOUT);

//   it("New user deposit/withdrawals don't lower other users balances.", async () => {
//     await unpauseIfPaused(strategy, keeper);

//     const wantBalStart = await want.balanceOf(deployer.address);
//     await want.approve(vault.address, wantBalStart);
//     await vault.depositAll();

//     const pricePerShare = await vault.getPricePerFullShare();
//     const wantBalOfOther = await want.balanceOf(other.address);
//     await want.connect(other).approve(vault.address, wantBalOfOther);
//     await vault.connect(other).depositAll();
//     const pricePerShareAfterOtherDeposit = await vault.getPricePerFullShare();

//     await vault.withdrawAll();
//     const wantBalFinal = await want.balanceOf(deployer.address);
//     const pricePerShareAfterWithdraw = await vault.getPricePerFullShare();

//     expect(pricePerShareAfterOtherDeposit).to.be.gte(pricePerShare);
//     expect(pricePerShareAfterWithdraw).to.be.gte(pricePerShareAfterOtherDeposit);
//     expect(wantBalFinal).to.be.gt(wantBalStart.mul(99).div(100));
//   }).timeout(TIMEOUT);

//   it("It has the correct owners and keeper.", async () => {
//     const vaultOwner = await vault.owner();
//     const stratOwner = await strategy.owner();
//     const stratKeeper = await strategy.keeper();

//     expect(vaultOwner).to.equal(config.vaultOwner);
//     expect(stratOwner).to.equal(config.strategyOwner);
//     expect(stratKeeper).to.equal(config.keeper);
//   }).timeout(TIMEOUT);

//   it("Vault and strat references are correct", async () => {
//     const stratReference = await vault.strategy();
//     const vaultReference = await strategy.vault();

//     expect(stratReference).to.equal(ethers.utils.getAddress(strategy.address));
//     expect(vaultReference).to.equal(ethers.utils.getAddress(vault.address));
//   }).timeout(TIMEOUT);

//   it("Displays routing correctly", async () => {
//     const { tokenAddressMap } = addressBook[chainName];

//     // outputToLp0Route
//     console.log("outputToLp0Route:");
//     for (let i = 0; i < 10; ++i) {
//       try {
//         const tokenAddress = await strategy.outputToLp0Route(i);
//         if (tokenAddress in tokenAddressMap) {
//           console.log(tokenAddressMap[tokenAddress]);
//         } else {
//           console.log(tokenAddress);
//         }
//       } catch {
//         // reached end
//         if (i == 0) {
//           console.log("No routing, output must be lp0");
//         }
//         break;
//       }
//     }

//     // outputToLp1Route
//     console.log("outputToLp1Route:");
//     for (let i = 0; i < 10; ++i) {
//       try {
//         const tokenAddress = await strategy.outputToLp1Route(i);
//         if (tokenAddress in tokenAddressMap) {
//           console.log(tokenAddressMap[tokenAddress].symbol);
//         } else {
//           console.log(tokenAddress);
//         }
//       } catch {
//         // reached end
//         if (i == 0) {
//           console.log("No routing, output must be lp1");
//         }
//         break;
//       }
//     }
//   }).timeout(TIMEOUT);

//   it("Has correct call fee", async () => {
//     const callFee = await strategy.callFee();

//     const expectedCallFee = chainCallFeeMap[chainName];
//     const actualCallFee = parseInt(callFee)

//     expect(actualCallFee).to.equal(expectedCallFee);
//   }).timeout(TIMEOUT);

//   it("has withdraw fee of 0 if harvest on deposit is true", async () => {
//     const harvestOnDeposit = await strategy.harvestOnDeposit();

//     const withdrawalFee = await strategy.withdrawalFee();
//     const actualWithdrawalFee = parseInt(withdrawalFee);
//     if(harvestOnDeposit) {
//       expect(actualWithdrawalFee).to.equal(0);
//     } else {
//       expect(actualWithdrawalFee).not.to.equal(0);
//     }
//   }).timeout(TIMEOUT);
});