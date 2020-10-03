// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Vote.sol";


library Voting {
    using SafeMath for uint256;
    using Vote for Vote.Data;

    struct Data {
        uint256 result;
        mapping(address => Vote.Data) votes;
    }

    function updateVote(
        Voting.Data storage self,
        address user,
        Vote.Data memory oldVote,
        Vote.Data memory newVote,
        uint256 balance,
        uint256 totalSupply,
        uint256 defaultVote
    ) internal returns(uint256 newResult, bool changed) {
        return _update(self, user, oldVote, newVote, balance, balance, totalSupply, totalSupply, defaultVote);
    }

    function updateBalance(
        Voting.Data storage self,
        address user,
        Vote.Data memory oldVote,
        uint256 oldBalance,
        uint256 newBalance,
        uint256 oldTotalSupply,
        uint256 newTotalSupply,
        uint256 defaultVote
    ) internal returns(uint256 newResult, bool changed) {
        Vote.Data memory newVote = newBalance == 0 ? Vote.init() : oldVote;
        return _update(self, user, oldVote, newVote, oldBalance, newBalance, oldTotalSupply, newTotalSupply, defaultVote);
    }

    function _update(
        Voting.Data storage self,
        address user,
        Vote.Data memory oldVote,
        Vote.Data memory newVote,
        uint256 oldBalance,
        uint256 newBalance,
        uint256 oldTotalSupply,
        uint256 newTotalSupply,
        uint256 defaultVote
    ) private returns(uint256 newResult, bool changed) {
        uint256 oldResult = self.result;
        newResult = oldResult;
        newResult = newResult.mul(oldTotalSupply);
        newResult = newResult.add(newBalance.mul(newVote.get(defaultVote)));
        newResult = newResult.sub(oldBalance.mul(oldVote.get(defaultVote)));
        newResult = newResult.div(newTotalSupply);

        if (newResult != oldResult) {
            self.result = newResult;
            changed = true;
        }

        if (!newVote.eq(oldVote)) {
            self.votes[user] = newVote;
        }
    }
}
