import os
import json
from groq import Groq
from dotenv import load_dotenv
from typing import List, Dict, Any

load_dotenv()

# Initialize Groq client
client = Groq(api_key=os.environ.get("GROQ_API_KEY", "dummy_key_for_testing"))

SYSTEM_PROMPT = """
You are an expert financial AI categorizer. 
Your task is to analyze a list of bank transactions and categorize them.

You MUST respond with ONLY valid JSON containing a key "transactions" which holds a list of objects, each with:
- "id": the same id provided in the input
- "category": Choose one of ["Food & Dining", "Shopping", "Travel", "Bills & Utilities", "Salary & Income", "Investment", "Health", "Entertainment", "Other"]
- "clean_description": A short, readable name for the merchant (e.g., if input is "Zomato[REDACTED]", output "Zomato").
- "is_recurring": true if this looks like a subscription, rent, EMI, or salary. false otherwise.

Example Output:
{
  "transactions": [
    {"id": "1", "category": "Entertainment", "clean_description": "Netflix", "is_recurring": true},
    {"id": "2", "category": "Salary & Income", "clean_description": "Salary", "is_recurring": true}
  ]
}
"""

INSIGHT_SYSTEM_PROMPT = """
You are a highly intelligent financial advisor. 
Based on the user's categorized transaction data and analytics, generate 2-3 personalized, punchy insights about their spending habits.

The output MUST be valid JSON containing an "insights" key, which holds a list of strings (each string is one insight). Keep insights friendly and helpful.

Example Output:
{
  "insights": [
    "You spent 40% of your outflow on Food & Dining. Try cooking at home to increase your savings!",
    "Great job keeping your entertainment budget under 5% this month."
  ]
}
"""

def categorize_transactions_batch(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Takes a batch of transactions and returns their categorized results from Groq.
    """
    if not transactions:
        return []

    input_data = [
        {
            "id": txn["id"],
            "desc": txn["sanitized_desc"],
            "amount": txn["amount"],
            "type": txn["type"]
        }
        for txn in transactions
    ]

    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(input_data)}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"},
            temperature=0.0
        )
        
        content = response.choices[0].message.content
        parsed = json.loads(content)
        
        return parsed.get("transactions", [])
            
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return []

def generate_financial_insights(analytics_data: Dict[str, Any]) -> List[str]:
    """
    Generates personalized insights using the Groq API based on aggregated analytics.
    """
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": INSIGHT_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(analytics_data)}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"},
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        parsed = json.loads(content)
        
        return parsed.get("insights", ["Keep an eye on your spending!"])
            
    except Exception as e:
        print(f"Error calling Groq API for insights: {e}")
        return ["Our AI advisor is currently taking a break. Check back later!"]
