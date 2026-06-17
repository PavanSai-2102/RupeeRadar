# RupeeRadar

RupeeRadar is an AI-powered personal finance assistant that seamlessly categorizes your bank transactions, uncovers actionable spending insights, and tracks your financial health over time. 

Built with a modern React + Vite frontend and a robust FastAPI + PostgreSQL backend, RupeeRadar uses the powerful Llama-3 AI engine to analyze complex, messy bank statements.

## 🚀 Features

### 1. Intelligent File Parsing
- **Native PDF Support**: Drag and drop original digital PDF bank statements directly into the app. The backend uses `pdfplumber` to intelligently slice through tables and extract line-by-line transactions, automatically handling text-wrapping and stripping out non-transactional junk.
- **CSV Support**: Upload standard bank statement CSVs. Our flexible parser automatically detects the proper `Date`, `Description`, `Withdrawal`, and `Deposit` columns regardless of variations in bank formats.

### 2. AI Categorization Engine
- Powered by **Groq API (Llama-3-70B-Versatile)**, RupeeRadar cleans up messy merchant names (e.g. "UPI/ZOMATO/XXXXX" -> "Zomato") and categorizes every transaction into standardized buckets (Food & Dining, Shopping, Travel, Bills & Utilities, Salary & Income, Investment, Health, Entertainment, Other).
- **Rate-Limit Safe**: Safely processes hundreds of transactions by chunking requests into smart batches, complying with Groq's 1,000 Tokens Per Minute limits.

### 3. Custom Rules Engine
- Instantly categorize recurring or predictable transactions without waiting for the AI!
- Add keywords (e.g. "Swiggy" -> "Food & Dining"). When a statement is uploaded, the backend intercepts these transactions and categorizes them locally, saving time and API tokens.

### 4. Smart Financial Dashboard
- **Key Performance Indicators**: Instantly view Total Income, Total Spend, and Net Savings.
- **AI Financial Insights**: The AI reads your aggregated analytics and generates punchy, personalized financial advice.
- **Visual Analytics**: Interactive Donut Charts showing Spend by Category.
- **Month-over-Month Historical Trends**: An aggregated Line Chart showing your Income vs. Spend tracking across every statement you've ever uploaded.

### 5. Production-Ready Backend Architecture
- **FastAPI**: Asynchronous, ultra-fast Python web framework.
- **PostgreSQL**: Robust data persistence handled through SQLModel (SQLAlchemy 2.0). Falls back to SQLite seamlessly for local development without Docker.
- **Background Tasks**: All heavy AI processing is offloaded to FastAPI BackgroundTasks to ensure a snappy user experience. 

## 🛠️ Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Recharts (Data Visualization)
- Lucide React (Icons)

**Backend:**
- Python 3.10+
- FastAPI
- SQLModel (SQLAlchemy)
- PostgreSQL (via `psycopg2-binary`)
- Groq Llama-3 API
- `pdfplumber` (PDF Extraction)
- `pandas` (CSV/Data Processing)

**DevOps:**
- Docker & Docker Compose
- Nginx (Reverse Proxy & Static File Serving)

## 💻 Local Development

### 1. Start the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start the local development server (uses SQLite by default)
uvicorn main:app --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173`.

## 🐳 Production Deployment (Docker)

To run the entire stack (Frontend Nginx, Backend FastAPI, and PostgreSQL Database) via Docker:

```bash
docker-compose up --build -d
```
Navigate to `http://localhost:80`.
