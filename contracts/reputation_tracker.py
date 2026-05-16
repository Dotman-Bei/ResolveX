# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass


@allow_storage
@dataclass
class Score:
    markets_created: u256
    correct_predictions: u256
    total_bets: u256
    total_won: u256


class ReputationTracker(gl.Contract):
    scores: TreeMap[Address, Score]
    addresses: DynArray[Address]
    owner: Address
    market_factory: Address

    def __init__(self, market_factory: str) -> None:
        self.owner = gl.message.sender_address
        self.market_factory = Address(market_factory)

    def _ensure(self, user: Address) -> None:
        if user not in self.scores:
            self.scores[user] = Score(u256(0), u256(0), u256(0), u256(0))
            self.addresses.append(user)

    @gl.public.write
    def record_market_created(self, user: str) -> None:
        assert gl.message.sender_address == self.market_factory, "Only factory may record"
        user_addr = Address(user)
        self._ensure(user_addr)
        s = self.scores[user_addr]
        s.markets_created = s.markets_created + u256(1)
        self.scores[user_addr] = s

    @gl.public.write
    def update_score(self, user: str, won: bool) -> None:
        user_addr = Address(user)
        self._ensure(user_addr)
        s = self.scores[user_addr]
        s.total_bets = s.total_bets + u256(1)
        if won:
            s.correct_predictions = s.correct_predictions + u256(1)
            s.total_won = s.total_won + u256(1)
        self.scores[user_addr] = s

    @gl.public.view
    def get_profile(self, user: str) -> dict:
        user_addr = Address(user)
        if user_addr not in self.scores:
            return {
                "markets_created": 0,
                "correct_predictions": 0,
                "total_bets": 0,
                "total_won": 0,
                "accuracy_rate": 0.0,
            }
        s = self.scores[user_addr]
        total = max(int(s.total_bets), 1)
        return {
            "markets_created": int(s.markets_created),
            "correct_predictions": int(s.correct_predictions),
            "total_bets": int(s.total_bets),
            "total_won": int(s.total_won),
            "accuracy_rate": int(s.correct_predictions) / total,
        }

    @gl.public.view
    def get_leaderboard(self) -> list[dict]:
        rows = []
        for a in self.addresses:
            s = self.scores[a]
            total = max(int(s.total_bets), 1)
            rows.append(
                {
                    "address": a,
                    "markets_created": int(s.markets_created),
                    "correct_predictions": int(s.correct_predictions),
                    "total_bets": int(s.total_bets),
                    "accuracy_rate": int(s.correct_predictions) / total,
                }
            )
        rows.sort(key=lambda r: r["accuracy_rate"], reverse=True)
        return rows[:10]
