from __future__ import annotations
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid

class UploadSession(SQLModel, table=True):
    id: str = Field(primary_key=True)
    timestamp: datetime
    status: str = Field(default="PENDING")

class Transaction(SQLModel, table=True):
    id: str = Field(primary_key=True)
    session_id: str = Field(foreign_key="uploadsession.id")
    date: str
    amount: float
    type: str # "CREDIT" or "DEBIT"
    raw_description: str
    clean_description: Optional[str] = None
    category: Optional[str] = None
    is_recurring: bool = False
    confidence_score: Optional[float] = None

class Insight(SQLModel, table=True):
    id: str = Field(primary_key=True)
    session_id: str = Field(foreign_key="uploadsession.id")
    text: str

class CategoryRule(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    keyword: str = Field(index=True, unique=True)
    category: str
    is_recurring: bool = False
