from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables
from models import UploadSession, Transaction, Insight
from parser import parse_bank_statement
from sanitizer import sanitize_description
from ai_engine import categorize_transactions_batch, generate_financial_insights
from pydantic import BaseModel
import asyncio
from datetime import timedelta, datetime
import uuid
from contextlib import asynccontextmanager

class CategoryUpdate(BaseModel):
    category: str

async def cleanup_old_sessions():
    """Runs continuously in the background to delete sessions older than 24h"""
    from database import engine
    from sqlmodel import Session as SQLSession, select
    
    while True:
        try:
            with SQLSession(engine) as session:
                cutoff = datetime.utcnow() - timedelta(hours=24)
                # Note: SQLModel/SQLite doesn't easily do cascading deletes out of the box without setup,
                # so we query old sessions, and then delete insights/txns manually.
                old_sessions = session.exec(select(UploadSession).where(UploadSession.timestamp < cutoff)).all()
                
                for s in old_sessions:
                    session.exec(Transaction.__table__.delete().where(Transaction.session_id == s.id))
                    session.exec(Insight.__table__.delete().where(Insight.session_id == s.id))
                    session.delete(s)
                
                session.commit()
        except Exception as e:
            print(f"Cleanup error: {e}")
            
        await asyncio.sleep(3600) # Check every hour

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Cleanup task disabled for Month-over-Month historical data
    # asyncio.create_task(cleanup_old_sessions())
    yield

app = FastAPI(title="RupeeRadar API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def process_session_background(session_id: str):
    from database import engine
    from sqlmodel import Session as SQLSession, select
    import time
    
    with SQLSession(engine) as session:
        transactions = session.exec(select(Transaction).where(Transaction.session_id == session_id)).all()
        
        if not transactions:
            return

        # Custom Rules Engine Logic
        from models import CategoryRule
        rules = session.exec(select(CategoryRule)).all()
        
        batch_input = []
        for txn in transactions:
            sanitized = sanitize_description(txn.raw_description)
            
            # Check if any rule matches the raw description
            rule_matched = False
            for rule in rules:
                if rule.keyword.lower() in txn.raw_description.lower():
                    txn.category = rule.category
                    txn.clean_description = sanitized
                    txn.is_recurring = rule.is_recurring
                    rule_matched = True
                    break
                    
            if not rule_matched:
                batch_input.append({
                    "id": txn.id,
                    "sanitized_desc": sanitized,
                    "amount": txn.amount,
                    "type": txn.type
                })
        
        # If there are still transactions that need AI processing
        if batch_input:
            BATCH_SIZE = 30 # Increased batch size for llama3-8b-8192
            results = []
            for i in range(0, len(batch_input), BATCH_SIZE):
                batch = batch_input[i:i + BATCH_SIZE]
                batch_results = categorize_transactions_batch(batch)
                results.extend(batch_results)
                
            results_map = {str(r.get("id")): r for r in results if r.get("id")}
        else:
            results_map = {}
        
        # Calculate Analytics dynamically for insight generation
        total_income = 0.0
        total_spend = 0.0
        spend_by_category = {}

        for txn in transactions:
            # If it was matched by a rule, its category is already set
            if txn.category is None:
                if txn.id in results_map:
                    res = results_map[txn.id]
                    txn.clean_description = res.get("clean_description", txn.raw_description)
                    txn.category = res.get("category", "Other")
                    is_rec = res.get("is_recurring", False)
                    txn.is_recurring = is_rec if isinstance(is_rec, bool) else str(is_rec).lower() == 'true'
                else:
                    txn.category = "Other"

            # Aggregate
            if txn.type == "CREDIT":
                total_income += txn.amount
            elif txn.type == "DEBIT":
                total_spend += txn.amount
                cat = txn.category or "Other"
                spend_by_category[cat] = spend_by_category.get(cat, 0.0) + txn.amount

        # Generate Insights
        analytics_data = {
            "total_income": total_income,
            "total_spend": total_spend,
            "spend_by_category": spend_by_category
        }
        
        insights_list = generate_financial_insights(analytics_data)
        
        for text in insights_list:
            insight = Insight(id=str(uuid.uuid4()), session_id=session_id, text=text)
            session.add(insight)

        # Mark Session Completed
        upload_session = session.get(UploadSession, session_id)
        if upload_session:
            upload_session.status = "COMPLETED"

        session.commit()

@app.get("/")
def read_root():
    return {"status": "RupeeRadar API is running"}

@app.post("/upload")
async def upload_statement(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    filename = file.filename.lower()
    if not (filename.endswith('.csv') or filename.endswith('.pdf')):
        raise HTTPException(status_code=400, detail="Only CSV and PDF files are supported.")
    
    contents = await file.read()
    
    try:
        from parser import parse_bank_statement, parse_pdf_bank_statement
        if filename.endswith('.pdf'):
            records = parse_pdf_bank_statement(contents)
        else:
            records = parse_bank_statement(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error parsing file. Please check the format.")

    from database import engine
    from sqlmodel import Session as SQLSession
    with SQLSession(engine) as session:
        upload_session = UploadSession(id=str(uuid.uuid4()), timestamp=datetime.utcnow(), status="PROCESSING")
        session.add(upload_session)
        session.commit()
        session.refresh(upload_session)
        
        for record in records:
            transaction = Transaction(
                id=str(uuid.uuid4()),
                session_id=upload_session.id,
                date=record['date'],
                amount=record['amount'],
                type=record['type'],
                raw_description=record['raw_description']
            )
            session.add(transaction)
        
        session.commit()
        session_id = upload_session.id
        
    background_tasks.add_task(process_session_background, session_id)
    
    return {"session_id": session_id, "transactions_parsed": len(records), "status": "PROCESSING"}

# --- PHASE 4: Analytics Endpoints ---

@app.get("/sessions/{session_id}/status")
def get_session_status(session_id: str):
    from database import engine
    from sqlmodel import Session as SQLSession
    with SQLSession(engine) as session:
        upload_session = session.get(UploadSession, session_id)
        if not upload_session:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"session_id": upload_session.id, "status": upload_session.status}

@app.get("/sessions/{session_id}/transactions")
def get_session_transactions(session_id: str, skip: int = 0, limit: int = 100):
    from database import engine
    from sqlmodel import Session as SQLSession, select
    with SQLSession(engine) as session:
        query = select(Transaction).where(Transaction.session_id == session_id).offset(skip).limit(limit)
        transactions = session.exec(query).all()
        return {"transactions": transactions}

@app.get("/sessions/{session_id}/analytics")
def get_session_analytics(session_id: str):
    from database import engine
    from sqlmodel import Session as SQLSession, select
    with SQLSession(engine) as session:
        transactions = session.exec(select(Transaction).where(Transaction.session_id == session_id)).all()
        
        total_income = 0.0
        total_spend = 0.0
        spend_by_category = {}
        
        for txn in transactions:
            if txn.type == "CREDIT":
                total_income += txn.amount
            elif txn.type == "DEBIT":
                total_spend += txn.amount
                cat = txn.category or "Other"
                spend_by_category[cat] = spend_by_category.get(cat, 0.0) + txn.amount
                
        return {
            "total_income": total_income,
            "total_spend": total_spend,
            "spend_by_category": spend_by_category,
            "net_savings": total_income - total_spend
        }

@app.get("/analytics/global")
def get_global_analytics():
    from database import engine
    from sqlmodel import Session as SQLSession, select
    with SQLSession(engine) as session:
        transactions = session.exec(select(Transaction)).all()
        
        # Group by YYYY-MM
        monthly_data = {}
        for txn in transactions:
            try:
                # Naive parse just YYYY-MM from YYYY-MM-DD
                month = txn.date[:7]
            except:
                continue
                
            if month not in monthly_data:
                monthly_data[month] = {"income": 0.0, "spend": 0.0}
                
            if txn.type == "CREDIT":
                monthly_data[month]["income"] += txn.amount
            elif txn.type == "DEBIT":
                monthly_data[month]["spend"] += txn.amount
                
        # Format for recharts
        chart_data = [{"month": k, "income": v["income"], "spend": v["spend"]} for k, v in sorted(monthly_data.items())]
        
        return {"monthly_trends": chart_data}

@app.get("/sessions/{session_id}/insights")
def get_session_insights(session_id: str):
    from database import engine
    from sqlmodel import Session as SQLSession, select
    with SQLSession(engine) as session:
        insights = session.exec(select(Insight).where(Insight.session_id == session_id)).all()
        return {"insights": [i.text for i in insights]}

@app.patch("/transactions/{transaction_id}")
def update_transaction_category(transaction_id: str, update: CategoryUpdate):
    from database import engine
    from sqlmodel import Session as SQLSession
    with SQLSession(engine) as session:
        txn = session.get(Transaction, transaction_id)
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        txn.category = update.category
        session.add(txn)
        session.commit()
        
        return {"status": "success", "transaction_id": transaction_id, "category": update.category}

# --- PHASE 6: Custom Rules Engine ---

class RuleCreate(BaseModel):
    keyword: str
    category: str
    is_recurring: bool = False

@app.get("/rules")
def get_rules():
    from database import engine
    from sqlmodel import Session as SQLSession, select
    from models import CategoryRule
    with SQLSession(engine) as session:
        rules = session.exec(select(CategoryRule)).all()
        return {"rules": rules}

@app.post("/rules")
def create_rule(rule_in: RuleCreate):
    from database import engine
    from sqlmodel import Session as SQLSession
    from models import CategoryRule
    with SQLSession(engine) as session:
        # Check if keyword already exists
        existing = session.exec(select(CategoryRule).where(CategoryRule.keyword == rule_in.keyword)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Rule for this keyword already exists")
            
        rule = CategoryRule(keyword=rule_in.keyword, category=rule_in.category, is_recurring=rule_in.is_recurring)
        session.add(rule)
        session.commit()
        session.refresh(rule)
        return rule

@app.delete("/rules/{rule_id}")
def delete_rule(rule_id: str):
    from database import engine
    from sqlmodel import Session as SQLSession
    from models import CategoryRule
    with SQLSession(engine) as session:
        rule = session.get(CategoryRule, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        session.delete(rule)
        session.commit()
        return {"status": "success"}
