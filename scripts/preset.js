require('@nomiclabs/hardhat-ethers')

AccountConfig = {
    balance: "0x1000000000000000000", //in hex
}

async function setBalance(_address, _balance){
    await ethers.provider.send("hardhat_setBalance", [
        _address,
        _balance,
      ]);
}
async function main(){
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
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
