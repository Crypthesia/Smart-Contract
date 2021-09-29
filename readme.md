# Beefy Contracts
Official starter repo for strategies and vaults from Beefy. Community strategists can contribute here to grow the ecosystem.

## Vault Deployment Process
### 1. Select a farm
The first step to have a vault deployed on Beefy is to select a farm to deploy a vault around. At the moment the rewards for a strategist are:
 - 0.5% of all rewards earned by a vault they deployed.

This means that you want to select a farm with:
1. High APR
2. High expected TVL
3. Long farm life

First time strategists much deploy contracts for farms on existing platforms on Beefy first. 

### 2. Prepare the smart contracts.
If you decided to do a simple LP vault, or a single asset vault, the most likely thing is that there is a working template that you can use. Most farms work under a version of Sushiswap's [MasterChef.sol](https://github.com/sushiswap/sushiswap/blob/master/contracts/MasterChef.sol) contract. The ones that don't, tend to use the Synthetix RewardPool.sol (like [we did](https://github.com/beefyfinance/beefy-protocol/blob/master/contracts/RewardPool.sol)). 

### 3. Test the contracts
If you're doing something completely custom you should add automated tests to facilitate review and diminish risks. If it's a copy/paste from another strategy you can get by with manual testing for now as everything has been battle tested tested quite a bit.

### 3. Deploy the smart contracts
Once you are confident that everything works as expected you can do the official deploy of the vault + strategy contracts. There are [some scripts](https://github.com/beefyfinance/beefy-contracts/blob/master/scripts/) to help make deploying easier.

** Manual Testing Is Required for All Live Vaults **
1. Deposit a small amount to test deposit functionality. 
2. Withdraw, to test withdraw functionality. 
3. Deposit a larger amount wait 30 seconds to a minute and harvest. Check harvest transaction to make sure things are going to the right places. 
4. Panic the vault. Funds should be in the strategy. 
5. Withdraw 50%. 
6. Try to deposit, once you recieve the error message pop up in metamask you can stop. No need to send the transaction through. 
7. Unpause.
8. Deposit the withdrawn amount. 
9. Harvest again. 
10. Transfer Ownership of the Vault and Strategy contracts to the Vault and Strat owners for the respective chains. 

Check for more addresses at https://github.com/beefyfinance/address-book
This is required so that we can review everything before the vault is actually live on the app and manage it after its live.

### 4.  Update App
The only file you really need to touch on the app is [pools.js](https://github.com/beefyfinance/beefy-app/blob/master/src/features/configure/pools.js). This is the config file with all the live pools.  Just copy one of the other pools as template, paste it at the top (Below the BIFI Maxi) and fill it out with your data. `earnedTokenAddress`and `earnedContractAddress`should both be the address of the vault contract. These addresses must be checksummed. 

You will also need to update the addressBook to the current version in package.json in order for Zap to work. 

### 5. Update the API
If you're deploying a vault for a platform where we already have live vaults, you will probably only need to add some data to the respective config file in the [data](https://github.com/beefyfinance/beefy-api/tree/master/src/data) folder. For example if you're doing a new Pancakeswap LP vault, you only need to add the relevant data at [cakeLpPools.json](https://github.com/beefyfinance/beefy-api/blob/master/src/data/cakeLpPools.json)

If it's a new platform you're going to have to add code to a few files, but it's still easy.

1. Create a data file for the platform in the [data](https://github.com/beefyfinance/beefy-api/tree/master/src/data) folder and fill out the farm data.
2. Create a folder under /api/stats and add code to get the APYs. You will probably be able to just copy/paste one of the others like [getCakeLpApys.js](https://github.com/beefyfinance/beefy-api/blob/master/src/api/stats/pancake/getCakeLpApys.js)
3. Import and run the new file from [getApys.js](https://github.com/beefyfinance/beefy-api/blob/master/src/api/stats/getApys.js)
4. Copy/paste a handler for that data [here](https://github.com/beefyfinance/beefy-api/blob/master/src/api/price/index.js).
5. Lastly, add a route handler to the [router.js](https://github.com/beefyfinance/beefy-api/blob/master/src/router.js) so that people and the app can access lp prices.


### Done!
Another Beefy dev will review everything, merge the PRs and ship it to production.

## Environment variables
 bsc-rpc: "https://bsc-dataseed2.defibit.io/",
 
 heco-rpc:"https://http-mainnet-node.huobichain.com",
    
 avax-rpc: "https://api.avax.network/ext/bc/C/rpc",
    
 polygon-rpc: "https://polygon-rpc.com/",
    
 fantom-rpc: "https://rpc.ftm.tools",
 
 one-rpc: "https://api.s0.t.hmny.io/",
    
 arbitrum-rpc: "https://arb1.arbitrum.io/rpc",
 

## Troubleshooting
- If you get the following error when testing or deploying on a forked chain: `Error: VM Exception while processing transaction: reverted with reason string 'Address: low-level delegate call failed'`, you are probably using `hardhat` network rather than `localhost`. Make sure you are using `--network localhost` flag for your test or deploy yarn commands.
- If you get the following error when running the fork command i.e. `yarn net bsc`: `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`. Run this command to increase heap memory limit: `export NODE_OPTIONS=--max_old_space_size=4096`
- If you are getting hanging deployments on polygon when you run `yarn deploy-strat:polygon`, try manually adding `{gasPrice: 8000000000 * 5}` as the last arg in the deploy commands, i.e. `const vault = await Vault.deploy(predictedAddresses.strategy, vaultParams.mooName, vaultParams.mooSymbol, vaultParams.delay, {gasPrice: 8000000000 * 5}); `
