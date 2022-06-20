import hardhat, { ethers, web3 } from "hardhat";
import { addressBook } from "blockchain-addressbook";
import { predictAddresses } from "../../utils/predictAddresses";
import { setCorrectCallFee } from "../../utils/setCorrectCallFee";
import { setPendingRewardsFunctionName } from "../../utils/setPendingRewardsFunctionName";
import { verifyContracts } from "../../utils/verifyContracts";

// const registerSubsidy = require("../../utils/registerSubsidy");

const {
  CAKE: { address: CAKE },
  WBNB: { address: WBNB },
  BNB: { address: BNB },
} = addressBook.bsc.tokens;
const { elk, pancake, beefyfinance } = addressBook.bsc.platforms;

const shouldVerifyOnEtherscan = false;

const want = web3.utils.toChecksumAddress("0x0ed7e52944161450477ee417de9cd3a859b14fd0"); // Cake-BNB LP Pool

const vaultParams = {
  mooName: "Crypthesia Pool CAKE-BNB",
  mooSymbol: "CRT CakeBNB",
  delay: 21600,
};

const strategyParams = {
  want,
  poolId: 251,
  chef: pancake.masterchef,
  unirouter: pancake.router,
  strategist: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", // some address
  keeper: "0x47e3D80f9AB3953b80a7882296D8aC2fd9147849",
  beefyFeeRecipient: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
  outputToNativeRoute: [BNB, WBNB],
  outputToLp0Route: [BNB, CAKE],
  outputToLp1Route: [BNB],
  pendingRewardsFunctionName: "pendingCake", // used for rewardsAvailable(), use correct function name from masterchef
};

const contractNames = {
  vault: "BeefyVaultV6",
  strategy: "StrategyCommonChefLP",
};

async function main() {
  if (
    Object.values(vaultParams).some(v => v === undefined) ||
    Object.values(strategyParams).some(v => v === undefined) ||
    Object.values(contractNames).some(v => v === undefined)
  ) {
    console.error("one of config values undefined");
    return;
  }

  const Vault = await ethers.getContractFactory(contractNames.vault);
  const Strategy = await ethers.getContractFactory(contractNames.strategy);
  let [deployer] = await ethers.getSigners();
  // let deployer = new ethers.Wallet("df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e", 
  // new ethers.providers.JsonRpcProvider(
  //   "http://localhost:8545/"
  // ));

  console.log(strategyParams);
  console.log("Deploying:", vaultParams.mooName);
  console.log("Deployer: ", deployer.address);
  const predictedAddresses = await predictAddresses({ creator: deployer.address });
  console.log("PredictedAddress: ", predictedAddresses);
  const vaultConstructorArguments = [
    predictedAddresses.strategy,
    vaultParams.mooName,
    vaultParams.mooSymbol,
    vaultParams.delay,
  ];


  const vault = await Vault.deploy(...vaultConstructorArguments);
  await vault.deployed();

  const strategyConstructorArguments = [
    strategyParams.want,
    strategyParams.poolId,
    strategyParams.chef,
    vault.address,
    strategyParams.unirouter,
    strategyParams.keeper,
    strategyParams.strategist,
    strategyParams.beefyFeeRecipient,
    strategyParams.outputToNativeRoute,
    strategyParams.outputToLp0Route,
    strategyParams.outputToLp1Route,
  ];
  const strategy = await Strategy.deploy(...strategyConstructorArguments);
  await strategy.deployed();

  // add this info to PR
  console.log();
  console.log("Vault:", vault.address);
  console.log("Strategy:", strategy.address);
  console.log("Want:", strategyParams.want);
  console.log("PoolId:", strategyParams.poolId);

  console.log();
  console.log("Running post deployment");

  if (shouldVerifyOnEtherscan) {
    verifyContracts(vault, vaultConstructorArguments, strategy, strategyConstructorArguments);
  }
  await setPendingRewardsFunctionName(strategy, strategyParams.pendingRewardsFunctionName);
  await setCorrectCallFee(strategy, hardhat.network.name);
  console.log();

  // if (hardhat.network.name === "bsc") {
  //   await registerSubsidy(vault.address, deployer);
  //   await registerSubsidy(strategy.address, deployer);
  // }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
