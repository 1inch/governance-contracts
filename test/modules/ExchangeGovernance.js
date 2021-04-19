const { ether, time, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { timeIncreaseTo } = require('../helpers/utils.js');

const ExchangeGovernance = artifacts.require('ExchangeGovernance');

contract('ExchangeGovernance', function ([_, wallet1, wallet2]) {
    beforeEach(async function () {
        this.exchangeGovernance = await ExchangeGovernance.new(_);
        await this.exchangeGovernance.notifyStakeChanged(_, ether('1'));
    });

    async function checkDefaultParams (exchangeGovernance) {
        return checkParams(exchangeGovernance, ether('0.8'), ether('0.2'));
    }

    async function checkParams (exchangeGovernance, govShare, refShare) {
        const params = await exchangeGovernance.parameters();
        return params[0].eq(govShare) && params[1].eq(refShare);
    }

    it('should correctly vote for shares', async function () {
        expect(await checkDefaultParams(this.exchangeGovernance)).to.be.true;
        await this.exchangeGovernance.leftoverShareVote(ether('0.2'));
        expect(await checkDefaultParams(this.exchangeGovernance)).to.be.true;
        await timeIncreaseTo((await time.latest()).addn(86500));
        expect(await checkParams(this.exchangeGovernance, ether('0.2'), ether('0.8'))).to.be.true;
    });

    it('should reject big shares', async function () {
        expect(await checkDefaultParams(this.exchangeGovernance)).to.be.true;
        await expectRevert(
            this.exchangeGovernance.leftoverShareVote(ether('1.1')),
            'Governance share is too high',
        );
    });

    it('should discard shares vote', async function () {
        expect(await checkDefaultParams(this.exchangeGovernance)).to.be.true;
        await this.exchangeGovernance.leftoverShareVote(ether('0.2'));
        await this.exchangeGovernance.discardLeftoverShareVote();
        await timeIncreaseTo((await time.latest()).addn(86500));
        expect(await checkDefaultParams(this.exchangeGovernance)).to.be.true;
    });

    it('should reset fee vote on unstake', async function () {
        expect(await checkDefaultParams(this.exchangeGovernance)).to.be.true;
        await this.exchangeGovernance.leftoverShareVote(ether('0.2'));
        await this.exchangeGovernance.notifyStakeChanged(_, '0');
        await timeIncreaseTo((await time.latest()).addn(86500));
        expect(await checkDefaultParams(this.exchangeGovernance)).to.be.true;
    });

    it('3 users', async function () {
        await this.exchangeGovernance.notifyStakeChanged(wallet1, ether('1'));
        await this.exchangeGovernance.leftoverShareVote(ether('0.3'), { from: wallet1 });

        await this.exchangeGovernance.notifyStakeChanged(wallet2, ether('1'));
        await this.exchangeGovernance.leftoverShareVote(ether('0.1'), { from: wallet2 });

        await timeIncreaseTo((await time.latest()).addn(86500));

        expect(await checkParams(this.exchangeGovernance, ether('0.4'), ether('0.6'))).to.be.true;

        await this.exchangeGovernance.leftoverShareVote(ether('0.2'));

        await timeIncreaseTo((await time.latest()).addn(86500));

        expect(await checkParams(this.exchangeGovernance, ether('0.2'), ether('0.8'))).to.be.true;

        await this.exchangeGovernance.notifyStakeChanged(wallet1, '0');

        await timeIncreaseTo((await time.latest()).addn(86500));

        expect(await checkParams(this.exchangeGovernance, ether('0.15'), ether('0.85'))).to.be.true;

        await this.exchangeGovernance.discardLeftoverShareVote();

        await timeIncreaseTo((await time.latest()).addn(86500));

        expect(await checkParams(this.exchangeGovernance, ether('0.45'), ether('0.55'))).to.be.true;
    });
});
