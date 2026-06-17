# RupeeRadar: Edge Cases & Corner Cases

This document outlines potential edge cases and corner cases across the system architecture and implementation plan. Addressing these will ensure the application is robust, reliable, and handles real-world messy data gracefully.

## 1. Data Ingestion & File Handling (Phase 2)
- **Unsupported Formats**: User uploads a file type other than CSV or PDF, or a CSV missing critical columns (Date, Amount, Description).
  - *Mitigation*: Implement strict client-side and server-side validation. Provide clear error messages indicating required headers.
- **Large Files**: Bank statements spanning multiple years causing memory bloat in Pandas or exceeding API payload limits.
  - *Mitigation*: Enforce a max file size limit (e.g., 5MB - 10MB). Consider chunking for very large CSVs.
- **Corrupted or Scanned PDFs**: PDFs that are purely images (scanned) rather than text-based tables, causing `pdfplumber` to fail.
  - *Mitigation*: Detect unparseable PDFs early and prompt the user to upload a text-searchable PDF or CSV.
- **Empty or Malformed Files**: Files with headers but zero transaction rows, or mismatched delimiters.
  - *Mitigation*: Check for empty dataframes post-parsing and return a "No transactions found" error.

## 2. Data Cleaning & Normalization (Phase 3)
- **Ambiguous Date Formats**: Dates like `04/05/2023` (April 5th vs. May 4th) due to varying bank standards.
  - *Mitigation*: Attempt to infer date format by analyzing the entire column (e.g., if a value > 12 exists in the first position, it's DD/MM). Fallback to standard DD/MM/YYYY for Indian banks.
- **Currency Formatting Anomalies**: Handling Indian numbering systems (`1,00,000.00`), negative values represented in brackets `(500)`, or trailing "Cr/Dr".
  - *Mitigation*: Robust regex to strip all non-numeric characters (except decimal points and minus signs) before float conversion.
- **Missing or Null Data**: Rows where the description is completely blank or the amount is null.
  - *Mitigation*: Drop rows with null amounts. Label empty descriptions as "Unknown Transaction".
- **Refunds & Reversals**: A debit transaction that was refunded, appearing as a credit.
  - *Mitigation*: Ensure the AI categorizer can recognize "Refund" or "Reversal" keywords so it doesn't artificially inflate the "Total Income" metrics.

## 3. AI Categorization & LLM Integration (Phase 3)
- **API Failures & Rate Limiting**: The Groq API times out, returns a 50x error, or hits rate limits during batch processing.
  - *Mitigation*: Implement exponential backoff, retry logic, and handle partial batch failures gracefully so the entire session doesn't crash.
- **Schema Violations (Hallucinations)**: The LLM returns invalid JSON or invents new categories not in the predefined list.
  - *Mitigation*: Use strict structured output prompting (like Groq's JSON mode). Provide a default fallback to an "Uncategorized" label if parsing fails.
- **Ambiguous Descriptions**: Descriptions like `Amazon` (could be Shopping, AWS Cloud bill, or Prime Subscription).
  - *Mitigation*: Rely on the confidence score. Provide the user an easy UI way to manually override the AI's decision (as planned in Phase 5).
- **PII Leakage**: Accidentally sending account numbers, routing numbers, or balances to the LLM.
  - *Mitigation*: Strict regex sanitization *before* the API call to redact strings of numbers greater than 5-6 digits.

## 4. Analytics & Presentation Layer (Phases 4 & 5)
- **Insufficient Data for Insights**: A statement with only 2 or 3 transactions, making charts and textual insights look empty or nonsensical.
  - *Mitigation*: Set a minimum threshold for insights generation. Display a "Not enough data for insights" placeholder if the threshold isn't met.
- **Extreme Outliers**: A single massive transaction (e.g., buying a house, car downpayment) skewing all charts and making daily expenses invisible on the Y-axis.
  - *Mitigation*: Provide a UI toggle to exclude specific outlier transactions from the analytics calculations.
- **No Income or No Expenses**: A statement containing only debits or only credits.
  - *Mitigation*: Ensure the UI handles `0` values gracefully without dividing by zero, rendering empty states nicely.

## 5. Security & Architecture (Phases 1 & 6)
- **Concurrent Uploads (SQLite Limitation)**: Multiple users (or tabs) uploading simultaneously might lock the local SQLite database.
  - *Mitigation*: Use WAL (Write-Ahead Logging) mode in SQLite for better concurrency, or migrate to PostgreSQL for the deployed version.
- **Session Expiration & Data Retention**: Stale financial data sitting in the database indefinitely, violating privacy goals.
  - *Mitigation*: Implement logic to purge sessions and transactions older than a certain timeframe (e.g., 24 hours) to strictly enforce "Privacy by Design".
