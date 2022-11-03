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

const contractNames = {
    zap: "BeefyUniV2Zap",
  };

const { jetswap } = addressBook.polygon.platforms;


async function main() {
    //deploy vault & Strategy
    
    [deployer, kepper, other] = await ethers.getSigners();
    const shouldVerifyOnEtherscan = false;
    
    const zapParams = {
        router : jetswap.router,
        weth : MATIC,
    };

    const Zap = await ethers.getContractFactory(contractNames.zap);

    // let deployer = new ethers.Wallet("df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e", 
    // new ethers.providers.JsonRpcProvider(
    //   "http://localhost:8545/"
    // ));

    const zapConstructorArguments = [
        zapParams.router,
        zapParams.weth,
    ];


    const zap = await Zap.deploy(...zapConstructorArguments);
    await zap.deployed();
    
    console.log(`Zap Address ${zap.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
