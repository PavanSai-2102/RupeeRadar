import re

def sanitize_description(raw_desc: str) -> str:
    """
    Cleans up noisy bank descriptions to help the LLM and strips PII.
    """
    if not raw_desc:
        return ""
    
    # Convert to uppercase for standard processing
    desc = str(raw_desc).upper()

    # 1. Strip explicit PII / long digit sequences (likely account numbers, UPI IDs)
    desc = re.sub(r'\d{6,}', '[REDACTED]', desc)

    # 2. Remove common bank prefixes
    prefixes = [
        r'^UPI/.*?/',
        r'^IMPS/.*?/',
        r'^NEFT/.*?/',
        r'^RTGS/.*?/',
        r'^POS/.*?/',
        r'^ECOM/.*?/',
        r'^ACH/.*?/',
    ]
    for prefix in prefixes:
        desc = re.sub(prefix, '', desc)

    # 3. Remove special characters (keep alphanumerics, spaces, and basic punctuation)
    desc = re.sub(r'[^a-zA-Z0-9\s\.\-]', ' ', desc)

    # 4. Clean up extra whitespace
    desc = re.sub(r'\s+', ' ', desc).strip()

    return desc
