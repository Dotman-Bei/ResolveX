# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *


class MarketFactory(gl.Contract):
    """
    Registry-only factory.

    Markets (PredictionMarket and P2PBet) are deployed directly by the
    user/script as top-level contracts. After deployment they call
    register_market / register_p2p here to make themselves discoverable.
    """

    markets: DynArray[Address]
    p2p_bets: DynArray[Address]
    categories: TreeMap[Address, str]
    creators: TreeMap[Address, Address]
    owner: Address

    def __init__(self) -> None:
        self.owner = gl.message.sender_address

    @gl.public.write
    def register_market(self, market: str, category: str) -> None:
        assert category in [
            "crypto",
            "sports",
            "politics",
            "entertainment",
            "tech",
            "world",
        ], "Invalid category"
        addr = Address(market)
        if addr in self.categories:
            return
        self.markets.append(addr)
        self.categories[addr] = category
        self.creators[addr] = gl.message.origin_address

    @gl.public.write
    def register_p2p(self, bet: str) -> None:
        addr = Address(bet)
        if addr in self.creators:
            return
        self.p2p_bets.append(addr)
        self.creators[addr] = gl.message.origin_address

    @gl.public.view
    def get_all_markets(self) -> list[Address]:
        return [a for a in self.markets]

    @gl.public.view
    def get_all_p2p(self) -> list[Address]:
        return [a for a in self.p2p_bets]

    @gl.public.view
    def get_markets_by_category(self, category: str) -> list[Address]:
        return [a for a in self.markets if self.categories.get(a, "") == category]

    @gl.public.view
    def market_count(self) -> int:
        return len(self.markets)

    @gl.public.view
    def p2p_count(self) -> int:
        return len(self.p2p_bets)
