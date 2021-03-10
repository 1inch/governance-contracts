require('@nomiclabs/hardhat-ethers');
require('hardhat-deploy');
require('@nomiclabs/hardhat-truffle5');
require('solidity-coverage');
require('hardhat-gas-reporter');
require('dotenv').config();

module.exports = {
    solidity: {
        version: '0.6.12',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000000,
            },
        },
    },
    networks: {
        hardhat: {
            blockGasLimit: 10000000,
        },
        mainnet: {
            url: process.env.MAINNET_RPC_URL,
            chainId: 1,
            gasPrice: 120000000000,
            gas: 3000000,
            accounts: [process.env.MAINNET_PRIVATE_KEY],
        },
        bsc: {
            url: process.env.BSC_RPC_URL,
            chainId: 56,
            gasPrice: 10000000000,
            accounts: [process.env.BSC_PRIVATE_KEY],
        }
    },
    namedAccounts: {
        deployer: {
            default: 0
        },
    },
    etherscan: {
        apiKey: process.env.BSC_ETHERSCAN_KEY,
    },
    gasReporter: {
        enable: true,
        currency: 'USD',
    },
};
