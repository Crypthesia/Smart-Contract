const hardhat = require("hardhat");
const { ethers, web3 } = require("hardhat");
const { addressBook } = require("blockchain-addressbook");
const { predictAddresses } = require("../utils/predictAddresses");
const { setCorrectCallFee } = require("../utils/setCorrectCallFee");
const { setPendingRewardsFunctionName } = require("../utils/setPendingRewardsFunctionName");
const { verifyContracts } = require("../utils/verifyContracts");

const {
    USDC: { address: USDC },
    USDT: { address: USDT },
    pWINGS: {address: pWINGS },
    MATIC: {address: MATIC},
  } = addressBook.polygon.tokens;

const want = web3.utils.toChecksumAddress("0x20bf018fddba3b352f3d913fe1c81b846fe0f490"); // USDT-USDC Jetswap LP-pair


const TokenConfig = {
    name:"Crypthesia",
    interaction: "CRTInteraction",
}

const contractNames = {
    vault: "BeefyVaultV6",
    strategy: "StrategyCommonChefLP",
    zap: "BeefyUniV2Zap",
  };

const { jetswap } = addressBook.polygon.platforms;


async function main() {
    //deploy vault & Strategy
    
    [deployer, kepper, other] = await ethers.getSigners();
    const shouldVerifyOnEtherscan = false;
    
    const CRT = "0x49f2e87401B909070eef6E647841C4211daE14Ee";
    const CRTInteractionAddress = "0x85370440AA09Fe3b175edcf09d35EBD8509424F5";
    
    const vaultParams = {
        mooName: "Crypthesia Pool USDC-USDT",
        mooSymbol: "CRT USDC-USDT",
        delay: 21600,
    };
    
    const strategyParams = {
        want,
        poolId: 15,
        chef: jetswap.chef,
        unirouter: jetswap.router,
        strategist: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", // some address
        keeper: "0x47e3D80f9AB3953b80a7882296D8aC2fd9147849",
        beefyFeeRecipient: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
        crtInteraction: CRTInteractionAddress,
        nativeToCRTRoute: [MATIC, CRT],
        outputToNativeRoute: [pWINGS, MATIC],
        outputToLp0Route: [pWINGS, USDC],
        outputToLp1Route: [pWINGS, USDT],
        pendingRewardsFunctionName: "pendingCake", // used for rewardsAvailable(), use correct function name from masterchef
    };

    const zapParams = {
        router : jetswap.router,
        weth : MATIC,
    };

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
    const Zap = await ethers.getContractFactory(contractNames.zap);

    // let deployer = new ethers.Wallet("df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e", 
    // new ethers.providers.JsonRpcProvider(
    //   "http://localhost:8545/"
    // ));

    console.log("Deploying:", vaultParams.mooName);
    console.log("Deployer: ", deployer.address);
    const predictedAddresses = await predictAddresses({ creator: deployer.address });
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
        strategyParams.crtInteraction,
        strategyParams.nativeToCRTRoute,
        strategyParams.outputToNativeRoute,
        strategyParams.outputToLp0Route,
        strategyParams.outputToLp1Route,
    ];
    const strategy = await Strategy.deploy(...strategyConstructorArguments);
    await strategy.deployed();

    // add this info to PR
    console.log();
    console.log("CRT address:", CRT);
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
