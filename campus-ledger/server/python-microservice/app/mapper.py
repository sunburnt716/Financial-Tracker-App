import logging
from keyword_matcher import keyword_matcher

logger = logging.getLogger(__name__)


class ReceiptMapper:
    def __init__(self, primitives):
        self.primitives = primitives

    def extract_schema(self):
        """
        Processes the primitives and returns a clean dictionary 
        that matches the Node.js transactionSchema.
        """
        logger.info("[ReceiptMapper] Starting schema extraction")
        company = self._get_company_name()
        date = self._get_date()
        price = self._get_total()
        
        logger.info(f"[ReceiptMapper] Extracted values - Company: {company}, Date: {date}, Price: {price}")
        
        return {
            "name": company,
            "date": date,
            "price": price
        }

    def _get_date(self):
        """Finds the first DATE primitive on the document."""
        logger.debug("[ReceiptMapper._get_date] Searching for DATE primitives")
        for prim in self.primitives:
            if prim['type'] == 'DATE':
                logger.debug(f"[ReceiptMapper._get_date] Found DATE: {prim['value']}")
                return prim['value']
        logger.warning("[ReceiptMapper._get_date] No DATE primitive found")
        return None

    def _get_company_name(self):
        """
        Finds the company name by looking for the largest text 
        in either the top 30% or the bottom 20% of the receipt.
        """
        logger.debug("[ReceiptMapper._get_company_name] Searching for company name")
        if not self.primitives:
            logger.warning("[ReceiptMapper._get_company_name] No primitives available")
            return "Unknown Company"
            
        max_y = max((p['box']['y'] for p in self.primitives), default=1000)
        top_boundary = max_y * 0.30
        bottom_boundary = max_y * 0.80
        
        logger.debug(f"[ReceiptMapper._get_company_name] Boundaries - max_y={max_y}, top={top_boundary}, bottom={bottom_boundary}")

        candidate_strings = [
            p for p in self.primitives 
            if p['type'] == 'STRING' and (p['box']['y'] < top_boundary or p['box']['y'] > bottom_boundary)
        ]
        
        logger.debug(f"[ReceiptMapper._get_company_name] Found {len(candidate_strings)} STRING candidates in target zones")
        for i, cand in enumerate(candidate_strings[:5]):  # Log first 5 candidates
            logger.debug(f"  Candidate {i}: '{cand['value']}' at y={cand['box']['y']}, height={cand['box']['h']}")

        if not candidate_strings:
            logger.warning("[ReceiptMapper._get_company_name] No STRING candidates found in target zones")
            return "Unknown Company"

        candidate_strings.sort(key=lambda x: x['box']['h'], reverse=True)
        result = candidate_strings[0]['value']
        logger.info(f"[ReceiptMapper._get_company_name] Selected company name: {result}")
        return result

    def _get_total(self):
        """Looks for the word 'Total' or grabs the highest MONEY value."""
        logger.debug("[ReceiptMapper._get_total] Searching for total price")
        money_primitives = [p for p in self.primitives if p['type'] == 'MONEY']
        
        logger.debug(f"[ReceiptMapper._get_total] Found {len(money_primitives)} MONEY primitives")
        for i, mon in enumerate(money_primitives):
            logger.debug(f"  MONEY {i}: ${mon['value']} at position ({mon['box']['x']}, {mon['box']['y']})")
        
        if not money_primitives:
            logger.warning("[ReceiptMapper._get_total] No MONEY primitives found, returning 0.0")
            return 0.0

        total_keywords = keyword_matcher.find_exact_matches(self.primitives, "receipt_total")
        logger.debug(
            f"[ReceiptMapper._get_total] Found {len(total_keywords)} exact keyword matches in 'receipt_total'"
        )

        if not total_keywords:
            logger.info("[ReceiptMapper._get_total] No exact keyword match. Trying fuzzy matching...")
            fuzzy_result = keyword_matcher.find_best_fuzzy_match(
                self.primitives,
                category="receipt_total",
            )
            if fuzzy_result:
                matched_primitive, matched_keyword, matched_span, score = fuzzy_result
                total_keywords = [matched_primitive]
                logger.info(
                    "[ReceiptMapper._get_total] Using fuzzy keyword match: keyword='%s' span='%s' score=%.2f",
                    matched_keyword,
                    matched_span,
                    score,
                )
                keyword_matcher.maybe_learn_keyword("receipt_total", matched_span, score)
        
        for keyword in total_keywords:
            logger.debug(f"[ReceiptMapper._get_total] Searching near keyword phrase: '{keyword['raw_text']}'")
            kw_box = keyword['box']
            y_tolerance = 15 
            
            candidates = [
                m for m in money_primitives 
                if abs(m['box']['y'] - kw_box['y']) <= y_tolerance and m['box']['x'] > kw_box['x']
            ]
            
            logger.debug(f"[ReceiptMapper._get_total] Found {len(candidates)} MONEY values on same line as 'total'")
            
            if candidates:
                candidates.sort(key=lambda m: m['box']['x'], reverse=True)
                result = candidates[0]['value']
                logger.info(f"[ReceiptMapper._get_total] Selected total from 'total' keyword: ${result}")
                return result

        money_primitives.sort(key=lambda m: m['value'], reverse=True)
        result = money_primitives[0]['value']
        logger.info(f"[ReceiptMapper._get_total] No 'total' keyword found, using highest MONEY: ${result}")
        return result


# --- THE NEW INVESTMENT MAPPER ---

class InvestmentMapper:
    def __init__(self, primitives):
        self.primitives = primitives

    def extract_schema(self):
        """
        Returns a dictionary that perfectly matches the Node.js investmentSchema.
        """
        logger.info("[InvestmentMapper] Starting schema extraction")
        
        # Ending value and total value are usually the same number on statements
        ending_val = self._get_value_by_keyword(['ending value', 'total account value', 'total value', 'portfolio value'])
        period_end = self._get_date()
        starting_val = self._get_value_by_keyword(['starting value', 'beginning value', 'previous value'])
        holdings = self._get_holdings()
        
        logger.info(f"[InvestmentMapper] Extracted values - Period End: {period_end}, Starting: {starting_val}, Ending: {ending_val}")
        logger.info(f"[InvestmentMapper] Extracted {len(holdings)} holdings")
        
        return {
            "period_end": period_end,
            "starting_value": starting_val,
            "ending_value": ending_val,
            "total_value": ending_val, 
            "holdings": holdings,
            "status": "completed"
        }

    def _get_date(self):
        """Grabs the first date found on the document to use as period_end."""
        logger.debug("[InvestmentMapper._get_date] Searching for DATE primitives")
        for prim in self.primitives:
            if prim['type'] == 'DATE':
                logger.debug(f"[InvestmentMapper._get_date] Found DATE: {prim['value']}")
                return prim['value']
        logger.warning("[InvestmentMapper._get_date] No DATE primitive found")
        return None

    def _get_value_by_keyword(self, keywords):
        """
        Hunts for specific phrases (like 'Beginning Value') and grabs the 
        MONEY amount sitting immediately to its right.
        """
        logger.debug(f"[InvestmentMapper._get_value_by_keyword] Searching for keywords: {keywords}")
        
        money_primitives = [p for p in self.primitives if p['type'] == 'MONEY']
        logger.debug(f"[InvestmentMapper._get_value_by_keyword] Found {len(money_primitives)} MONEY primitives")
        
        if not money_primitives:
            logger.warning("[InvestmentMapper._get_value_by_keyword] No MONEY primitives found")
            return 0.0

        category = self._resolve_keyword_category(keywords)

        # 1) Exact keyword match first (fast path)
        exact_matches = keyword_matcher.find_exact_matches(self.primitives, category)
        logger.debug(
            "[InvestmentMapper._get_value_by_keyword] Exact matches for category '%s': %d",
            category,
            len(exact_matches),
        )

        if exact_matches:
            result = self._get_money_right_of_label(exact_matches, money_primitives)
            if result is not None:
                logger.info(
                    "[InvestmentMapper._get_value_by_keyword] Resolved using exact keyword for category '%s': %s",
                    category,
                    result,
                )
                return result

        # 2) Fuzzy match only after exact match fails
        logger.info(
            "[InvestmentMapper._get_value_by_keyword] No exact match resolved for '%s'. Trying fuzzy matching...",
            category,
        )
        fuzzy_result = keyword_matcher.find_best_fuzzy_match(
            self.primitives,
            category=category,
        )

        if fuzzy_result:
            matched_primitive, matched_keyword, matched_span, score = fuzzy_result
            fuzzy_value = self._get_money_right_of_label([matched_primitive], money_primitives)
            if fuzzy_value is not None:
                logger.info(
                    "[InvestmentMapper._get_value_by_keyword] Fuzzy matched category='%s' keyword='%s' span='%s' score=%.2f => value=%s",
                    category,
                    matched_keyword,
                    matched_span,
                    score,
                    fuzzy_value,
                )
                keyword_matcher.maybe_learn_keyword(category, matched_span, score)
                return fuzzy_value

        logger.warning(
            "[InvestmentMapper._get_value_by_keyword] No exact or fuzzy matches resolved for category '%s' (keywords: %s)",
            category,
            keywords,
        )
        return 0.0

    def _resolve_keyword_category(self, keywords):
        normalized = {k.strip().lower() for k in keywords}
        ending_set = {
            "ending value",
            "total account value",
            "total value",
            "portfolio value",
        }
        if normalized == ending_set:
            return "investment_ending_value"
        return "investment_starting_value"

    def _get_money_right_of_label(self, label_primitives, money_primitives):
        for match in label_primitives:
            logger.debug(
                "[InvestmentMapper._get_money_right_of_label] Checking label: '%s' at (%s, %s)",
                match['raw_text'],
                match['box']['x'],
                match['box']['y'],
            )
            m_box = match['box']
            y_tolerance = 15

            candidates = [
                m for m in money_primitives
                if abs(m['box']['y'] - m_box['y']) <= y_tolerance and m['box']['x'] > m_box['x']
            ]
            logger.debug(
                "[InvestmentMapper._get_money_right_of_label] Found %d MONEY candidates to the right",
                len(candidates),
            )

            if candidates:
                candidates.sort(key=lambda m: m['box']['x'])
                return candidates[0]['value']

        return None

    def _get_holdings(self):
        """
        Scans for rows containing a TICKER. Maps to your holdingSchema.
        """
        logger.debug("[InvestmentMapper._get_holdings] Searching for holdings")
        
        holdings = []
        tickers = [p for p in self.primitives if p['type'] == 'TICKER']
        
        logger.debug(f"[InvestmentMapper._get_holdings] Found {len(tickers)} tickers")
        
        for ticker in tickers:
            logger.debug(f"[InvestmentMapper._get_holdings] Processing ticker: {ticker['value']}")
            
            t_box = ticker['box']
            y_tolerance = 15
            
            # Find all items sitting on the exact same line as the Ticker
            line_items = [
                p for p in self.primitives 
                if abs(p['box']['y'] - t_box['y']) <= y_tolerance and p['box']['x'] > t_box['x']
            ]
            
            logger.debug(f"[InvestmentMapper._get_holdings] Found {len(line_items)} items on same line for ticker {ticker['value']}")
            
            # Sort them from left to right
            line_items.sort(key=lambda item: item['box']['x'])
            
            shares = 0.0
            price_per_share = 0.0 # Match Mongoose schema
            
            for item in line_items:
                logger.debug(f"[InvestmentMapper._get_holdings]   Item: type={item['type']}, value={item['value']}, raw='{item['raw_text']}'")
                
                if item['type'] == 'NUMBER' and shares == 0.0:
                    shares = item['value']
                    logger.debug(f"[InvestmentMapper._get_holdings]   -> Set shares to {shares}")
                elif item['type'] == 'MONEY' and price_per_share == 0.0:
                    price_per_share = item['value']
                    logger.debug(f"[InvestmentMapper._get_holdings]   -> Set price_per_share to {price_per_share}")
                    
            if shares > 0 or price_per_share > 0:
                holding = {
                    "ticker": ticker['value'],
                    "shares": shares,
                    "price_per_share": price_per_share # Match Mongoose schema
                }
                logger.info(f"[InvestmentMapper._get_holdings] Added holding: {holding}")
                holdings.append(holding)
            else:
                logger.warning(f"[InvestmentMapper._get_holdings] Skipped ticker {ticker['value']} - no shares or price found")
                
        return holdings