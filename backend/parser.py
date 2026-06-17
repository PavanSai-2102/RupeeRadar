import pandas as pd
import io
import pdfplumber

def _standardize_dataframe(df: pd.DataFrame) -> list[dict]:
    # Standardize column names to lower case and strip whitespace
    df.columns = [str(c).strip().lower() for c in df.columns]

    # Map varying columns to standard schema
    standardized_records = []

    # Common variations of headers
    date_cols = ['date', 'transaction date', 'value date', 'txn date']
    desc_cols = ['description', 'narration', 'particulars', 'remarks']
    
    # Identify which columns we actually have
    date_col = next((c for c in date_cols if c in df.columns), None)
    desc_col = next((c for c in desc_cols if c in df.columns), None)
    
    if not date_col or not desc_col:
        raise ValueError("Could not find required Date or Description columns in CSV.")

    for index, row in df.iterrows():
        date_val = str(row[date_col]).strip() if pd.notna(row[date_col]) else ""
        desc_val = str(row[desc_col]).strip() if pd.notna(row[desc_col]) else ""

        # Handle multi-line wrapped text: if date is missing, append description to previous record
        is_empty_date = date_val == "" or date_val.lower() == "nan" or date_val.lower() == "none"
        if is_empty_date and len(standardized_records) > 0:
            valid_desc = desc_val and desc_val.lower() != "nan" and desc_val.lower() != "none"
            if valid_desc:
                standardized_records[-1]["raw_description"] += " " + desc_val
            continue
            
        # Skip rows with no date and no description
        if is_empty_date and (not desc_val or desc_val.lower() == "nan" or desc_val.lower() == "none"):
            continue

        # Determine Amount and Type (Credit/Debit)
        amount = 0.0
        txn_type = "UNKNOWN"

        # Case 1: Single Amount column + Type column
        if 'amount' in df.columns and 'type' in df.columns:
            amount = abs(float(str(row['amount']).replace(',', ''))) if pd.notna(row['amount']) else 0.0
            txn_type = "CREDIT" if str(row['type']).strip().upper() in ['CR', 'CREDIT', 'C'] else "DEBIT"
        
        # Case 2: Separate Debit and Credit columns (common in Indian banks)
        else:
            withdrawal_cols = ['withdrawal', 'debit', 'dr', 'withdrawals']
            deposit_cols = ['deposit', 'credit', 'cr', 'deposits']
            
            w_col = next((c for c in withdrawal_cols if c in df.columns), None)
            d_col = next((c for c in deposit_cols if c in df.columns), None)

            if w_col and pd.notna(row[w_col]) and str(row[w_col]).strip() != "":
                amount = float(str(row[w_col]).replace(',', ''))
                txn_type = "DEBIT"
            elif d_col and pd.notna(row[d_col]) and str(row[d_col]).strip() != "":
                amount = float(str(row[d_col]).replace(',', ''))
                txn_type = "CREDIT"

        record = {
            "date": date_val,
            "raw_description": desc_val,
            "amount": amount,
            "type": txn_type
        }
        
        # Only add if it looks like a real transaction (has a date)
        if not is_empty_date and "summary" not in date_val.lower():
            standardized_records.append(record)

    return standardized_records

def parse_bank_statement(file_content: bytes) -> list[dict]:
    try:
        df = pd.read_csv(io.BytesIO(file_content))
    except Exception as e:
        raise ValueError(f"Could not read CSV file: {str(e)}")
    return _standardize_dataframe(df)

def parse_pdf_bank_statement(file_content: bytes) -> list[dict]:
    try:
        all_rows = []
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables(table_settings={
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "text"
                })
                for table in tables:
                    for row in table:
                        # Clean up cell text
                        clean_row = [str(cell).replace('\\n', ' ').strip() if cell else "" for cell in row]
                        all_rows.append(clean_row)
        
        if not all_rows:
            raise ValueError("No tabular data found in PDF.")
            
        # Find the header row (look for 'Date' and some description column)
        header_idx = -1
        for i, row in enumerate(all_rows):
            row_lower = [str(c).lower() for c in row]
            if any('date' in c for c in row_lower) and (any('narration' in c for c in row_lower) or any('description' in c for c in row_lower) or any('particulars' in c for c in row_lower)):
                header_idx = i
                break
                
        if header_idx == -1:
            raise ValueError("Could not find standard bank statement headers in PDF tables.")
            
        # Create DataFrame from the rows after the header
        headers = all_rows[header_idx]
        data = all_rows[header_idx + 1:]
        
        # Ensure rows match header length to avoid pandas errors
        clean_data = [row[:len(headers)] + [""] * (len(headers) - len(row)) for row in data]
        
        df = pd.DataFrame(clean_data, columns=headers)
        return _standardize_dataframe(df)
    except ValueError as e:
        raise e
    except Exception as e:
        raise ValueError(f"Could not parse PDF file: {str(e)}")
