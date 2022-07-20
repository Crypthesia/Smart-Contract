const hardhat = require("hardhat");
const { ethers, web3 } = require("hardhat");
const { addressBook } = require("blockchain-addressbook");
const { predictAddresses } = require("../utils/predictAddresses");
const { setCorrectCallFee } = require("../utils/setCorrectCallFee");
const { setPendingRewardsFunctionName } = require("../utils/setPendingRewardsFunctionName");
const { verifyContracts } = require("../utils/verifyContracts");

const {
    ETH: { address: ETH },
    MATIC: { address: MATIC },
    USDC: { address: USDC },
  } = addressBook.polygon.tokens;

const want = web3.utils.toChecksumAddress("0x853Ee4b2A13f8a742d64C8F088bE7bA2131f670d"); // ETH-USDC LP Pool


const TokenConfig = {
    name:"Crypthesia",
    interaction: "CRTInteraction",
}

AccountConfig = {
    balance: "0x1000000000000000000", //in hex
}

async function setBalance(_address, _balance){
    await ethers.provider.send("hardhat_setBalance", [
        _address,
        _balance,
      ]);
}

const contractNames = {
    vault: "BeefyVaultV6",
    strategy: "StrategyCommonChefLP",
  };

const { quickswap, polywise } = addressBook.polygon.platforms;




async function main() {
    console.log("Setting Balance...");
    [deployer, keeper, other] = await ethers.getSigners();
    console.log("Deployer: ", deployer.address);
    setBalance(deployer.address, AccountConfig.balance);
    console.log("Deployer Native Token Balance: ", (await deployer.getBalance()).toString());
    console.log("Keeper: ", deployer.address);
    setBalance(keeper.address, AccountConfig.balance);
    console.log("Keeper Native Token Balance: ", (await keeper.getBalance()).toString());
    console.log("Other: ", other.address);
    setBalance(other.address, AccountConfig.balance);
    console.log("Other Native Token Balance: ", (await other.getBalance()).toString(), end = "\n\n");
    
    // Deploy Token
    console.log("Deploying contracts with the account:", deployer.address, end = "\n\n");
    
    const Token = await ethers.getContractFactory(TokenConfig.name);
    const token = await Token.deploy();
    
    
    const TokenInteraction = await ethers.getContractFactory(TokenConfig.interaction);
    const tokenInteraction = await TokenInteraction.deploy(token.address);
    
    
    premint = "1000000";
    await token.mint(tokenInteraction.address, ethers.utils.parseEther(premint));
    
    console.log("Preminted for CRT Interaction Contract: ", (await token.balanceOf(tokenInteraction.address)/10**18).toString(), " token\n\n");
    
    //deploy vault & Strategy
    
    
    const shouldVerifyOnEtherscan = false;
    
    const CRTInteractionAddress = tokenInteraction.address;
    const CRT = token.address;
    
    const vaultParams = {
        mooName: "Crypthesia Pool ETH-BNB",
        mooSymbol: "CRT ETH-BNB",
        delay: 21600,
    };
    
    const strategyParams = {
        want,
        poolId: 13,
        chef: polywise.masterchef,
        unirouter: quickswap.router,
        strategist: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", // some address
        keeper: "0x47e3D80f9AB3953b80a7882296D8aC2fd9147849",
        beefyFeeRecipient: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
        crtInteraction: CRTInteractionAddress,
        nativeToCRTRoute: [MATIC, CRT],
        outputToNativeRoute: [USDC, MATIC],
        outputToLp0Route: [USDC],
        outputToLp1Route: [USDC, ETH],
        pendingRewardsFunctionName: "pendingWise", // used for rewardsAvailable(), use correct function name from masterchef
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
    // let deployer = new ethers.Wallet("df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e", 
    // new ethers.providers.JsonRpcProvider(
    //   "http://localhost:8545/"
    // ));

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
    console.log("CRT address:", token.address);
    console.log("CRT Interaction Address", tokenInteraction.address);
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
