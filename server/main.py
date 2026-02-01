import os
import io
import json
import logging
import datetime
import asyncio
from typing import List, Optional, Any
from contextlib import asynccontextmanager

import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import google.generativeai as genai
from dotenv import load_dotenv

# Setup logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("InsightAI")

load_dotenv()

# Config
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "InsightAI")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)

# --- Pydantic Models ---
class Insight(BaseModel):
    metric: str
    value: str
    change: str
    sentiment: str
    narrative: str

class ReportResponse(BaseModel):
    id: str
    title: str
    executive_summary: str
    insights: List[Insight]
    status: str
    created_at: str
    file_name: str

# --- Database & Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Minimal initialization
    try:
        app.mongodb_client = AsyncIOMotorClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            tls=True,
            tlsAllowInvalidCertificates=True
        )
        app.db = app.mongodb_client[DATABASE_NAME]
        logger.info("✅ Database client initialized")
    except Exception as e:
        logger.error(f"❌ DB Init Error: {e}")
    
    yield
    app.mongodb_client.close()

app = FastAPI(title="Insightra API", version="3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Utilities ---

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Handles missing values, duplicates, and basic normalization."""
    df = df.drop_duplicates()
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        df[col] = df[col].fillna(df[col].median())
    cat_cols = df.select_dtypes(include=['object']).columns
    for col in cat_cols:
        df[col] = df[col].fillna('Unknown')
    return df

async def generate_ai_report_async(df_summary: str, content_preview: str, metadata: dict) -> dict:
    """Uses Gemini Pro 1.5 Flash (Async) to generate professional narratives."""
    if not GEMINI_API_KEY or "<" in GEMINI_API_KEY:
        logger.warning("Invalid GEMINI_API_KEY. Using mock response.")
        return get_mock_ai_response()

    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    You are a Senior Business Intelligence Architect.
    Analyze the following data summary and preview to generate an executive-ready business report.
    
    Context:
    Business Domain: {metadata.get('domain', 'General')}
    Report Title: {metadata.get('title', 'Analytics Report')}
    Data Summary: {df_summary}
    Data Preview: {content_preview}
    
    Requirements:
    1. Executive Summary: Professional, outcome-focused narrative for senior management.
    2. Exactly 4 Key Insights: Format as a JSON array where each entry has:
       - metric: The name of the KPI
       - value: The current value (e.g. $4.5M, 92%, etc)
       - change: % change vs period (e.g. +12%, -5%)
       - sentiment: "positive" or "negative"
       - narrative: 1-2 sentences of business context.
    
    Return ONLY a raw JSON object with these keys: "executive_summary", "insights".
    """
    
    try:
        # Use Async method to avoid blocking the event loop
        response = await model.generate_content_async(prompt)
        res_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(res_text)
        # Ensure 'insights' key exists and is a list
        if "insights" not in data or not isinstance(data["insights"], list):
             data["insights"] = get_mock_ai_response()["insights"]
        return data
    except Exception as e:
        logger.error(f"AI Generation Error: {str(e)}")
        return get_mock_ai_response()

async def structure_unstructured_data(text: str, domain: str = "General") -> list:
    """Uses AI to extract structured business records from raw text."""
    if not GEMINI_API_KEY or "<" in GEMINI_API_KEY:
        return []
        
    prompt = f"""
    You are a Data Engineering AI. Extract business/financial transaction records from the following unstructured text.
    
    Context:
    Business Domain: {domain}
    Raw Text: {text[:5000]}
    
    Requirements:
    1. Identify records that look like transactions or performance logs.
    2. For each record, extract: Date (YYYY-MM-DD), Revenue, Expense, and Description.
    3. Return them as a standardized list of JSON objects.
    4. Ensure numbers are clean (no symbols).
    5. If no records found, return [].
    
    Return ONLY a raw JSON array.
    """
    try:
        response = await model.generate_content_async(prompt)
        res_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(res_text)
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"Data Structuring Error: {str(e)}")
        return []

def get_mock_ai_response():
    return {
        "executive_summary": "Analysis indicates consistent operational reliability but highlights a 15% increase in overhead. Strategic focus on logistics efficiency is recommended.",
        "insights": [
            {"metric": "Revenue", "value": "₹4.2Cr", "change": "+12%", "sentiment": "positive", "narrative": "Growth driven by market expansion."},
            {"metric": "OpEx", "value": "₹89L", "change": "+15%", "sentiment": "negative", "narrative": "Increased logistics costs detected."},
            {"metric": "Efficiency", "value": "94%", "change": "+2%", "sentiment": "positive", "narrative": "Process automation gains observed."},
            {"metric": "Risk Score", "value": "Low", "change": "-5%", "sentiment": "positive", "narrative": "Security updates reduced vulnerability surface."}
        ]
    }

# --- Routes ---

@app.get("/")
async def root():
    return {"status": "online", "message": "InsightAI Architect API is ready"}

@app.get("/health")
async def health_check():
    return {"status": "online", "message": "API is responding"}

@app.post("/upload")
async def process_upload(
    file: UploadFile = File(...),
    user_id: str = Header(...),
    title: str = Body("Untitled Report"),
    domain: str = Body("General")
):
    logger.info(f"🚀 Processing upload: '{title}' for user {user_id}")
    try:
        content = await file.read()
        filename = file.filename
        
        # 1. Parse Data
        unstructured = False
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(content))
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(io.BytesIO(content))
            elif filename.endswith('.json'):
                df = pd.read_json(io.BytesIO(content))
            else:
                unstructured = True
                text = content.decode('utf-8', errors='ignore')
                logger.info("🧩 Unstructured data detected. Triggering AI Structuring Layer...")
                structured_list = await structure_unstructured_data(text, domain)
                if structured_list:
                    df = pd.DataFrame(structured_list)
                else:
                    logger.warning("⚠️ AI Structuring returned no records. Using raw backup.")
                    df = pd.DataFrame([{"raw_content": text, "date": datetime.datetime.now().isoformat()}])
        except Exception as e:
            logger.error(f"Parsing failed: {e}")
            raise HTTPException(status_code=400, detail="Could not parse file format.")

        # 2. Step: Cleaning
        df = clean_data(df)
        
        # 3. Step: AI Summary
        try:
            df_summary = df.describe().to_string()
            content_preview = df.head(10).to_json()
        except:
            df_summary = "Non-numeric or sparse data"
            content_preview = df.to_json() if len(df) < 20 else df.head(10).to_json()
        
        logger.info("🧠 Requesting AI synthesis...")
        ai_res = await generate_ai_report_async(df_summary, content_preview, {"title": title, "domain": domain})
        
        # 4. Step: Save to Database
        report_id = f"REP_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Convert cleaned data to list of dicts for MongoDB storage
        cleaned_json = df.to_dict(orient='records')
        
        report_data = {
            "id": report_id,
            "user_id": user_id,
            "title": title,
            "file_name": filename,
            "executive_summary": ai_res.get("executive_summary"),
            "insights": ai_res.get("insights"),
            "cleaned_data": cleaned_json,
            "is_unstructured": unstructured,
            "status": "completed",
            "created_at": datetime.datetime.now().isoformat()
        }
        
        logger.info("💾 Archiving structured data to database...")
        try:
            await asyncio.wait_for(app.db.reports.insert_one(report_data), timeout=10.0)
        except Exception as db_err:
            logger.error(f"Database Save Error: {db_err}")
            # Still return to user even if DB fails
            report_data["status"] = "preview_only"
        
        report_data.pop('_id', None)
        logger.info(f"✅ Report '{report_id}' generated successfully")
        return report_data
        
    except Exception as e:
        logger.error(f"🔥 Critical Final Process Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/aggregate")
async def get_aggregate_analytics(
    user_id: str = Header(...),
    frequency: str = "M", # W, M, Y
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Merges all user datasets and performs comprehensive analysis."""
    if not hasattr(app, 'db') or app.db is None:
        raise HTTPException(status_code=503, detail="Database connection offline")

    try:
        # 1. Fetch all reports
        cursor = app.db.reports.find({"user_id": user_id})
        all_reports = []
        async for doc in cursor:
            all_reports.append(doc)
        
        if not all_reports:
            return {"message": "No data found", "metrics": {}, "chart_data": [], "ai_synthesis": {}}

        # 2. Process each report to ensure date consistency
        all_processed_rows = []
        for report in all_reports:
            data = report.get("cleaned_data", [])
            created_at = report.get("created_at")
            df_temp = pd.DataFrame(data)
            
            if df_temp.empty:
                continue
                
            # Find date column for THIS specific report
            d_col = next((c for c in df_temp.columns if any(k in c.lower() for k in ['date', 'time', 'period', 'day'])), None)
            
            if d_col:
                df_temp['date_parsed'] = pd.to_datetime(df_temp[d_col], errors='coerce')
            else:
                df_temp['date_parsed'] = pd.to_datetime(created_at, errors='coerce')
                
            # Fill any remaining NaNs with the report creation date
            df_temp['date_parsed'] = df_temp['date_parsed'].fillna(pd.to_datetime(created_at, errors='coerce'))
            all_processed_rows.append(df_temp)

        if not all_processed_rows:
            return {"message": "No data found", "metrics": {}, "chart_data": [], "ai_synthesis": {}}

        df = pd.concat(all_processed_rows, ignore_index=True)

        # 3. Identify Numeric Columns for the whole set
        rev_col = next((c for c in df.columns if any(k in c.lower() for k in ['revenue', 'sales', 'income', 'total'])), None)
        exp_col = next((c for c in df.columns if any(k in c.lower() for k in ['expense', 'cost', 'spend', 'payout', 'charges'])), None)
        prof_col = next((c for c in df.columns if any(k in c.lower() for k in ['profit', 'margin', 'net'])), None)

        # 4. Handle Currency/Numbers
        for col in [rev_col, exp_col, prof_col]:
            if col and col in df.columns:
                if df[col].dtype == object:
                    df[col] = pd.to_numeric(df[col].astype(str).str.replace(r'[^\d.]', '', regex=True), errors='coerce').fillna(0)
                else:
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # 5. Profit calculation
        if rev_col and exp_col and (not prof_col or prof_col not in df.columns):
            df['profit_generated'] = df[rev_col] - df[exp_col]
            prof_col = 'profit_generated'

        # 6. Filter by Date
        if start_date:
            df = df[df['date_parsed'] >= pd.to_datetime(start_date)]
        if end_date:
            df = df[df['date_parsed'] <= pd.to_datetime(end_date)]

        if df.empty:
            return {"message": "Empty timeframe", "metrics": {}, "chart_data": [], "ai_synthesis": {}}

        # 7. Resampling
        # Map frontend aliases to robust Pandas frequency strings
        freq_map = {'W': 'W', 'M': 'ME', 'Y': 'YE'}
        resample_freq = freq_map.get(frequency, 'ME')
        
        df.set_index('date_parsed', inplace=True)
        agg_cols = {col: 'sum' for col in [rev_col, exp_col, prof_col] if col and col in df.columns}
        
        if not agg_cols:
            return {"message": "No numeric data", "metrics": {}, "chart_data": [], "ai_synthesis": {}}

        resampled = df.resample(resample_freq).agg(agg_cols).fillna(0)

        # Reset index for JSON response
        resampled_json = resampled.copy()
        resampled_json.index = resampled_json.index.strftime('%Y-%m-%d')
        chart_data = resampled_json.reset_index().rename(columns={'date_parsed': 'index'}).to_dict(orient='records')

        # 8. KPI Calculations (Context-Aware)
        # We focus on the LATEST period of the chosen frequency
        latest_rev = 0
        latest_exp = 0
        latest_prof = 0
        prev_prof = 0
        prof_growth = 0
        efficiency = 0
        
        if not resampled.empty:
            latest_row = resampled.iloc[-1]
            latest_rev = latest_row.get(rev_col, 0) if rev_col else 0
            latest_exp = latest_row.get(exp_col, 0) if exp_col else 0
            latest_prof = latest_row.get(prof_col, 0) if prof_col else 0
            
            # Growth vs Previous Period
            if len(resampled) >= 2:
                prev_prof = resampled[prof_col].iloc[-2] if prof_col else 0
                if abs(prev_prof) > 0:
                    prof_growth = round(((latest_prof - prev_prof) / abs(prev_prof) * 100), 2)
            
            # Efficiency Score (Profit Margin %)
            if latest_rev > 0:
                efficiency = round((latest_prof / latest_rev) * 100, 1)
            else:
                efficiency = 0

        # 9. AI Insights & Projection
        summary_str = f"Latest {frequency} Report: Revenue={latest_rev}, Profit={latest_prof}, Growth={prof_growth}%."
        preview_json = resampled.tail(10).to_json()
        ai_insights = await generate_ai_report_async(summary_str, preview_json, {"title": f"Dynamic {frequency} Analysis", "domain": "Business"})

        return {
            "metrics": {
                "total_revenue": latest_rev,
                "total_expenses": latest_exp,
                "total_profit": latest_prof,
                "growth": prof_growth,
                "efficiency": efficiency,
                "projection": round(latest_prof * (1 + (prof_growth/100 if prof_growth > 0 else 0.05)), 2)
            },
            "chart_data": chart_data,
            "ai_synthesis": ai_insights,
            "column_mapping": {
                "date": 'date_parsed',
                "revenue": rev_col,
                "expenses": exp_col,
                "profit": prof_col
            }
        }
    except Exception as e:
        logger.error(f"🔥 Aggregation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reports")
async def get_user_reports(user_id: str = Header(...)):
    """Fetch user-scoped archives from database."""
    logger.info(f"🔍 Fetching reports for user: {user_id}")
    if not hasattr(app, 'db') or app.db is None:
        logger.error("❌ Database connection not initialized")
        raise HTTPException(status_code=503, detail="Database connection not initialized")
    try:
        logger.info(f"📂 Querying collection: {app.db.reports.name}")
        cursor = app.db.reports.find({"user_id": user_id}).sort("created_at", -1)
        reports = []
        async for doc in cursor:
            doc.pop('_id', None)
            reports.append(doc)
        logger.info(f"✅ Found {len(reports)} reports for user {user_id}")
        return reports
    except Exception as e:
        logger.error(f"🔥 Reports Fetch Error: {e}")
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    # Using app object directly is often more reliable
    uvicorn.run(app, host="0.0.0.0", port=port)
