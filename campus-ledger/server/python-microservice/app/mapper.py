class ReceiptMapper:
    def __init__(self, primitives):
        self.primitives = primitives

    def extract_schema(self):
        """
        Processes the primitives and returns a clean dictionary 
        that matches the Node.js transactionSchema.
        """
        return {
            "name": self._get_company_name(),
            "date": self._get_date(),
            "price": self._get_total()
        }

    def _get_date(self):
        """Finds the first DATE primitive on the document."""
        for prim in self.primitives:
            if prim['type'] == 'DATE':
                return prim['value']
        return None

    def _get_company_name(self):
        """
        Finds the company name by looking for the largest text 
        in either the top 30% or the bottom 20% of the receipt.
        """
        if not self.primitives:
            return "Unknown Company"
            
        max_y = max((p['box']['y'] for p in self.primitives), default=1000)
        top_boundary = max_y * 0.30
        bottom_boundary = max_y * 0.80

        candidate_strings = [
            p for p in self.primitives 
            if p['type'] == 'STRING' and (p['box']['y'] < top_boundary or p['box']['y'] > bottom_boundary)
        ]

        if not candidate_strings:
            return "Unknown Company"

        candidate_strings.sort(key=lambda x: x['box']['h'], reverse=True)
        return candidate_strings[0]['value']

    def _get_total(self):
        """Looks for the word 'Total' or grabs the highest MONEY value."""
        money_primitives = [p for p in self.primitives if p['type'] == 'MONEY']
        if not money_primitives:
            return 0.0

        total_keywords = [p for p in self.primitives if 'total' in p['raw_text'].lower()]
        
        for keyword in total_keywords:
            kw_box = keyword['box']
            y_tolerance = 15 
            
            candidates = [
                m for m in money_primitives 
                if abs(m['box']['y'] - kw_box['y']) <= y_tolerance and m['box']['x'] > kw_box['x']
            ]
            
            if candidates:
                candidates.sort(key=lambda m: m['box']['x'], reverse=True)
                return candidates[0]['value']

        money_primitives.sort(key=lambda m: m['value'], reverse=True)
        return money_primitives[0]['value']


# --- THE NEW INVESTMENT MAPPER ---

class InvestmentMapper:
    def __init__(self, primitives):
        self.primitives = primitives

    def extract_schema(self):
        """
        Returns a dictionary that perfectly matches the Node.js investmentSchema.
        """
        # Ending value and total value are usually the same number on statements
        ending_val = self._get_value_by_keyword(['ending value', 'total account value', 'total value', 'portfolio value'])
        
        return {
            "period_end": self._get_date(),
            "starting_value": self._get_value_by_keyword(['starting value', 'beginning value', 'previous value']),
            "ending_value": ending_val,
            "total_value": ending_val, 
            "holdings": self._get_holdings(),
            "status": "completed"
        }

    def _get_date(self):
        """Grabs the first date found on the document to use as period_end."""
        for prim in self.primitives:
            if prim['type'] == 'DATE':
                return prim['value']
        return None

    def _get_value_by_keyword(self, keywords):
        """
        Hunts for specific phrases (like 'Beginning Value') and grabs the 
        MONEY amount sitting immediately to its right.
        """
        money_primitives = [p for p in self.primitives if p['type'] == 'MONEY']
        if not money_primitives:
            return 0.0

        for keyword in keywords:
            # Find any primitive containing our keyword (case-insensitive)
            matches = [p for p in self.primitives if keyword in p['raw_text'].lower()]
            
            for match in matches:
                m_box = match['box']
                y_tolerance = 15
                
                # Find MONEY values on the same line, to the right of the keyword
                candidates = [
                    m for m in money_primitives 
                    if abs(m['box']['y'] - m_box['y']) <= y_tolerance and m['box']['x'] > m_box['x']
                ]
                
                if candidates:
                    # Sort left-to-right and grab the closest one
                    candidates.sort(key=lambda m: m['box']['x'])
                    return candidates[0]['value']
                    
        return 0.0

    def _get_holdings(self):
        """
        Scans for rows containing a TICKER. Maps to your holdingSchema.
        """
        holdings = []
        tickers = [p for p in self.primitives if p['type'] == 'TICKER']
        
        for ticker in tickers:
            t_box = ticker['box']
            y_tolerance = 15
            
            # Find all items sitting on the exact same line as the Ticker
            line_items = [
                p for p in self.primitives 
                if abs(p['box']['y'] - t_box['y']) <= y_tolerance and p['box']['x'] > t_box['x']
            ]
            
            # Sort them from left to right
            line_items.sort(key=lambda item: item['box']['x'])
            
            shares = 0.0
            price_per_share = 0.0 # Match Mongoose schema
            
            for item in line_items:
                if item['type'] == 'NUMBER' and shares == 0.0:
                    shares = item['value']
                elif item['type'] == 'MONEY' and price_per_share == 0.0:
                    price_per_share = item['value']
                    
            if shares > 0 or price_per_share > 0:
                holdings.append({
                    "ticker": ticker['value'],
                    "shares": shares,
                    "price_per_share": price_per_share # Match Mongoose schema
                })
                
        return holdings