# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json


@allow_storage
@dataclass
class Bet:
    side: str
    amount: u256


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


# --- URL helpers (kept top-level so they can be used at resolve time) -------

_URL_SAFE = set(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
)


def _url_encode(s: str) -> str:
    """Minimal percent-encoder. Spaces become '+' for query strings."""
    out = []
    for byte in s.encode("utf-8"):
        ch = chr(byte)
        if ch in _URL_SAFE:
            out.append(ch)
        elif ch == " ":
            out.append("+")
        else:
            out.append(f"%{byte:02X}")
    return "".join(out)


# Lightweight question→coingecko-id mapping. Keyed by lowercase substring.
_COIN_KEYWORDS = [
    ("bitcoin", "bitcoin"),
    ("btc", "bitcoin"),
    ("ethereum", "ethereum"),
    ("ether ", "ethereum"),
    ("eth ", "ethereum"),
    ("solana", "solana"),
    ("ripple", "ripple"),
    ("xrp", "ripple"),
    ("cardano", "cardano"),
    ("ada ", "cardano"),
    ("dogecoin", "dogecoin"),
    ("doge", "dogecoin"),
    ("polkadot", "polkadot"),
    ("dot ", "polkadot"),
    ("chainlink", "chainlink"),
    ("link ", "chainlink"),
    ("avalanche", "avalanche-2"),
    ("avax", "avalanche-2"),
    ("polygon", "matic-network"),
    ("matic", "matic-network"),
    ("litecoin", "litecoin"),
    ("ltc", "litecoin"),
    ("uniswap", "uniswap"),
    ("tether", "tether"),
    ("usdt", "tether"),
    ("usdc", "usd-coin"),
    ("tron", "tron"),
    ("trx", "tron"),
    ("ton ", "the-open-network"),
    ("binance coin", "binancecoin"),
    ("bnb", "binancecoin"),
    ("shiba", "shiba-inu"),
    ("shib ", "shiba-inu"),
]


# coingecko-id → Binance USDT-pair ticker (for klines historical data)
_BINANCE_SYMBOL = {
    "bitcoin": "BTCUSDT",
    "ethereum": "ETHUSDT",
    "solana": "SOLUSDT",
    "ripple": "XRPUSDT",
    "cardano": "ADAUSDT",
    "dogecoin": "DOGEUSDT",
    "polkadot": "DOTUSDT",
    "chainlink": "LINKUSDT",
    "avalanche-2": "AVAXUSDT",
    "matic-network": "MATICUSDT",
    "litecoin": "LTCUSDT",
    "uniswap": "UNIUSDT",
    "tron": "TRXUSDT",
    "the-open-network": "TONUSDT",
    "binancecoin": "BNBUSDT",
    "shiba-inu": "SHIBUSDT",
}


_SPORT_KEYWORDS = [
    "champions league",
    "premier league",
    "world cup",
    "fifa",
    "uefa",
    "nba",
    "nfl",
    "mlb",
    "nhl",
    "wimbledon",
    "olympic",
    "real madrid",
    "manchester",
    "arsenal",
    "barcelona",
    "liverpool",
    "chelsea",
    "super eagles",
    "qualify",
    "title",
    "tournament",
    "match",
    "league",
]

_TECH_KEYWORDS = [
    "spacex",
    "openai",
    "apple",
    "google",
    "microsoft",
    "tesla",
    "nvidia",
    "ai ",
    "gpt",
    "iphone",
    "android",
]

_ENTERTAINMENT_KEYWORDS = [
    "grammy",
    "oscar",
    "emmy",
    "album",
    "movie",
    "film",
    "box office",
    "gta",
    "netflix",
    "music",
]


def _extract_coins(question_lower: str) -> list[str]:
    found: list[str] = []
    padded = question_lower + " "
    for kw, coin_id in _COIN_KEYWORDS:
        if kw in padded and coin_id not in found:
            found.append(coin_id)
    if not found:
        found = ["bitcoin", "ethereum"]
    return found[:2]  # cap fan-out


def _has_any(text: str, words: list[str]) -> bool:
    padded = text + " "
    for word in words:
        if word in padded:
            return True
    return False


def _infer_category(category: str, question_lower: str) -> str:
    """Correct obvious category/source mismatches before validators read URLs."""
    if _has_any(question_lower, _SPORT_KEYWORDS):
        return "sports"
    has_known_coin = _extract_coins(question_lower) != ["bitcoin", "ethereum"]
    if has_known_coin:
        return "crypto"
    if _has_any(question_lower, _ENTERTAINMENT_KEYWORDS):
        return "entertainment"
    if _has_any(question_lower, _TECH_KEYWORDS):
        return "tech"
    if category == "crypto" and not has_known_coin:
        return "world"
    return category if category else "world"


def _build_sources(category: str, question: str) -> list[str]:
    """Return a list of authoritative-data URLs tailored to the market category.

    These URLs are read by every validator inside the eq_principle block, so
    they must be deterministic (same response every time) and parseable.
    Prefer JSON APIs over HTML pages.
    """
    q_lower = question.lower()
    category = _infer_category(category, q_lower)
    q_enc = _url_encode(question)
    sources: list[str] = []

    if category == "crypto":
        for coin in _extract_coins(q_lower):
            # /coins/{id} returns market_data: current_price, ath, ath_date,
            # atl, atl_date, price_change_percentage_*. Best single source for
            # "did X ever happen" style questions.
            sources.append(
                f"https://api.coingecko.com/api/v3/coins/{coin}"
                "?localization=false&tickers=false&community_data=false"
                "&developer_data=false&sparkline=false"
            )
            # Binance monthly klines — full history since the pair was listed,
            # tiny payload (~150 entries). Each row is
            # [openTime, open, high, low, close, volume, closeTime, ...].
            # Free, no API key. This is the authoritative source for
            # "did X trade above $T in month/year Y" questions.
            symbol = _BINANCE_SYMBOL.get(coin)
            if symbol:
                # Monthly candles since pair listing (BTCUSDT: Aug 2017).
                # Each candle is ~200 bytes → ~40KB total uncut.
                sources.append(
                    f"https://api.binance.com/api/v3/klines"
                    f"?symbol={symbol}&interval=1M&limit=200"
                )

    # Google News RSS — free, no key, returns ~50 recent matching articles
    # with title/description/pubDate/source. Best single signal for any
    # event-based question because it surfaces current news headlines.
    google_news = (
        f"https://news.google.com/rss/search?q={q_enc}"
        "&hl=en-US&gl=US&ceid=US:en"
    )

    if category == "sports":
        sources.append(google_news)
        sources.append(
            f"https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e={q_enc}"
        )
        sources.append(
            "https://en.wikipedia.org/w/api.php?action=query&format=json"
            f"&generator=search&gsrsearch={q_enc}&gsrlimit=3"
            "&prop=extracts&exintro=1&explaintext=1&exlimit=3"
        )
        sources.append(
            "https://en.wikipedia.org/w/api.php?action=opensearch"
            f"&search={q_enc}&limit=5&format=json"
        )
        sources.append(
            "https://www.wikidata.org/w/api.php?action=wbsearchentities"
            f"&search={q_enc}&language=en&format=json&limit=5"
        )

    elif category == "tech":
        sources.append(google_news)
        sources.append(
            f"https://hn.algolia.com/api/v1/search?query={q_enc}&tags=story"
        )
        sources.append(
            "https://en.wikipedia.org/w/api.php?action=query&format=json"
            f"&generator=search&gsrsearch={q_enc}&gsrlimit=3"
            "&prop=extracts&exintro=1&explaintext=1&exlimit=3"
        )

    else:  # politics, entertainment, world (and unknown)
        sources.append(google_news)
        sources.append(
            "https://en.wikipedia.org/w/api.php?action=query&format=json"
            f"&generator=search&gsrsearch={q_enc}&gsrlimit=4"
            "&prop=extracts&exintro=1&explaintext=1&exlimit=4"
        )
        sources.append(
            "https://en.wikipedia.org/w/api.php?action=opensearch"
            f"&search={q_enc}&limit=5&format=json"
        )

    return sources


# --- Contract ---------------------------------------------------------------


class PredictionMarket(gl.Contract):
    question: str
    resolution_date: str
    category: str
    creator: Address

    total_yes: u256
    total_no: u256

    bets: TreeMap[Address, Bet]

    resolved: bool
    outcome: str
    resolution_sources: DynArray[str]

    def __init__(
        self,
        question: str,
        resolution_date: str,
        category: str = "world",
    ) -> None:
        self.question = question
        self.resolution_date = resolution_date
        self.category = category if category else "world"
        self.creator = gl.message.origin_address
        self.total_yes = u256(0)
        self.total_no = u256(0)
        self.resolved = False
        self.outcome = ""

    @gl.public.write.payable
    def place_bet(self, side: str) -> None:
        assert not self.resolved, "Market already resolved"
        assert side in ("YES", "NO"), "Side must be YES or NO"
        amount = gl.message.value
        assert amount > 0, "Must send funds to bet"

        sender = gl.message.sender_address
        prior = self.bets.get(sender, Bet(side, u256(0)))
        assert prior.side == side, "Cannot bet both sides; use a new address"
        prior.amount = prior.amount + amount
        self.bets[sender] = prior

        if side == "YES":
            self.total_yes += amount
        else:
            self.total_no += amount

    @gl.public.write
    def resolve_market(self) -> None:
        assert not self.resolved, "Already resolved"

        # Snapshot storage into locals before entering nondet mode — the GenVM
        # cannot read pickled class storage from inside a non-deterministic block.
        question = str(self.question)
        resolution_date = str(self.resolution_date)
        category = _infer_category(str(self.category) if self.category else "world", question.lower())

        sources = _build_sources(category, question)

        def evaluate_source() -> str:
            gathered = ""
            for url in sources:
                try:
                    page = gl.nondet.web.get(url).body.decode("utf-8")

                    # Binance klines: keep only [openTime_ms, high, low, close].
                    # Cuts ~70% of bytes vs the raw 12-field rows, so the full
                    # series fits inside the validator's prompt budget.
                    if "api.binance.com" in url and "/klines" in url:
                        try:
                            rows = json.loads(page)
                            compact = [
                                [int(r[0]), r[2], r[3], r[4]] for r in rows
                            ]
                            page = json.dumps(compact, separators=(",", ":"))
                        except Exception:
                            pass  # fall back to raw body

                    is_structured = (
                        "api.binance.com" in url
                        or "api.coingecko.com" in url
                        or "thesportsdb.com" in url
                        or "market_chart" in url
                        or "news.google.com" in url
                    )
                    cap = 25000 if is_structured else 6000
                    gathered += f"\n\n--- {url} ---\n{page[:cap]}"
                except Exception:
                    continue

            prompt = f"""You are a neutral fact-checker resolving a prediction market.

The data below comes from authoritative structured sources:
  - CoinGecko price API for crypto questions (JSON with current price, ATH, 365d history)
  - Google News RSS for current-event headlines across every non-crypto category
    (XML with <title>, <description>, <pubDate>, <source> per article — read
     the headlines and dates as your primary signal for "did X happen recently")
  - TheSportsDB, Wikipedia, and Wikidata JSON for sports events and tournament results
  - Hacker News search JSON for tech news
  - Wikipedia REST/Query API extracts for everything else

Read the data carefully and return exactly ONE of:
  YES   - the prediction is true based on the data
  NO    - the prediction is false based on the data
  VOID  - genuinely no evidence either way; reserve this for cases where the
          sources are silent on the topic, NOT for cases where you simply
          need to think harder. Strongly prefer YES or NO when possible.

For crypto price questions, you have two complementary source types:

  1. CoinGecko `/coins/{{id}}` → JSON with `market_data.current_price.usd`,
     `market_data.ath.usd`, `market_data.ath_date.usd`, `market_data.atl.usd`,
     `market_data.atl_date.usd`. Use for current price and lifetime extremes.

  2. Binance `/api/v3/klines?symbol=XYZUSDT&interval=1M` → a JSON array of
     monthly candles, **pre-compacted** to `[openTime_ms, high, low, close]`
     (numeric fields are strings — parse as float). One row per month, going
     back to the pair's listing (BTCUSDT: Aug 2017).
     **This is your authoritative historical source.** For "did X trade above
     $T in <month/year>" questions: find the row whose `openTime_ms` falls in
     the asked month and check whether `float(high) >= T`. If yes, answer YES.

Reference timestamps (unix milliseconds):
  Feb 2025 = openTime 1738368000000, closeTime ~1740787199999
  Jan 2025 = 1735689600000
  Dec 2024 = 1733011200000
  Nov 2024 = 1730419200000

Be decisive. If a Binance monthly candle for the asked month shows
`highPrice >= T`, return YES. Do not hedge with VOID just because you wish you
had finer-grained data — the monthly high is sufficient evidence.

For sports questions, use the sports/Wikipedia/Wikidata extracts to identify
the actual winner, champion, qualifier, score, or standings result. If the
source states the named team/player won the named event, answer YES. If it
states a different winner or that the named team/player failed to qualify/win,
answer NO. Do not answer VOID just because one sports source is sparse if
another listed source answers the question.

Category: {category}
Prediction: {question}
Resolution Date: {resolution_date}

Web data:
{gathered[:45000]}

Reply with ONLY one word: YES, NO, or VOID."""
            return gl.nondet.exec_prompt(prompt).strip().upper()

        raw = gl.eq_principle.prompt_comparative(
            evaluate_source,
            principle="The outcome must be the same single word: YES, NO, or VOID.",
        )

        # Be tolerant: the LLM may emit "NO.", "Answer: YES", trailing
        # whitespace, etc. Extract the first occurrence of YES/NO/VOID as a
        # standalone token. Default to VOID only if truly absent.
        upper = (raw or "").upper()
        result = "VOID"
        # Check for each verdict as a whole word (surrounded by non-letters).
        # We scan in priority order — but if multiple appear, the first wins.
        first_pos = len(upper) + 1
        for candidate in ("YES", "NO", "VOID"):
            i = 0
            while True:
                idx = upper.find(candidate, i)
                if idx < 0:
                    break
                before_ok = idx == 0 or not upper[idx - 1].isalpha()
                after_idx = idx + len(candidate)
                after_ok = after_idx == len(upper) or not upper[after_idx].isalpha()
                if before_ok and after_ok and idx < first_pos:
                    first_pos = idx
                    result = candidate
                    break
                i = idx + 1

        self.outcome = result
        self.resolved = True
        for url in sources:
            self.resolution_sources.append(url)

    @gl.public.write
    def claim_winnings(self) -> None:
        assert self.resolved, "Market not yet resolved"
        sender = gl.message.sender_address
        assert sender in self.bets, "No bet found"

        bet = self.bets[sender]
        amount = int(bet.amount)

        if self.outcome == "VOID":
            del self.bets[sender]
            _Recipient(sender).emit_transfer(value=u256(amount))
            return

        assert bet.side == self.outcome, "You are on the losing side"

        winning_pool = self.total_yes if self.outcome == "YES" else self.total_no
        total_pool = self.total_yes + self.total_no
        payout = (amount * int(total_pool)) // int(winning_pool)

        del self.bets[sender]
        _Recipient(sender).emit_transfer(value=u256(payout))

    @gl.public.view
    def get_market_info(self) -> dict:
        return {
            "question": self.question,
            "resolution_date": self.resolution_date,
            "category": _infer_category(
                self.category if self.category else "world",
                str(self.question).lower(),
            ),
            "creator": self.creator,
            "total_yes": int(self.total_yes),
            "total_no": int(self.total_no),
            "resolved": self.resolved,
            "outcome": self.outcome,
            "resolution_sources": [s for s in self.resolution_sources],
        }

    @gl.public.view
    def get_odds(self) -> dict:
        total = int(self.total_yes) + int(self.total_no)
        if total == 0:
            return {"yes": 0.5, "no": 0.5}
        return {
            "yes": int(self.total_yes) / total,
            "no": int(self.total_no) / total,
        }

    @gl.public.view
    def get_user_bet(self, user: str) -> dict:
        bet = self.bets.get(Address(user), Bet("", u256(0)))
        return {"side": bet.side, "amount": int(bet.amount)}
