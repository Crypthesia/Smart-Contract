import { ethers } from "hardhat";

async function mineNBlocks(n) {
    for (let index = 0; index < n; index++) {
      await ethers.provider.send('evm_mine');
    }
}

async function main(){
    //await mineNBlocks(4000);
    let deployer, strategy;
    [deployer] = await ethers.getSigners();
    strategy = await ethers.getContractAt("StrategyCommonChefLP", "0x1Ba189CBA10Af7fBf28Fc991D3d5Cdd945C21A94");
    await strategy.harvest();
}
main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});