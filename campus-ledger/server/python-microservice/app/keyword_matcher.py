import json
import logging
import os
import importlib
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from rapidfuzz import fuzz

logger = logging.getLogger(__name__)


class KeywordMatcher:
    """
    Fuzzy keyword matcher with hybrid storage:
    - Base keywords from config/keywords.json (version controlled)
    - Learned keywords from config/keywords.learned.json (runtime cache)
    - Optional MongoDB sync for shared runtime learning
    """

    def __init__(self):
        app_dir = Path(__file__).resolve().parent
        root_dir = app_dir.parent
        config_dir = root_dir / "config"

        self.base_path = config_dir / "keywords.json"
        self.learned_path = config_dir / "keywords.learned.json"

        self.minimum_confidence = int(os.getenv("OCR_FUZZY_MIN_CONFIDENCE", "82"))
        self.auto_learn_confidence = int(os.getenv("OCR_FUZZY_AUTO_LEARN_CONFIDENCE", "92"))

        self._keywords: Dict[str, List[str]] = {}
        self.mongo_collection = None

        self._load_keywords()
        self._connect_mongo()
        self._merge_mongo_keywords()

    def _load_json_file(self, path: Path) -> Dict[str, List[str]]:
        if not path.exists():
            return {}

        try:
            with path.open("r", encoding="utf-8") as fp:
                payload = json.load(fp)
            if isinstance(payload, dict):
                return {
                    str(k): [str(v).strip().lower() for v in vals if str(v).strip()]
                    for k, vals in payload.items()
                    if isinstance(vals, list)
                }
        except Exception as exc:
            logger.warning("Failed loading keyword file %s: %s", path, exc)

        return {}

    def _save_learned_keywords(self) -> None:
        self.learned_path.parent.mkdir(parents=True, exist_ok=True)

        # Persist only entries not present in base file for cleaner diffs
        base_keywords = self._load_json_file(self.base_path)
        learned_only: Dict[str, List[str]] = {}

        for category, words in self._keywords.items():
            base_set = set(base_keywords.get(category, []))
            delta = sorted([w for w in words if w not in base_set])
            if delta:
                learned_only[category] = delta

        with self.learned_path.open("w", encoding="utf-8") as fp:
            json.dump(learned_only, fp, indent=2)

    def _merge_keywords(self, incoming: Dict[str, List[str]]) -> None:
        for category, words in incoming.items():
            category_words = set(self._keywords.get(category, []))
            category_words.update([w.strip().lower() for w in words if w.strip()])
            self._keywords[category] = sorted(category_words)

    def _load_keywords(self) -> None:
        base = self._load_json_file(self.base_path)
        learned = self._load_json_file(self.learned_path)

        self._keywords = {}
        self._merge_keywords(base)
        self._merge_keywords(learned)

        logger.info("[KeywordMatcher] Loaded categories: %s", list(self._keywords.keys()))

    def _connect_mongo(self) -> None:
        mongo_uri = os.getenv("MONGO_URI")
        mongo_db = os.getenv("OCR_KEYWORD_DB", "campus_ledger")
        mongo_collection = os.getenv("OCR_KEYWORD_COLLECTION", "ocr_keyword_dictionary")

        if not mongo_uri:
            logger.info("[KeywordMatcher] MONGO_URI not set; skipping Mongo keyword sync")
            return

        try:
            pymongo = importlib.import_module("pymongo")
            MongoClient = pymongo.MongoClient

            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")
            self.mongo_collection = client[mongo_db][mongo_collection]
            logger.info(
                "[KeywordMatcher] Connected to MongoDB keyword store: %s.%s",
                mongo_db,
                mongo_collection,
            )
        except Exception as exc:
            logger.warning("[KeywordMatcher] Mongo connection failed, using JSON-only mode: %s", exc)
            self.mongo_collection = None

    def _merge_mongo_keywords(self) -> None:
        if self.mongo_collection is None:
            return

        try:
            docs = self.mongo_collection.find({}, {"_id": 0, "category": 1, "keywords": 1})
            mongo_payload: Dict[str, List[str]] = {}
            for doc in docs:
                category = str(doc.get("category", "")).strip()
                words = doc.get("keywords", [])
                if not category or not isinstance(words, list):
                    continue
                mongo_payload[category] = [str(w).strip().lower() for w in words if str(w).strip()]

            if mongo_payload:
                self._merge_keywords(mongo_payload)
                logger.info("[KeywordMatcher] Merged Mongo keywords for %d categories", len(mongo_payload))
        except Exception as exc:
            logger.warning("[KeywordMatcher] Failed reading Mongo keywords: %s", exc)

    def get_keywords(self, category: str) -> List[str]:
        return self._keywords.get(category, [])

    def find_exact_matches(self, primitives: List[dict], category: str) -> List[dict]:
        keywords = self.get_keywords(category)
        if not keywords:
            return []

        matches = []
        for prim in primitives:
            raw_text = str(prim.get("raw_text", "")).lower()
            if any(k in raw_text for k in keywords):
                matches.append(prim)
        return matches

    def find_best_fuzzy_match(
        self,
        primitives: List[dict],
        category: str,
        min_confidence: Optional[int] = None,
    ) -> Optional[Tuple[dict, str, str, float]]:
        """
        Returns: (primitive, matched_keyword, matched_span, score)
        """
        keywords = self.get_keywords(category)
        if not keywords:
            logger.warning("[KeywordMatcher] No keywords configured for category '%s'", category)
            return None

        threshold = min_confidence if min_confidence is not None else self.minimum_confidence

        best = None
        best_score = 0.0

        for prim in primitives:
            raw_text = str(prim.get("raw_text", "")).strip().lower()
            if not raw_text:
                continue

            spans = self._candidate_spans(raw_text)
            for span in spans:
                for keyword in keywords:
                    score = max(
                        fuzz.partial_ratio(span, keyword),
                        fuzz.token_set_ratio(span, keyword),
                        fuzz.WRatio(span, keyword),
                    )
                    if score > best_score:
                        best_score = score
                        best = (prim, keyword, span, score)

        if best and best_score >= threshold:
            logger.info(
                "[KeywordMatcher] Fuzzy match category=%s keyword='%s' span='%s' score=%.2f",
                category,
                best[1],
                best[2],
                best[3],
            )
            return best

        logger.info(
            "[KeywordMatcher] No fuzzy match over threshold for category=%s (best_score=%.2f threshold=%s)",
            category,
            best_score,
            threshold,
        )
        return None

    def maybe_learn_keyword(self, category: str, candidate: str, score: float) -> bool:
        normalized = self._normalize_keyword(candidate)
        if not normalized:
            return False

        if score < self.auto_learn_confidence:
            logger.info(
                "[KeywordMatcher] Candidate '%s' for category=%s below auto-learn threshold (%.2f < %s)",
                normalized,
                category,
                score,
                self.auto_learn_confidence,
            )
            return False

        existing = set(self._keywords.get(category, []))
        if normalized in existing:
            return False

        existing.add(normalized)
        self._keywords[category] = sorted(existing)

        try:
            self._save_learned_keywords()
        except Exception as exc:
            logger.warning("[KeywordMatcher] Failed saving learned keyword to JSON: %s", exc)

        self._upsert_mongo_category(category)
        logger.info(
            "[KeywordMatcher] Learned new keyword '%s' for category=%s (score=%.2f)",
            normalized,
            category,
            score,
        )
        return True

    def _upsert_mongo_category(self, category: str) -> None:
        if self.mongo_collection is None:
            return

        try:
            self.mongo_collection.update_one(
                {"category": category},
                {
                    "$set": {
                        "category": category,
                        "keywords": self._keywords.get(category, []),
                        "updated_at": __import__("datetime").datetime.utcnow(),
                    }
                },
                upsert=True,
            )
        except Exception as exc:
            logger.warning("[KeywordMatcher] Failed writing learned keywords to Mongo: %s", exc)

    def _normalize_keyword(self, keyword: str) -> str:
        keyword = " ".join(keyword.strip().lower().split())
        if len(keyword) < 3:
            return ""
        return keyword

    def _candidate_spans(self, text: str) -> List[str]:
        """
        Build candidate spans for fuzzy matching so long OCR lines can still match
        shorter dictionary keywords.
        """
        tokens = text.split()
        if not tokens:
            return []

        spans = {text}
        max_window = min(5, len(tokens))

        for size in range(1, max_window + 1):
            for idx in range(0, len(tokens) - size + 1):
                spans.add(" ".join(tokens[idx : idx + size]))

        return sorted(spans, key=len)


keyword_matcher = KeywordMatcher()
