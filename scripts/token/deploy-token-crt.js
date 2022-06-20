require ('@nomiclabs/hardhat-ethers')

const TokenConfig = {
  name:"Crypthesia",
}
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
  
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const Token = await ethers.getContractFactory(TokenConfig.name);
    const token = await Token.deploy();
  
    console.log("Token address:", token.address);
    console.log("Token Balance:", (await token.balanceOf(deployer.address)).toString());
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });