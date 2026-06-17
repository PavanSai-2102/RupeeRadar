FROM python:3.12-slim

WORKDIR /app

# Install system dependencies needed for native modules
RUN apt-get update && apt-get install -y gcc sqlite3 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies (We enforce the original pydantic v1 to match what is working)
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose Uvicorn port
EXPOSE 8000

# Run FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
