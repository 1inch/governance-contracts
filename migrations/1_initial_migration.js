const GovernanceMothership = artifacts.require('./inch/GovernanceMothership.sol');
const ExchangeGovernance = artifacts.require('./ExchangeGovernance.sol');
const GovernanceRewards = artifacts.require('./governance/GovernanceRewards.sol');

const TOKENS = {
    INCH: '0x111111111117dC0aa78b770fA6A738034120C302',
};

const TOKEN = {
    mainnet: TOKENS.INCH,
    'mainnet-fork': TOKENS.INCH,
};

const POOL_OWNER = {
    mainnet: '0x5E89f8d81C74E311458277EA1Be3d3247c7cd7D1',
    'mainnet-fork': '0x5E89f8d81C74E311458277EA1Be3d3247c7cd7D1',
};

const MOTHERSHIP = {
    mainnet: '0xA0446D8804611944F1B527eCD37d7dcbE442caba',
    'mainnet-fork': '0xA0446D8804611944F1B527eCD37d7dcbE442caba',
};

const EXCHANGE_GOV = {
    mainnet: '0xB33839E05CE9Fc53236Ae325324A27612F4d110D',
    'mainnet-fork': '0xB33839E05CE9Fc53236Ae325324A27612F4d110D',
};

const GOV_REWARDS = {
    mainnet: '0x0F85A912448279111694F4Ba4F85dC641c54b594',
    'mainnet-fork': '0x0F85A912448279111694F4Ba4F85dC641c54b594',
};

const GOV_WALLET = {
    mainnet: '0x7e11a8887A2c445883AcC453738635bC3aCDAdb6',
    'mainnet-fork': '0x7e11a8887A2c445883AcC453738635bC3aCDAdb6',
};

module.exports = function (deployer, network) {
    return deployer.then(async () => {
        if (network === 'test' || network === 'coverage') {
            // migrations are not required for testing
            return;
        }

        const account = '0x11799622F4D98A24514011E8527B969f7488eF47';
        console.log('Deployer account: ' + account);
        console.log('Deployer balance: ' + (await web3.eth.getBalance(account)) / 1e18 + ' ETH');

        const governanceMothership = (network in MOTHERSHIP) ? await GovernanceMothership.at(MOTHERSHIP[network]) : await deployer.deploy(GovernanceMothership, TOKEN[network]);

        // Exchange Governance

        let exchangeGovernance;
        if (network in EXCHANGE_GOV) {
            exchangeGovernance = await ExchangeGovernance.at(EXCHANGE_GOV[network]);
        } else {
            exchangeGovernance = await deployer.deploy(ExchangeGovernance, governanceMothership.address);

            if (await governanceMothership.owner() === account) {
                await governanceMothership.addModule(exchangeGovernance.address);
            } else {
                console.log(
                    'Do not forget to governanceMothership.addModule(exchangeGovernance.address), where:\n' +
                    ` - governanceMothership = ${governanceMothership.address}\n` +
                    ` - exchangeGovernance = ${exchangeGovernance.address}\n` +
                    ` - governanceMothership.owner() = ${await governanceMothership.owner()}\n`,
                );
            }
        }

        // Governance

        let govRewards;
        if (network in GOV_REWARDS) {
            govRewards = await GovernanceRewards.at(GOV_REWARDS[network]);
        } else {
            govRewards = await deployer.deploy(GovernanceRewards, TOKEN[network], governanceMothership.address);

            if (await governanceMothership.owner() === account) {
                await governanceMothership.addModule(govRewards.address);
            } else {
                console.log(
                    'Do not forget to governanceMothership.addModule(govRewards.address), where:\n' +
                    ` - governanceMothership = ${governanceMothership.address}\n` +
                    ` - govRewards = ${govRewards.address}\n` +
                    ` - governanceMothership.owner() = ${await governanceMothership.owner()}\n`,
                );
            }
        }

        if (await govRewards.rewardDistribution() !== GOV_WALLET[network]) {
            if (await govRewards.owner() === account) {
                await govRewards.setRewardDistribution(GOV_WALLET[network]);
            } else {
                console.log(
                    'Do not forget to govRewards.setRewardDistribution(GOV_WALLET[network]), where:\n' +
                    ` - govRewards = ${govRewards.address}\n` +
                    ` - GOV_WALLET[network] = ${GOV_WALLET[network]}\n` +
                    ` - govRewards.owner() = ${await govRewards.owner()}\n`,
                );
            }
        }

        // Transfer Ownership

        if (await governanceMothership.owner() === account) {
            await governanceMothership.transferOwnership(POOL_OWNER[network]);
        } else if (await governanceMothership.owner() !== POOL_OWNER[network]) {
            console.log(
                'Do not forget to governanceMothership.transferOwnership(POOL_OWNER[network]), where:\n' +
                ` - governanceMothership = ${governanceMothership.address}\n` +
                ` - POOL_OWNER[network] = ${POOL_OWNER[network]}\n` +
                ` - governanceMothership.owner() = ${await governanceMothership.owner()}\n`,
            );
        }

        if ((await govRewards.owner()) === account) {
            await govRewards.transferOwnership(POOL_OWNER[network]);
        } else if (await govRewards.owner() !== POOL_OWNER[network]) {
            console.log(
                'Do not forget to govRewards.transferOwnership(POOL_OWNER[network]), where:\n' +
                ` - govRewards = ${govRewards.address}\n` +
                ` - POOL_OWNER[network] = ${POOL_OWNER[network]}\n` +
                ` - govRewards.owner() = ${await govRewards.owner()}\n`,
            );
        }
    });
};
