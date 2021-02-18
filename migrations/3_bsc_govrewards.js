const GovernanceRewards = artifacts.require('./modules/GovernanceRewards.sol');

const INCH = '0x111111111117dC0aa78b770fA6A738034120C302';

const OWNER = {
    'bsc': '0x50A7291bF833303904A6313af274cC8A71044788',
};

const GOV_WALLET = {
    'bsc': '0x7e11a8887A2c445883AcC453738635bC3aCDAdb6',
};

const MOTHERSHIP = '0x73F0a6927A3c04E679074e70DFb9105F453e799D';

module.exports = function (deployer, network) {
    return deployer.then(async () => {
        if (network === 'test' || network === 'coverage') {
            // migrations are not required for testing
            return;
        }

        const account = '0x11799622F4D98A24514011E8527B969f7488eF47';
        console.log('Deployer account: ' + account);
        console.log('Deployer balance: ' + (await web3.eth.getBalance(account)) / 1e18 + ' ETH');

        const govRewards = await deployer.deploy(GovernanceRewards, INCH, MOTHERSHIP);
        await govRewards.setRewardDistribution(GOV_WALLET[network]),
        await govRewards.transferOwnership(OWNER[network]);
    });
};

// module.exports = function (deployer, network) {
// }
