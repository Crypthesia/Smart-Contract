const { config } = require('dotenv');
const { deployContract } = require('ethereum-waffle');
const {ether, ethers} = require('hardhat');
require("@nomiclabs/hardhat-ethers");

tokenConfig = {
    name: "Crypthesia",
    abi: "",
    address: "",
    preminted: "1000000000",
}
let deployer;

async function DeployCRT(){
    [deployer] = await ethers.getSigners();
    console.log(`Deploy with address: ${deployer.address}`);
    crttoken = await ethers.getContractFactory(tokenConfig.name);
    crtToken = await crttoken.deploy();
    //update tokenConfig
    tokenConfig.address = crtToken.address;
    tokenConfig.abi = require('../../artifacts/contracts/BIFI/token/CRT.sol/Crypthesia.json').abi;
    console.log(`CRT Address: ${crtToken.address}`);
}

async function preMint(address, amount){    
    crtToken = await ethers.getContractAt(tokenConfig.abi,tokenConfig.address);
    await crtToken.mint(address, ethers.utils.parseEther(amount));
    console.log(`Pre mint for ${address} ${await crtToken.balanceOf(address)/ 1e18} CRT`);
}

async function main(){
    await DeployCRT();
    await preMint(deployer.address, tokenConfig.preminted);
}

main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});
