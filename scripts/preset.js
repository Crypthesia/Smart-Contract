import { addressBook } from "blockchain-addressbook";
import { ethers } from "hardhat";

const { zapNativeToToken, getVaultWant, unpauseIfPaused, getUnirouterData, swapNativeForToken } = require("../utils/testHelpers");
const chainName = "polygon";
const chainData = addressBook[chainName];
const AccountConfig = {
    balance: "0x1000000000000000000", //in hex
}
const config = {
  CRT : "0xD13D238F3BA66C7d824E4f494cEb8844bC4aCd12",
  CRTInteractionAddress : "0x8Cd07e40C2801037dcaDA66CCe182F13CC3724c0",
  vault: "0xad8bfcdC4a75aEA6759488C44735E132ffbACa38",
  vaultContract: "BeefyVaultV6",
  strategyContract: "StrategyCommonChefLP",
  testAmount: ethers.utils.parseEther("500"),
  wnative: chainData.tokens.WNATIVE.address,
  keeper: "0x47e3D80f9AB3953b80a7882296D8aC2fd9147849",
  strategyOwner: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
  vaultOwner: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
};

async function setBalance(_address, _balance){
    await ethers.provider.send("hardhat_setBalance", [
        _address,
        _balance,
      ]);
}

async function main(){
  let vault, strategy, unirouter, want, CRTToken, Native, outputToken, deployer, keeper, other;

    [deployer, keeper, other] = await ethers.getSigners();
    console.log("Deployer: ", deployer.address);
    setBalance(deployer.address, AccountConfig.balance);
    console.log("Deployer ETH Balance: ", (await deployer.getBalance()).toString());
    console.log("Keeper: ", deployer.address);
    setBalance(keeper.address, AccountConfig.balance);
    console.log("Keeper ETH Balance: ", (await keeper.getBalance()).toString());
    console.log("Other: ", other.address);
    setBalance(other.address, AccountConfig.balance);
    console.log("Other ETH Balance: ", (await other.getBalance()).toString());

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
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
