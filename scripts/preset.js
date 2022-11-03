import { addressBook } from "blockchain-addressbook";
import { ethers } from "hardhat";

const { zapNativeToToken, getVaultWant, unpauseIfPaused, getUnirouterData, swapNativeForToken } = require("../utils/testHelpers");
const chainName = "polygon";
const chainData = addressBook[chainName];
const AccountConfig = {
    balance: "0x1000000000000000000", //in hex
}
const config = {
  CRT : "0x49f2e87401B909070eef6E647841C4211daE14Ee",
  CRTInteractionAddress : "0x8Cd07e40C2801037dcaDA66CCe182F13CC3724c0",
  vault: "0x93c9f29CF2496e73f3d8b07055e2359267207147",
  lp0: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", 
  lp1: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  vaultContract: "BeefyVaultV6",
  strategyContract: "StrategyCommonChefLP",
  testAmount: ethers.utils.parseEther("500"),
  wnative: chainData.tokens.WNATIVE.address,
  keeper: "0x47e3D80f9AB3953b80a7882296D8aC2fd9147849",
  strategyOwner: "0x9fFBd2a347E44f0B4AC100F19a84d64cD4E60Bd3",
  vaultOwner: '0x9fFBd2a347E44f0B4AC100F19a84d64cD4E60Bd3',
};

async function setBalance(_address, _balance){
    await ethers.provider.send("hardhat_setBalance", [
        _address,
        _balance,
      ]);
}

async function main(){
  let vault, strategy, unirouter, want, CRTToken, Native, outputToken, deployer, keeper, other, lp0ct, lp1ct;

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
    lp0ct = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", config.lp0);
    lp1ct = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", config.lp1);
    
    console.log(`Want ${want.address}`);
    console.log(`lp0 ${lp0ct.address}`);
    console.log(`lp1 ${lp1ct.address}`);
    
    await zapNativeToToken({
      amount: config.testAmount,
      want,
      nativeTokenAddr: config.wnative,
      unirouter,
      swapSignature: unirouterData.swapSignature,
      recipient: deployer.address,
    });
    await zapNativeToToken({
      amount: config.testAmount,
      want: lp0ct,
      nativeTokenAddr: config.wnative,
      unirouter,
      swapSignature: unirouterData.swapSignature,
      recipient: deployer.address,
    });
    await zapNativeToToken({
      amount: config.testAmount,
      want: lp1ct,
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
