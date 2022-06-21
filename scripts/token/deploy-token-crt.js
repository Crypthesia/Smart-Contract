const { ethers } = require('hardhat');

require ('@nomiclabs/hardhat-ethers')

const TokenConfig = {
  name:"Crypthesia",
  interaction: "CRTInteraction",
}
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    
    const Token = await ethers.getContractFactory(TokenConfig.name);
    const token = await Token.deploy();
  
    console.log("Token address:", token.address);

    const TokenInteraction = await ethers.getContractFactory(TokenConfig.interaction);
    const tokenInteraction = await TokenInteraction.deploy(token.address);

    console.log("Token Interaction Address", tokenInteraction.address);

    premint = "1000000";
    await token.mint(tokenInteraction.address, ethers.utils.parseEther(premint));

    console.log("Balance of Interaction: ", (await token.balanceOf(tokenInteraction.address)/10**18).toString());
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });