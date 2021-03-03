require('@nomiclabs/hardhat-truffle5');
require('solidity-coverage');
require('hardhat-gas-reporter');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
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
    },
    gasReporter: {
        enable: true,
        currency: 'USD',
        outputFile: process.env.CI ? 'gas-report.txt' : undefined,
    },
};