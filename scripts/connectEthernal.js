const {ethers, ethernal} = require('hardhat');
require('@nomiclabs/hardhat-ethers');
const { addressBook } = require("blockchain-addressbook");
const { BlockForkEvent } = require('@ethersproject/abstract-provider');

const config = {
    chain : 'polygon',
    factoryabi : require('../artifacts/contracts/BIFI/interfaces/common/IUniswapFactory.sol/IUniswapV2Factory.json').abi,
    factory : '0x5757371414417b8c6caad45baef941abc7d3ab32',
    uniabi : require('../artifacts/contracts/BIFI/interfaces/common/IUniswapRouterETH.sol/IUniswapRouterETH.json').abi,
    unirouter : addressBook.polygon.platforms.quickswap.router,
    CRTabi : require("../artifacts/contracts/BIFI/token/CRT.sol/Crypthesia.json").abi,
    CRT : '0x09793B34606AFD6995D953b2721f8C70c0a9086e',
    wNativeAddr: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
}

const addlpConfig = {
    tokenA: config.CRT,
    tokenB: config.wNativeAddr,
    amountADesired: ethers.utils.parseEther("1000000"), // 10000000 CRT 
    amountBDesired: ethers.utils.parseEther("1000"), // 1000 Native 
    amountAMin: ethers.utils.parseEther("1"),
    amountBMin: ethers.utils.parseEther("1"),
    to: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
    deadline: 5000000000,
}

let deployer, keeper, other;
async function wrapNative(amount, wNativeAddr){
    const wNative = await ethers.getContractAt("IWrappedNative", config.wNativeAddr);
    await wNative.deposit({ value: amount });
  };

async function addLiquidity(){
    [deployer, keeper, other] = await ethers.getSigners();
    console.log("Deployer(first provider) address: ",deployer.address);
    //ether -> wrap native
    await wrapNative(addlpConfig.amountBDesired, config.wNativeAddr);
    //set up contract
    factoryContract = await ethers.getContractAt(config.factoryabi, config.factory);
    uniContract = await ethers.getContractAt(config.uniabi, config.unirouter);
    crtContract = await ethers.getContractAt(config.CRTabi, config.CRT);
    nativeContract = await ethers.getContractAt("IWrappedNative", config.wNativeAddr);
    //check balance
    crtBalance = await crtContract.balanceOf(deployer.address);
    nativeBalance = await nativeContract.balanceOf(deployer.address);
    console.log(`Current CRT Balance Before: ${crtBalance}`);
    console.log(`Current Native Balance Before: ${nativeBalance}`);

    await crtContract.approve(config.unirouter, crtBalance);
    await nativeContract.approve(config.unirouter, nativeBalance);

    const addlpArguments = [
        addlpConfig.tokenA,
        addlpConfig.tokenB,
        addlpConfig.amountADesired,
        addlpConfig.amountBDesired,
        addlpConfig.amountAMin,
        addlpConfig.amountBMin,
        addlpConfig.to,
        addlpConfig.deadline
    ]
    let tx = await uniContract.addLiquidity(...addlpArguments);
    console.log(tx.hash);
    await tx.wait();
    crtBalanceAfter = await crtContract.balanceOf(deployer.address);
    nativeBalanceAfter = await nativeContract.balanceOf(deployer.address);

    console.log(`Current CRT Balance After: ${crtBalanceAfter}`);
    console.log(`Current Native Balance AFter: ${nativeBalanceAfter}`);    
}
async function main(){

}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});