# RupeeRadar: Phase-Wise Implementation Plan

This document outlines the step-by-step implementation plan for RupeeRadar, based on the defined system architecture. The approach follows building vertical slices to ensure a working prototype at every major milestone.

## Phase 1: Project Setup & Foundation
**Goal**: Initialize the repositories and establish communication between the frontend and backend.
- **Frontend**: 
  - Initialize React/Next.js project with TypeScript and Tailwind CSS.
  - Set up basic routing and standard layout components (Header, Footer, Main Container).
- **Backend**:
  - Initialize Python FastAPI project.
  - Configure CORS middleware to accept requests from the frontend.
- **Database**:
  - Set up local SQLite database using an ORM like SQLAlchemy or SQLModel.
  - Define the initial database schemas for `Session`, `Transaction`, and `Insight` models based on the internal standard schema.

## Phase 2: Data Ingestion (Vertical Slice 1)
**Goal**: Allow users to upload bank statements and store raw data.
- **Frontend**:
  - Build a drag-and-drop file upload component.
  - Implement client-side validation for file types (CSV/PDF) and file size limits.
- **Backend**:
  - Create the `POST /upload` endpoint to receive multipart form data.
  - Implement basic `pandas` logic to load CSV files.
  - Build the mapping logic to handle varying bank column headers (e.g., converting "Withdrawals", "Debit" to a standard internal structure).
  - Create a new `Session` and save the standardized (but uncleaned) transactions to the database.

## Phase 3: The Core AI Processing Pipeline
**Goal**: Clean raw data and use an LLM to categorize transactions securely.
- **Backend (Data Sanitizer)**:
  - Implement regex-based pre-processing to clean noisy descriptions (removing reference numbers, UPI codes).
  - Normalize dates (to ISO-8601) and currency amounts (to floats).
- **Backend (AI Integration)**:
  - Integrate the Groq API for ultra-fast LLM inference.
  - Design the prompt template enforcing structured JSON output for categorizing transactions and flagging recurring payments.
  - Implement batch processing: send strictly sanitized descriptions and amounts (stripping sensitive PII) to the LLM.
  - Update the SQLite database transactions with `clean_description`, `category`, and `is_recurring` fields.

## Phase 4: Analytics Engine & API Development
**Goal**: Calculate financial metrics and expose processed data to the frontend.
- **Backend (Analytics)**:
  - Create data aggregation functions (Total Spend, Total Income, Spend by Category).
  - Implement logic to pass aggregated data to the LLM to generate personalized text insights.
- **Backend (API Endpoints)**:
  - Build `GET /sessions/{id}/status` for tracking pipeline progress.
  - Build `GET /transactions` with pagination support.
  - Build `GET /analytics` to return chart-ready JSON data.
  - Build `GET /insights` to return the generated text insights.

## Phase 5: Presentation Layer (Dashboard & UI)
**Goal**: Visualize the processed data and insights for the user.
- **Frontend**:
  - Implement polling logic to show a loading state while the backend processes the uploaded file.
  - Build the **Transaction Viewer**: An interactive data table displaying raw vs. cleaned descriptions. Allow users to manually override AI-assigned categories.
  - Build the **Insights Dashboard**: Integrate charting libraries (Recharts or Chart.js) to display pie charts (category breakdown) and bar charts (monthly flow).
  - Create UI cards to elegantly display the highlighted textual insights.

## Phase 6: Polish, Export, & Deployment
**Goal**: Finalize the prototype, ensure stability, and make it sharable.
- **Frontend/Backend**:
  - Implement the **Export Module**: Allow users to generate a shareable PDF report of their dashboard (using browser print or a backend library like `weasyprint`).
  - Add robust error handling (e.g., unsupported CSV formats, Groq API rate limits/timeouts).
  - Ensure "Privacy by Design" constraints are met (e.g., cleaning up local data sessions if necessary).
- **Deployment**:
  - Containerize the application using Docker.
  - Deploy to a platform like Render or Railway (updating to PostgreSQL if scaling is required).
