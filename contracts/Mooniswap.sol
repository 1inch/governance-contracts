// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./libraries/UniERC20.sol";
import "./libraries/Sqrt.sol";
import "./libraries/VirtualBalance.sol";
import "./libraries/Voting.sol";
import "./interfaces/IMooniFactory.sol";
import "./MooniswapConstants.sol";


contract Mooniswap is ERC20, ReentrancyGuard, Ownable, MooniswapConstants {
    using Sqrt for uint256;
    using SafeMath for uint256;
    using UniERC20 for IERC20;
    using VirtualBalance for VirtualBalance.Data;
    using Voting for mapping(address => uint256);

    struct Balances {
        uint256 src;
        uint256 dst;
    }

    struct SwapVolumes {
        uint128 confirmed;
        uint128 result;
    }

    event Deposited(
        address indexed sender,
        address indexed receiver,
        uint256 amount
    );

    event Withdrawn(
        address indexed sender,
        address indexed receiver,
        uint256 amount
    );

    event Swapped(
        address indexed sender,
        address indexed receiver,
        address indexed srcToken,
        uint256 amount,
        uint256 result,
        uint256 srcBalance,
        uint256 dstBalance,
        uint256 totalSupply,
        address referral
    );

    event FeeUpdate(
        uint256 fee
    );

    event DecayPeriodUpdate(
        uint256 decayPeriod
    );

    uint256 public constant REFERRAL_SHARE = 20; // 1/share = 5% of LPs revenue
    uint256 public constant BASE_SUPPLY = 1000;  // Total supply on first deposit
    uint256 public constant FEE_DENOMINATOR = 1e18;

    IMooniFactory private immutable _factory;
    IERC20 public immutable token0;
    IERC20 public immutable token1;
    mapping(IERC20 => SwapVolumes) public volumes;
    mapping(IERC20 => VirtualBalance.Data) public virtualBalancesForAddition;
    mapping(IERC20 => VirtualBalance.Data) public virtualBalancesForRemoval;

    uint256 public fee;
    uint256 public decayPeriod;
    mapping(address => uint256) public feeVotes;
    mapping(address => uint256) public decayPeriodVotes;

    constructor(IERC20 _token0, IERC20 _token1, string memory name, string memory symbol) public ERC20(name, symbol) {
        require(_token0 != _token1, "Mooniswap: duplicate tokens");
        require(bytes(name).length > 0, "Mooniswap: name is empty");
        require(bytes(symbol).length > 0, "Mooniswap: symbol is empty");

        _factory = IMooniFactory(msg.sender);
        token0 = _token0;
        token1 = _token1;
    }

    function factory() public view virtual returns(IMooniFactory) {
        return _factory;
    }

    function getTokens() external view returns(IERC20[2] memory) {
        return [token0, token1];
    }

    function tokens(uint256 i) external view returns(IERC20) {
        if (i == 0) {
            return token0;
        } else if (i == 1) {
            return token1;
        }
    }

    function getBalanceForAddition(IERC20 token) public view returns(uint256) {
        uint256 balance = token.uniBalanceOf(address(this));
        return Math.max(virtualBalancesForAddition[token].current(decayPeriod, balance), balance);
    }

    function getBalanceForRemoval(IERC20 token) public view returns(uint256) {
        uint256 balance = token.uniBalanceOf(address(this));
        return Math.min(virtualBalancesForRemoval[token].current(decayPeriod, balance), balance);
    }

    function getReturn(IERC20 src, IERC20 dst, uint256 amount) external view returns(uint256) {
        return _getReturn(src, dst, amount, getBalanceForAddition(src), getBalanceForRemoval(dst));
    }

    function deposit(uint256[2] memory maxAmounts, uint256[2] memory minAmounts) external payable returns(uint256 fairSupply) {
        return depositFor(maxAmounts, minAmounts, msg.sender);
    }

    function depositFor(uint256[2] memory maxAmounts, uint256[2] memory minAmounts, address target) public payable nonReentrant returns(uint256 fairSupply) {
        IERC20[2] memory _tokens = [token0, token1];
        require(msg.value == (_tokens[0].isETH() ? maxAmounts[0] : (_tokens[1].isETH() ? maxAmounts[1] : 0)), "Mooniswap: wrong value usage");

        uint256[2] memory realBalances;
        for (uint i = 0; i < realBalances.length; i++) {
            realBalances[i] = _tokens[i].uniBalanceOf(address(this)).sub(_tokens[i].isETH() ? msg.value : 0);
        }

        uint256 totalSupply = totalSupply();
        if (totalSupply == 0) {
            fairSupply = BASE_SUPPLY.mul(99);
            _mint(address(this), BASE_SUPPLY); // Donate up to 1%

            // Use the greatest token amount but not less than 99k for the initial supply
            for (uint i = 0; i < maxAmounts.length; i++) {
                fairSupply = Math.max(fairSupply, maxAmounts[i]);
            }
        }
        else {
            // Pre-compute fair supply
            fairSupply = type(uint256).max;
            for (uint i = 0; i < maxAmounts.length; i++) {
                fairSupply = Math.min(fairSupply, totalSupply.mul(maxAmounts[i]).div(realBalances[i]));
            }
        }

        uint256 fairSupplyCached = fairSupply;
        for (uint i = 0; i < maxAmounts.length; i++) {
            require(maxAmounts[i] > 0, "Mooniswap: amount is zero");
            uint256 amount = (totalSupply == 0) ? maxAmounts[i] :
                realBalances[i].mul(fairSupplyCached).add(totalSupply - 1).div(totalSupply);
            require(amount >= minAmounts[i], "Mooniswap: minAmount not reached");

            _tokens[i].uniTransferFrom(msg.sender, address(this), amount);
            if (totalSupply > 0) {
                uint256 confirmed = _tokens[i].uniBalanceOf(address(this)).sub(realBalances[i]);
                fairSupply = Math.min(fairSupply, totalSupply.mul(confirmed).div(realBalances[i]));
            }
        }

        if (totalSupply > 0) {
            for (uint i = 0; i < maxAmounts.length; i++) {
                virtualBalancesForRemoval[_tokens[i]].scale(decayPeriod, realBalances[i], totalSupply.add(fairSupply), totalSupply);
                virtualBalancesForAddition[_tokens[i]].scale(decayPeriod, realBalances[i], totalSupply.add(fairSupply), totalSupply);
            }
        }

        require(fairSupply > 0, "Mooniswap: result is not enough");
        _mint(target, fairSupply);

        emit Deposited(msg.sender, target, fairSupply);
    }

    function withdraw(uint256 amount, uint256[] memory minReturns) external {
        withdrawFor(amount, minReturns, msg.sender);
    }

    function withdrawFor(uint256 amount, uint256[] memory minReturns, address payable target) public nonReentrant {
        IERC20[2] memory _tokens = [token0, token1];

        uint256 totalSupply = totalSupply();
        _burn(msg.sender, amount);

        for (uint i = 0; i < _tokens.length; i++) {
            IERC20 token = _tokens[i];

            uint256 preBalance = token.uniBalanceOf(address(this));
            uint256 value = preBalance.mul(amount).div(totalSupply);
            token.uniTransfer(target, value);
            require(i >= minReturns.length || value >= minReturns[i], "Mooniswap: result is not enough");

            virtualBalancesForAddition[token].scale(decayPeriod, preBalance, totalSupply.sub(amount), totalSupply);
            virtualBalancesForRemoval[token].scale(decayPeriod, preBalance, totalSupply.sub(amount), totalSupply);
        }

        emit Withdrawn(msg.sender, target, amount);
    }

    function swap(IERC20 src, IERC20 dst, uint256 amount, uint256 minReturn, address referral) external payable returns(uint256 result) {
        return swapFor(src, dst, amount, minReturn, referral, msg.sender);
    }

    // solhint-disable-next-line visibility-modifier-order
    function swapFor(IERC20 src, IERC20 dst, uint256 amount, uint256 minReturn, address referral, address payable receiver) public payable nonReentrant returns(uint256 result) {
        require(msg.value == (src.isETH() ? amount : 0), "Mooniswap: wrong value usage");

        Balances memory balances = Balances({
            src: src.uniBalanceOf(address(this)).sub(src.isETH() ? msg.value : 0),
            dst: dst.uniBalanceOf(address(this))
        });

        // catch possible airdrops and external balance changes for deflationary tokens
        uint256 srcAdditionBalance = Math.max(virtualBalancesForAddition[src].current(decayPeriod, balances.src), balances.src);
        uint256 dstRemovalBalance = Math.min(virtualBalancesForRemoval[dst].current(decayPeriod, balances.dst), balances.dst);

        src.uniTransferFrom(msg.sender, address(this), amount);
        uint256 confirmed = src.uniBalanceOf(address(this)).sub(balances.src);
        result = _getReturn(src, dst, confirmed, srcAdditionBalance, dstRemovalBalance);
        require(result > 0 && result >= minReturn, "Mooniswap: return is not enough");
        dst.uniTransfer(receiver, result);

        // Update virtual balances to the same direction only at imbalanced state
        if (srcAdditionBalance != balances.src) {
            virtualBalancesForAddition[src].set(srcAdditionBalance.add(confirmed));
        }
        if (dstRemovalBalance != balances.dst) {
            virtualBalancesForRemoval[dst].set(dstRemovalBalance.sub(result));
        }

        // Update virtual balances to the opposite direction
        virtualBalancesForRemoval[src].update(decayPeriod, balances.src);
        virtualBalancesForAddition[dst].update(decayPeriod, balances.dst);

        if (referral != address(0)) {
            uint256 invariantRatio = uint256(1e36);
            invariantRatio = invariantRatio.mul(balances.src.add(confirmed)).div(balances.src);
            invariantRatio = invariantRatio.mul(balances.dst.sub(result)).div(balances.dst);
            invariantRatio = invariantRatio.sqrt();
            if (invariantRatio > 1e18) {
                // calculate share only if invariant increased
                uint256 referralShare = totalSupply().mul(invariantRatio.sub(1e18)).div(invariantRatio).div(REFERRAL_SHARE);
                if (referralShare > 0) {
                    _mint(referral, referralShare);
                }
            }
        }

        emit Swapped(msg.sender, receiver, address(src), confirmed, result, balances.src, balances.dst, totalSupply(), referral);

        // Overflow of uint128 is desired
        volumes[src].confirmed += uint128(confirmed);
        volumes[src].result += uint128(result);
    }

    function rescueFunds(IERC20 token, uint256 amount) external nonReentrant onlyOwner {
        uint256 balance0 = token0.uniBalanceOf(address(this));
        uint256 balance1 = token1.uniBalanceOf(address(this));

        token.uniTransfer(msg.sender, amount);

        require(token0.uniBalanceOf(address(this)) >= balance0, "Mooniswap: access denied");
        require(token1.uniBalanceOf(address(this)) >= balance1, "Mooniswap: access denied");
        require(balanceOf(address(this)) >= BASE_SUPPLY, "Mooniswap: access denied");
    }

    function feeVote(uint256 vote) external nonReentrant {
        require(vote <= MAX_FEE, "Fee vote is too high");
        (uint256 prevVote, bool defaultVote) = feeVotes.get(msg.sender, _factory.fee);
        if (defaultVote || vote != prevVote) {
            feeVotes.set(msg.sender, vote);
            uint256 prevFee = fee;
            uint256 newFee = _recalcAverage(prevFee, vote, prevVote, balanceOf(msg.sender), totalSupply());
            if (newFee != prevFee) {
                emit FeeUpdate(newFee);
                fee = newFee;
            }
        }
    }

    function decayPeriodVote(uint256 vote) external nonReentrant {
        require(vote <= MAX_DECAY_PERIOD, "Decay period vote is too high");
        (uint256 prevVote, bool defaultVote) = decayPeriodVotes.get(msg.sender, _factory.decayPeriod);
        if (defaultVote || vote != prevVote) {
            feeVotes.set(msg.sender, vote);
            uint256 prevDecayPeriod = decayPeriod;
            uint256 newDecayPeriod = _recalcAverage(prevDecayPeriod, vote, prevVote, balanceOf(msg.sender), totalSupply());
            if (newDecayPeriod != prevDecayPeriod) {
                emit DecayPeriodUpdate(newDecayPeriod);
                decayPeriod = newDecayPeriod;
            }
        }
    }

    function discardFeeVote() external nonReentrant {
        feeVotes.discard(msg.sender);
    }

    function discardDecayPeriodVote() external nonReentrant {
        decayPeriodVotes.discard(msg.sender);
    }
 
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override { 
        uint256 totalWeight = totalSupply();
        uint256 prevFee = fee;
        uint256 prevDecayPeriod = decayPeriod;
        uint256 newFee = prevFee.mul(totalWeight);
        uint256 newDecayPeriod = prevDecayPeriod.mul(totalWeight);
        if (from != address(0)) {
            (uint256 _feeVote, ) = feeVotes.get(from, _factory.fee);
            newFee = newFee.sub(_feeVote.mul(amount));
            (uint256 _decayPeriodVote, ) = decayPeriodVotes.get(from, _factory.decayPeriod);
            newDecayPeriod = newDecayPeriod.sub(_decayPeriodVote.mul(amount));
            if (balanceOf(from) == amount) {
                feeVotes.discard(from);
                decayPeriodVotes.discard(from);
            }
            totalWeight = totalWeight.sub(amount);
        }
        if (to != address(0)) {
            (uint256 _feeVote, ) = feeVotes.get(to, _factory.fee);
            newFee = newFee.add(_feeVote.mul(amount));
            (uint256 _decayPeriodVote, ) = decayPeriodVotes.get(to, _factory.decayPeriod);
            newDecayPeriod = newDecayPeriod.add(_decayPeriodVote.mul(amount));
            totalWeight = totalWeight.add(amount);
        }
        newFee = newFee.div(totalWeight);
        newDecayPeriod = newDecayPeriod.div(totalWeight);
        if (newFee != prevFee) {
            emit FeeUpdate(newFee);
            fee = newFee;
        }
        if (newDecayPeriod != prevDecayPeriod) {
            emit DecayPeriodUpdate(newDecayPeriod);
            decayPeriod = newDecayPeriod;
        }
    }

    function _recalcAverage(uint256 total, uint256 vote, uint256 prev, uint256 weight, uint256 totalWeight) internal pure returns(uint256) {
        return total.mul(totalWeight).add(vote.mul(weight)).sub(prev.mul(weight)).div(totalWeight);
    }

    function _getReturn(IERC20 src, IERC20 dst, uint256 amount, uint256 srcBalance, uint256 dstBalance) internal view returns(uint256) {
        if (src > dst) {
            (src, dst) = (dst, src);
        }
        if (src != dst && amount > 0 && src == token0 && dst == token1) {
            uint256 taxedAmount = amount.sub(amount.mul(fee).div(FEE_DENOMINATOR));
            return taxedAmount.mul(dstBalance).div(srcBalance.add(taxedAmount));
        }
    }
}
