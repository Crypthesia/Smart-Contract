const { ethers } = require('hardhat');

require('@nomiclabs/hardhat-ethers');

const TokenConfig = {
    name:"Crypthesia",
    interaction: "CRTInteraction",
  }
const CRTaddress = "0xb6A36D8Fe82F071b829B457A6A1CB68Ca3915d5c";
const CRTInteractionAddress = "0xbb9b95a7FF812AD73516fDB2a4c134B9c044e4F8";

async function main(){
    [deployer, keeper, other] = await ethers.getSigners();
    console.log("Testing on ",other.address);
    
    CRTtoken = await ethers.getContractAt(TokenConfig.name, CRTaddress);
    CRTinteraction = await ethers.getContractAt(TokenConfig.interaction, CRTInteractionAddress);
    
    beforeBalance = await CRTtoken.balanceOf(other.address) / 10**18;
    beforeInteractionBal = await CRTtoken.balanceOf(CRTInteractionAddress)/ 10**18;

    const tx = await other.sendTransaction({
        to: CRTInteractionAddress,
        value: ethers.utils.parseEther("1"),
    });
    afterBalance = await CRTtoken.balanceOf(other.address)/ 10**18;
    afterInteractionBal = await CRTtoken.balanceOf(CRTInteractionAddress)/ 10**18;

    console.log("User Balance Before: ", beforeBalance.toString());
    console.log("CRT Vault Balance Before: ", beforeInteractionBal.toString());
    console.log("User Balance After: ", afterBalance.toString());
    console.log("CRT Vault Balance After: ", afterInteractionBal.toString());
    
}

main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});