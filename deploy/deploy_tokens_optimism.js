const { getChainId } = require('hardhat');

const ADDRS = [
    '0x9883a8b0f58b662D60847Db992E66591E2EdE106',
    '0xEAC4F52e9056bF067b02A17B80BA0617C16D85Ac',
];
const MINT_AMOUNT = '1000000000000000000000000';

const TOKENS = [
    ['TOK', 'TOK'],
    ['BAN', 'BAN'],
    ['SIR', 'SIR'],
];

module.exports = async ({ getNamedAccounts, deployments }) => {
    console.log('running deploy script');
    console.log('network id ', await getChainId());

    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const TokenMock = await ethers.getContractFactory('TokenMock-ovm');

    for (const [tokenName, tokenSymbol] of TOKENS) {
        console.log(tokenName, tokenSymbol);
        const token = await deploy('TokenMock-ovm', {
            args: [tokenName, tokenSymbol],
            from: deployer,
        });

        const tokenMock = TokenMock.attach(token.address);

        await tokenMock.mint(deployer, MINT_AMOUNT);
        for (const addr of ADDRS) {
            await tokenMock.mint(addr, MINT_AMOUNT);
        }

        console.log(`token ${tokenName} deployed to: ${token.address}`);
        for (const addr of ADDRS) {
            console.log(addr, await tokenMock.balanceOf(addr));
        }
        console.log(deployer, await tokenMock.balanceOf(deployer));
    }
};

module.exports.skip = async () => true;
