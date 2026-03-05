import pytesseract
from pytesseract import Output
from dateutil import parser
import re

class DocumentExtractor:
    def __init__(self, clean_image):
        self.img = clean_image
        self.custom_config = r'--oem 3 --psm 6'
    
    def extract_text(self):
        """
        Runs Tesseract, groups words into horizontal phrases, 
        and categorizes them for Node.js.
        """
        raw_data = pytesseract.image_to_data(
            self.img,
            output_type=Output.DICT,
            config=self.custom_config
        )

        # 1. THE MAGIC SAUCE: Group fragmented words into phrases FIRST
        phrases = self._build_lines(raw_data)

        primitives = []

        # 2. Loop through the reconstructed phrases (e.g. "Jan 1, 2020", "Vanguard ETF")
        for phrase in phrases:
            text = phrase['text']
            
            box = {
                "x": phrase['x'],
                "y": phrase['y'],
                "w": phrase['w'],
                "h": phrase['h']
            }

            # 3. Tag Data Types on the FULL phrase
            data_type = self._classify_text(text)

            # 4. Clean text for MongoDB schemas
            clean_value = self._clean_value(text, data_type)

            primitives.append({
                "raw_text": text,
                "value": clean_value,
                "type": data_type,
                "box": box
            })
            
        return primitives
    
    def _classify_text(self, text):
        """
        Uses Regex to determine if the text is 
        Money, Data, Ticker, or just a String.
        """
        
        #Matches money formates like $100, 100.00, 100,000.00
        if re.match(r'^\$?\d{1,3}(,\d{3})*(\.\d{2})?$', text):
            return "MONEY"

        #Matches dates like 01/01/2020, 2020-01-01, Jan 1, 2020
        elif re.match(r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$', text) or re.match(r'^[A-Za-z]{3}\s\d{1,2},\s\d{4}$', text):
            return "DATE"
        
        #Matches stock tickers (1 to 5 uppercase letters)
        elif re.match(r'^[A-Z]{1,5}$', text):
            return "TICKER"
        
        #Matches pure numbers
        if re.match(r'^\d+$', text):
            return "NUMBER"
        
        return "STRING"
    
    def _clean_value(self, text, data_type):
        """
        Pre-formates the data so Node.js can directly insert it into MongoDB without worrying about data types.
        """

        if data_type == "MONEY":
            #Strips the $ and commas to return a float
            clean = text.replace('$', '').replace(',', '')
            try: 
                return float(clean)
            except ValueError:
                return 0.0
        
        elif data_type == "NUMBER":
            try:
                return float(text)
            except ValueError:
                return 0.0
        
        elif data_type == "DATE":
            try:
                #Implement dateutil parser
                parsed_date = parser.parse(text)

                return parsed_date.isoformat() + "Z"
            except Exception:
                return text
            
        return text
    
    def _build_lines(self, raw_data): # FIX 1: Changed raw_date to raw_data
        """
        Takes raw Tesseract dictionary output and groups words 
        into horizontal lines.
        """
        n_boxes = len(raw_data['text'])
        words = []

        # Gather all valid words with their coordinates
        for i in range(n_boxes):
            text = raw_data['text'][i].strip()
            conf = int(raw_data['conf'][i])
            if not text or conf < 40:
                continue

            words.append({
                "text": text,
                "x": raw_data['left'][i],
                "y": raw_data['top'][i],
                "w": raw_data['width'][i],
                "h": raw_data['height'][i]
            })

        # Sort words into top-to-bottom order
        words.sort(key=lambda w: w['y'])

        lines = []
        current_line = []
        current_y = None
        y_tolerance = 10 

        # Group into lines
        for word in words:
            if current_y is None or abs(word['y'] - current_y) <= y_tolerance:
                current_line.append(word)
                current_y = sum(w['y'] for w in current_line) / len(current_line)
            else:
                lines.append(current_line) # FIX 2: Changed line.append to lines.append
                current_line = [word]
                current_y = word['y']

        if current_line:
            lines.append(current_line)

        #Sort each line left-to-right
        reconstructed_phrases = []
        x_tolerance = 10

        for line in lines:
            line.sort(key = lambda w: w['x'])

            if not line:
                continue

            current_phrase = line[0]

            for i in range(1, len(line)):
                next_word = line[i]
                #Calculate the gap between the end of current phrase and the start of the next word
                gap = next_word['x'] - (current_phrase['x'] + current_phrase['w'])

                if gap <= x_tolerance:
                    #Merge
                    current_phrase['text'] += ' ' + next_word['text']
                    #Expand bounding box
                    current_phrase['w'] = (next_word['x'] + next_word['w']) - current_phrase['x']
                    #Heigh is the max of the two
                    current_phrase['h'] = max(current_phrase['h'], next_word['h'])
                else:
                    reconstructed_phrases.append(current_phrase)
                    current_phrase = next_word
                
            reconstructed_phrases.append(current_phrase)

        return reconstructed_phrases