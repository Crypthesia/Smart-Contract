const { expect } = require("chai");
import { addressBook } from "blockchain-addressbook";
import { ethers } from "hardhat";
import { chainCallFeeMap } from "../../utils/chainCallFeeMap";

const { zapNativeToToken, getVaultWant, unpauseIfPaused, getUnirouterData, swapNativeForToken } = require("../../utils/testHelpers");
const { delay } = require("../../utils/timeHelpers");

const TIMEOUT = 10 * 60 * 100000;

const chainName = "polygon";
const chainData = addressBook[chainName];
const { beefyfinance } = chainData.platforms;

async function mineNBlocks(n) {
  for (let index = 0; index < n; index++) {
    await ethers.provider.send('evm_mine');
  }
}


const config = {
  CRTInteractionAddress : "0x8Cd07e40C2801037dcaDA66CCe182F13CC3724c0",
  CRT: "0x19B3288BbAe81deF435800e1cEFCd031d0C147B7",
  vault: "0xd470bc940E3699e9F5fe942373ebfE51E637282D",
  vaultContract: "BeefyVaultV6",
  strategyContract: "StrategyCommonChefLP",
  testAmount: ethers.utils.parseEther("500"),
  wnative: chainData.tokens.WNATIVE.address,
  keeper: "0x47e3D80f9AB3953b80a7882296D8aC2fd9147849",
  strategyOwner: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
  vaultOwner: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
};

describe("VaultLifecycleTest", () => {
  let vault, strategy, unirouter, want, CRTToken, Native, outputToken, deployer, keeper, other;

  beforeEach(async () => {
    [deployer, keeper, other] = await ethers.getSigners();

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

  // it("User can deposit and withdraw from the vault.", async () => {
  //   await unpauseIfPaused(strategy, keeper);

  //   const wantBalStart = await want.balanceOf(deployer.address);
  //   console.log("want balance start:", (wantBalStart/(10**18)).toString());
  //   //console.log("want :", await vault.want());
  //   await want.approve(vault.address, wantBalStart + 1);
  //   await vault.depositAll();
    
  //   await vault.withdrawAll();

  //   const wantBalFinal = await want.balanceOf(deployer.address);
  //   console.log("want balance final:", (wantBalFinal/(10**18)).toString());

  //   expect(wantBalFinal).to.be.lte(wantBalStart);
  //   expect(wantBalFinal).to.be.gt(wantBalStart.mul(99).div(100));
  // }).timeout(TIMEOUT);

  it("Harvests work as expected.", async () => {
    await unpauseIfPaused(strategy, keeper);

    const wantBalStart = await want.balanceOf(other.address);
    console.log("BEFORE:")
    console.log("[Want] User balance start:", (wantBalStart/(10**18)).toString());
    await want.connect(other).approve(vault.address, wantBalStart);

    await vault.connect(other).depositAll();
    console.log("Deposit All...")
    const vaultBal = await vault.balance();
    const pricePerShare = await vault.getPricePerFullShare();
      
    const beforeBalance = await CRTToken.balanceOf(other.address) / 10**18;
    
    await mineNBlocks(40000);
    // console.log(strategy);
    const callRewardBeforeHarvest = await strategy.connect(other).callReward();

    console.log("[Want] Masterchef balance ", (await strategy.balanceOfPool() / (10**18)).toString());
    console.log("[Want] Vault balance", (vaultBal/(10**18).toString()));
    console.log("Price per share:", (pricePerShare/(10**18)).toString());
    console.log("[CRT] User Balance Before: ", beforeBalance.toString());
    console.log("Call Reward: Before", callRewardBeforeHarvest.toString());
    //expect(callRewardBeforeHarvest).to.be.gt(0);
    await strategy.harvest({ gasPrice: 5000000 });
    console.log("Harvesting...");

    const vaultBalAfterHarvest = await vault.balance();
    const pricePerShareAfterHarvest = await vault.getPricePerFullShare();
    const callRewardAfterHarvest = await strategy.callReward();
    console.log("Call Reward After: ", callRewardAfterHarvest.toString());
    console.log("[Want] Vault Balance After Harvest", (vaultBalAfterHarvest/(10**18).toString()));

    await vault.connect(other).withdrawAll();
    console.log("Withdraw All...");
    const afterBalance = await CRTToken.balanceOf(other.address)/ 10**18;

    const wantBalFinal = await want.balanceOf(other.address);
    console.log("\nAFTER:")
    console.log("[want] User Balance After:", (wantBalFinal/(10**18)).toString());
    console.log("Price per share after:", (pricePerShare/(10**18)).toString());
    console.log("[CRT] User Balance After: ", afterBalance.toString());

    expect(vaultBalAfterHarvest).to.be.gt(vaultBal);
    expect(pricePerShareAfterHarvest).to.be.gt(pricePerShare);
    expect(callRewardBeforeHarvest).to.be.gt(callRewardAfterHarvest);
    
    expect(wantBalFinal).to.be.gt(wantBalStart.mul(99).div(100));

    const lastHarvest = await strategy.lastHarvest();
    console.log("Last Harvest:", (lastHarvest).toString());
    expect(lastHarvest).to.be.gt(0);
  }).timeout(TIMEOUT);

  // it("Manager can panic.", async () => {
  //   await unpauseIfPaused(strategy, keeper);

  //   const wantBalStart = await want.balanceOf(deployer.address);
  //   await want.approve(vault.address, wantBalStart);
  //   await vault.depositAll();

  //   const vaultBal = await vault.balance();
  //   const balOfPool = await strategy.balanceOfPool();
  //   const balOfWant = await strategy.balanceOfWant();
  //   await strategy.connect(keeper).panic();
  //   const vaultBalAfterPanic = await vault.balance();
  //   const balOfPoolAfterPanic = await strategy.balanceOfPool();
  //   const balOfWantAfterPanic = await strategy.balanceOfWant();

  //   expect(vaultBalAfterPanic).to.be.gt(vaultBal.mul(99).div(100));
  //   expect(balOfPool).to.be.gt(balOfWant);
  //   expect(balOfWantAfterPanic).to.be.gt(balOfPoolAfterPanic);

  //   // Users can't deposit.
  //   const tx = vault.depositAll();
  //   await expect(tx).to.be.revertedWith("Pausable: paused");

  //   // User can still withdraw
  //   await vault.withdrawAll();
  //   const wantBalFinal = await want.balanceOf(deployer.address);
  //   expect(wantBalFinal).to.be.gt(wantBalStart.mul(99).div(100));
  // }).timeout(TIMEOUT);

  // it("New user deposit/withdrawals don't lower other users balances.", async () => {
  //   await unpauseIfPaused(strategy, keeper);

  //   const wantBalStart = await want.balanceOf(deployer.address);
  //   await want.approve(vault.address, wantBalStart);
  //   await vault.depositAll();

  //   const pricePerShare = await vault.getPricePerFullShare();
  //   const wantBalOfOther = await want.balanceOf(other.address);
  //   await want.connect(other).approve(vault.address, wantBalOfOther);
  //   await vault.connect(other).depositAll();
  //   const pricePerShareAfterOtherDeposit = await vault.getPricePerFullShare();

  //   await vault.withdrawAll();
  //   const wantBalFinal = await want.balanceOf(deployer.address);
  //   const pricePerShareAfterWithdraw = await vault.getPricePerFullShare();

  //   expect(pricePerShareAfterOtherDeposit).to.be.gte(pricePerShare);
  //   expect(pricePerShareAfterWithdraw).to.be.gte(pricePerShareAfterOtherDeposit);
  //   expect(wantBalFinal).to.be.gt(wantBalStart.mul(99).div(100));
  // }).timeout(TIMEOUT);

  // it("It has the correct owners and keeper.", async () => {
  //   const vaultOwner = await vault.owner();
  //   const stratOwner = await strategy.owner();
  //   const stratKeeper = await strategy.keeper();

  //   expect(vaultOwner).to.equal(config.vaultOwner);
  //   expect(stratOwner).to.equal(config.strategyOwner);
  //   expect(stratKeeper).to.equal(config.keeper);
  // }).timeout(TIMEOUT);

  // it("Vault and strat references are correct", async () => {
  //   const stratReference = await vault.strategy();
  //   const vaultReference = await strategy.vault();

  //   expect(stratReference).to.equal(ethers.utils.getAddress(strategy.address));
  //   expect(vaultReference).to.equal(ethers.utils.getAddress(vault.address));
  // }).timeout(TIMEOUT);

  // it("Displays routing correctly", async () => {
  //   const { tokenAddressMap } = addressBook[chainName];

  //   // outputToLp0Route
  //   console.log("outputToLp0Route:");
  //   for (let i = 0; i < 10; ++i) {
  //     try {
  //       const tokenAddress = await strategy.outputToLp0Route(i);
  //       if (tokenAddress in tokenAddressMap) {
  //         console.log(tokenAddressMap[tokenAddress]);
  //       } else {
  //         console.log(tokenAddress);
  //       }
  //     } catch {
  //       // reached end
  //       if (i == 0) {
  //         console.log("No routing, output must be lp0");
  //       }
  //       break;
  //     }
  //   }

  //   // outputToLp1Route
  //   console.log("outputToLp1Route:");
  //   for (let i = 0; i < 10; ++i) {
  //     try {
  //       const tokenAddress = await strategy.outputToLp1Route(i);
  //       if (tokenAddress in tokenAddressMap) {
  //         console.log(tokenAddressMap[tokenAddress].symbol);
  //       } else {
  //         console.log(tokenAddress);
  //       }
  //     } catch {
  //       // reached end
  //       if (i == 0) {
  //         console.log("No routing, output must be lp1");
  //       }
  //       break;
  //     }
  //   }
  // }).timeout(TIMEOUT);

  // it("Has correct call fee", async () => {
  //   const callFee = await strategy.callFee();
  //   const expectedCallFee = chainCallFeeMap[chainName];
  //   const actualCallFee = parseInt(callFee)
  //   expect(actualCallFee).to.equal(expectedCallFee);
  // }).timeout(TIMEOUT);

  // it("has withdraw fee of 0 if harvest on deposit is true", async () => {
  //   const harvestOnDeposit = await strategy.harvestOnDeposit();

  //   const withdrawalFee = await strategy.withdrawalFee();
  //   const actualWithdrawalFee = parseInt(withdrawalFee);
  //   if(harvestOnDeposit) {
  //     expect(actualWithdrawalFee).to.equal(0);
  //   } else {
  //     expect(actualWithdrawalFee).not.to.equal(0);
  //   }
  // }).timeout(TIMEOUT);
});