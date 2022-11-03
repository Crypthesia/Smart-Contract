import { ethers } from "hardhat";

async function mineNBlocks(n) {
    for (let index = 0; index < n; index++) {
      await ethers.provider.send('evm_mine');
    }
}

async function main(){
    await mineNBlocks(10000);
    let deployer, strategy;
    [deployer] = await ethers.getSigners();
    strategy = await ethers.getContractAt("StrategyCommonChefLP", "0xEe856F34175064A7469BbEB89ec3717bEE45316F");
    await strategy.harvest();
    // await strategy.harvestCRT();
}
main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});