// const GovernanceMothership = artifacts.require('./GovernanceMothership.sol');
// const ExchangeGovernance = artifacts.require('./modules/ExchangeGovernance.sol');
// const GovernanceRewards = artifacts.require('./modules/GovernanceRewards.sol');

// const INCH = '0x111111111117dC0aa78b770fA6A738034120C302';

// const OWNER = {
//     'bsc': '0x50A7291bF833303904A6313af274cC8A71044788',
// };

// const GOV_WALLET = {
//     'bsc': '0x7e11a8887A2c445883AcC453738635bC3aCDAdb6',
// };

// module.exports = function (deployer, network) {
//     return deployer.then(async () => {
//         if (network === 'test' || network === 'coverage') {
//             // migrations are not required for testing
//             return;
//         }

//         const account = '0x11799622F4D98A24514011E8527B969f7488eF47';
//         console.log('Deployer account: ' + account);
//         console.log('Deployer balance: ' + (await web3.eth.getBalance(account)) / 1e18 + ' ETH');

//         const governanceMothership = await deployer.deploy(GovernanceMothership, INCH)
//         const exchangeGovernance = await deployer.deploy(ExchangeGovernance, governanceMothership.address);
//         const govRewards = await deployer.deploy(GovernanceRewards, INCH, governanceMothership.address);

//         await Promise.all([
//             governanceMothership.addModule(exchangeGovernance.address),
//             governanceMothership.addModule(govRewards.address),
//             govRewards.setRewardDistribution(GOV_WALLET[network]),
//         ]);

//         await Promise.all([
//             governanceMothership.transferOwnership(OWNER[network]),
//             govRewards.transferOwnership(OWNER[network]),
//         ]);
//     });
// };

module.exports = function (deployer, network) {
};
