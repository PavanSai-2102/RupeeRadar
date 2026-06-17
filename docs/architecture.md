# RupeeRadar: System Architecture

## 1. Architectural Goals

| Goal | Rationale |
|------|-----------|
| **End-to-end workflow** | Upload -> insights must work as a single user journey |
| **Messy-data tolerance** | Indian bank/UPI descriptions vary widely; normalization is first-class |
| **Privacy by design** | Financial data is sensitive; minimize exposure and retention |
| **Prototype-first** | Ship a working vertical slice before supporting every bank format |
| **Inspectable output** | Users should see cleaned data, not just a black-box summary |
| **Extensible parsing** | New bank formats plug in without rewriting the core pipeline |

## 2. High-Level System View

RupeeRadar is organized as a **pipeline-oriented, modular monolith** for the prototype phase. A single application hosts ingestion, processing, analytics, and presentation. This keeps deployment simple while preserving clear module boundaries for future extraction into services.

```text
┌───────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                            │
│ Upload UI · Transaction table · Dashboard · Insights · Report export  │
└───────────────────────────────────────────────────────────────────────┘
                                | HTTPS
                                v
┌───────────────────────────────────────────────────────────────────────┐
│                           API Layer (REST)                            │
│/upload · /sessions · /transactions · /analytics · /insights · /report │
└───────────────────────────────────────────────────────────────────────┘
                                |
        ┌───────────────────────┼───────────────────────┐
        v                       v                       v
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ Ingestion     │       │ Processing    │       │ Analytics     │
│ & Parsing     │ ────> │ Pipeline      │ ────> │ & Insights    │
└───────────────┘       └───────────────┘       └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                v
                        ┌───────────────┐
                        │ Data Store    │
                        │ (SQLite / PG) │
                        └───────────────┘
```

## 3. Detailed System Components

### 3.1 Presentation Layer (Frontend)
- **Framework**: React / Next.js
- **Responsibilities**:
  - **Upload Module**: Handles drag-and-drop file uploads (CSV, PDF). Validates file types and sizes on the client side before submission.
  - **Transaction Viewer**: A highly interactive data table allowing users to view original messy descriptions alongside the AI-cleaned descriptions and inferred categories. It supports manual overriding of AI categories to handle edge cases and correct mistakes.
  - **Insights Dashboard**: Visualizes data using Recharts or Chart.js. Includes widgets for:
    - Monthly spend vs. Income (Bar/Line charts)
    - Spending by Category (Pie/Doughnut charts)
    - Highlighted textual insights ("Your biggest expense was X", "You spent Y on Z subscriptions").
  - **Export Module**: Allows users to download their personalized financial report as a PDF.

### 3.2 Application Layer (Backend API)
- **Framework**: Python FastAPI
- **Core Endpoints**:
  - `POST /upload`: Accepts multipart/form-data. Triggers the pipeline and returns a session/job ID for tracking progress.
  - `GET /sessions/{id}/status`: Polling endpoint for the frontend to check processing status (e.g., "Parsing", "Categorizing", "Done").
  - `GET /transactions`: Returns paginated, cleaned, and categorized transactions for the data table.
  - `GET /analytics`: Returns pre-calculated aggregations (total spend, top categories) for charting.
  - `GET /insights`: Returns personalized, LLM-generated text insights based on user behavior.

### 3.3 Data Processing & AI Engine (The Core Pipeline)
This is the most critical subsystem, executed as a sequential pipeline:
1. **Parser & Extractor**: 
   - Uses `pandas` to read CSV structures or `pdfplumber` for PDF tables.
   - Employs a mapping strategy to convert varying bank column headers (e.g., "Withdrawals", "Debit", "Dr") into a single standard internal schema.
2. **Sanitizer (Pre-processing)**: 
   - Normalizes diverse date formats (DD/MM/YYYY, MM-DD-YY) to standard ISO-8601.
   - Converts currency strings with commas and symbols to pure floats.
   - Removes common noise from descriptions (e.g., "UPI/CR/", reference numbers, RTGS/NEFT codes) using Regex.
3. **AI Categorization & Entity Extraction**:
   - Sends sanitized descriptions in batches to an LLM via structured output prompting.
   - **Task**: Assign one of the standard categories (Food, Travel, Bills, etc.) and identify if the payment is recurring (EMI, Rent, Subscriptions).
   - **Privacy Measure**: Account numbers and exact balances are stripped *before* sending data to the Groq API.
4. **Analytics Engine**:
   - Groups data by category and time (month/week) and detects recurring amounts to calculate financial metrics.
   - Formulates specific prompts for the LLM to generate personalized natural language insights using the aggregated data.

### 3.4 Storage Layer (Database)
- **System**: SQLite (local) / PostgreSQL (production)
- **Models**:
  - **Session**: Tracks user uploads (id, timestamp, processing_status).
  - **Transaction**: Stores raw description, cleaned description, amount, date, type (credit/debit), category, is_recurring, and session_id.
  - **Insight**: Stores generated text insights linked to a specific session.

## 4. Data Schemas

### 4.1 Internal Transaction Standard Schema
Regardless of the bank's input format, all ingested data is mapped to this strict internal structure before entering the AI pipeline:
```json
{
  "transaction_id": "uuid",
  "date": "YYYY-MM-DD",
  "amount": 1500.50,
  "type": "DEBIT", 
  "raw_description": "UPI/CR/123456789/SWIGGY/ICICI",
  "clean_description": "Swiggy",
  "category": "Food & Dining",
  "is_recurring": false,
  "confidence_score": 0.95 
}
```

## 5. Security & Privacy by Design

- **Data Minimization**: Only the `raw_description` and `amount` are sent to the LLM for categorization. Personal Identifiable Information (PII) like account balances, account numbers, and user names are kept strictly local.
- **Stateless Processing**: For a true privacy-first approach, transactions can be processed entirely in-memory and discarded once the user ends the session or exports the report. Alternatively, a local SQLite database ensures data never leaves the user's host machine.

## 6. Recommended Stack (Prototype)

| Layer | Recommendation | Alternatives |
|---|---|---|
| Frontend | React + TypeScript + Tailwind | Next.js, Vue |
| Backend | Python FastAPI | Node.js Express, Django |
| Database | SQLite (local) → PostgreSQL (deployed) | — |
| File parsing | `pandas` + bank-specific parsers | `openpyxl`, `pdfplumber` |
| AI categorization | Groq API with structured output | Rule engine + Groq fallback |
| Charts | Recharts or Chart.js | D3 |
| Report export | HTML → PDF (`weasyprint` / browser print) | — |
| Deployment | Docker + single VM / Railway / Render | Local-only demo |

Stack choices are flexible per `context.md`; the architecture above is stack-agnostic.
