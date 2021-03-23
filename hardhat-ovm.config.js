require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-truffle5');
require('hardhat-deploy');
require('@eth-optimism/plugins/hardhat/compiler');
require('dotenv').config();

module.exports = {
    ovm: {
        solcVersion: '0.6.12',
    },
    solidity: {
        version: '0.6.12',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000000,
            },
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    networks: {
        hardhat: {
            blockGasLimit: 10000000,
        },
        'optimism-kovan': {
            url: 'https://kovan.optimism.io',
            chainId: 69,
            gasPrice: 0,
            gas: 6000000,
            accounts: [process.env.OPTIMISM_KOVAN_PRIVATE_KEY],
        },
    },
};
