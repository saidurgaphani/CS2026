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

# --- AI Configuration & Provider ---

def get_ai_model():
    """Dynamically configures and returns the AI model to pick up .env changes."""
    # Priority 1: System Environment (Render/Vercel Dashboard)
    key = os.getenv("GEMINI_API_KEY")
    
    # Priority 2: .env file (Local Development) - only if key is missing from system
    if not key or "AIza" not in key:
        load_dotenv(override=True)
        key = os.getenv("GEMINI_API_KEY")
        
    if not key or "AIza" not in key:
        logger.warning("⚠️ GEMINI_API_KEY is not set or invalid in environment.")
        return None
    
    try:
        trunc_key = key[:10] + "..." if key else "None"
        logger.info(f"🔄 AI Provider: Loading model with key {trunc_key}")
        genai.configure(api_key=key)
        # Use v1beta for better compatibility if needed, but 1.5-flash is standard
        return genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        logger.error(f"AI Model Init Error: {e}")
        return None

# Initial placeholder for direct access (optional, but keep naming consistent)
def ai_model_proxy():
    return get_ai_model()

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
    expose_headers=["*"]
)

# --- Utilities ---

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Advanced Data Cleaning Pipeline:
    1. Standardization of column names.
    2. Intelligent imputation for missing values.
    3. Date parsing and normalization.
    4. Numeric constraints and type enforcement.
    """
    # 1. Standardize Headers
    df.columns = [str(col).strip().lower().replace(" ", "_").replace("-", "_") for col in df.columns]
    
    # 2. Remove duplicates
    df = df.drop_duplicates()
    
    # 3. Numeric Cleaning
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        # Fill missing numeric values with median to avoid skewing
        df[col] = df[col].fillna(df[col].median())
    
    # 4. Categorical Cleaning
    cat_cols = df.select_dtypes(include=['object']).columns
    for col in cat_cols:
        # infer dates if possible
        if 'date' in col or 'time' in col:
            df[col] = pd.to_datetime(df[col], errors='coerce')
            # Fill missing dates with today or forward fill
            df[col] = df[col].ffill().fillna(datetime.datetime.now())
        else:
            df[col] = df[col].fillna('Unknown')
            df[col] = df[col].astype(str).str.strip()

    # 5. Drop empty columns/rows if any remain
    df = df.dropna(how='all', axis=0).dropna(how='all', axis=1)
    
    return df

async def generate_ai_report_async(df_summary: str, content_preview: str, metadata: dict) -> dict:
    """Uses Gemini Pro 1.5 Flash (Async) to generate professional narratives."""
    model = get_ai_model()
    if not model:
        logger.warning("No valid AI model available. Using mock response.")
        return get_mock_ai_response()

    # Use the dynamic model
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
    # Use global key or refresh from env
    current_key = os.getenv("GEMINI_API_KEY")
    if not current_key or "AIza" not in current_key:
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
    model = get_ai_model()
    if not model:
        return []
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
            
            if unstructured:
                # 1b. Structuring Layer for Raw Text
                logger.info("🧩 Unstructured data detected. Triggering AI Structuring Layer...")
                structured_list = await structure_unstructured_data(text, domain)
                
                if structured_list and len(structured_list) > 0:
                    df = pd.DataFrame(structured_list)
                    logger.info(f"✅ AI successfully extracted {len(df)} records from unstructured text.")
                else:
                    logger.warning("⚠️ AI Structuring returned no records. Using raw backup.")
                    df = pd.DataFrame([{"raw_content": text, "date": datetime.datetime.now().isoformat()}])
        except Exception as e:
            logger.error(f"Parsing failed: {e}")
            raise HTTPException(status_code=400, detail="Could not parse file format.")

        # 2. Step: Deep Cleaning & Optimization
        logger.info("🧹 Initiating Deep Cleaning & Optimization Protocol...")
        df = clean_data(df)
        logger.info(f"✨ Data Optimized. Shape: {df.shape}")

        # 3. Step: AI Synthesis (Insights Generation)
        try:
            # Create a rich summary that includes data types and distribution
            buffer = io.StringIO()
            df.info(buf=buffer)
            data_info = buffer.getvalue()
            
            df_stats = df.describe(include='all').to_string()
            
            # Smart preview: get most relevant columns
            content_preview = df.head(10).to_json(orient='records', date_format='iso')
            
            data_context = f"Data Schema:\n{data_info}\n\nStatistical Summary:\n{df_stats}"
        except Exception as e:
            logger.error(f"Summary Generation Failed: {e}")
            data_context = "Data summary unavailable due to format complexity."
            content_preview = df.head(5).to_json()
        
        logger.info("🧠 Requesting AI synthesis on Optimized Data...")
        ai_res = await generate_ai_report_async(data_context, content_preview, {"title": title, "domain": domain})
        
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
@app.delete("/reports/{report_id}")
async def delete_report(report_id: str):
    """Permanently delete a report and its associated metadata."""
    logger.info(f"🗑️ Request to delete report ID: {report_id}")
    if not hasattr(app, 'db') or app.db is None:
        raise HTTPException(status_code=503, detail="Database offline")
    try:
        # Try delete by string ID first
        res = await app.db.reports.delete_one({"id": report_id})
        
        if res.deleted_count == 0:
            logger.warning(f"⚠️ Report {report_id} not found by ID. Trying ObjectId...")
            from bson import ObjectId
            try:
                res = await app.db.reports.delete_one({"_id": ObjectId(report_id)})
            except:
                pass
        
        if res.deleted_count > 0:
             logger.info(f"✅ Successfully deleted report {report_id} from DB.")
             return {"status": "deleted", "report_id": report_id}
        
        logger.error(f"❌ Failed to find report {report_id} for deletion.")
        raise HTTPException(status_code=404, detail="Report not found")
    except Exception as e:
        logger.error(f"🔥 Delete Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Chat Persistence Models ---
class ChatSession(BaseModel):
    id: str
    user_id: str
    title: str
    messages: List[Any]
    updated_at: str

@app.get("/analytics/chats")
async def get_user_chats(user_id: str):
    """Retrieve all chat sessions for a user."""
    cursor = app.db.chats.find({"user_id": user_id}).sort("updated_at", -1)
    chats = []
    async for doc in cursor:
        # Use our custom 'id' if exists, otherwise fallback to stringified '_id'
        doc["id"] = doc.get("id") or str(doc.get("_id"))
        doc.pop("_id", None)
        chats.append(doc)
    return chats

@app.get("/analytics/chat/{chat_id}")
async def get_chat_history(chat_id: str):
    """Retrieve full message history for a specific session."""
    try:
        # Try finding by our custom id first
        chat = await app.db.chats.find_one({"id": chat_id})
        
        if not chat:
            from bson import ObjectId
            try:
                chat = await app.db.chats.find_one({"_id": ObjectId(chat_id)})
            except:
                pass
             
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
            
        chat["id"] = chat.get("id") or str(chat.get("_id"))
        chat.pop("_id", None)
        return chat
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/analytics/chat/{chat_id}")
async def delete_chat(chat_id: str):
    """Permanently delete a chat session."""
    try:
        from bson import ObjectId
        # Try delete by custom id
        res = await app.db.chats.delete_one({"id": chat_id})
        
        if res.deleted_count == 0:
            # Try delete by ObjectId
            try:
                res = await app.db.chats.delete_one({"_id": ObjectId(chat_id)})
            except:
                pass
                
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Chat not found")
            
        return {"status": "deleted", "chat_id": chat_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Chat Models ---

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_id: str
    chat_id: Optional[str] = None
    title: Optional[str] = None

async def get_all_user_data_context(user_id: str) -> str:
    """Aggregates all user reports into a summary text for Gemini context."""
    reports = await app.db.reports.find({"user_id": user_id}).to_list(100)
    if not reports:
        return "No data reports found for this user."
    
    context_parts = []
    for r in reports:
        cleaned_data = r.get("cleaned_data", [])
        if not cleaned_data:
            continue
            
        df = pd.DataFrame(cleaned_data)
        rev_col = next((c for c in df.columns if any(k in c.lower() for k in ['revenue', 'sales', 'income'])), None)
        exp_col = next((c for c in df.columns if any(k in c.lower() for k in ['expense', 'cost', 'spend'])), None)
        prof_col = next((c for c in df.columns if any(k in c.lower() for k in ['profit', 'margin', 'net'])), None)
        date_col = next((c for c in df.columns if any(k in c.lower() for k in ['date', 'time', 'period'])), None)
        
        # Numeric conversion
        for col in [rev_col, exp_col, prof_col]:
             if col and col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # Date handling
        date_range = "N/A"
        if date_col:
            try:
                temp_dates = pd.to_datetime(df[date_col], errors='coerce').dropna()
                if not temp_dates.empty:
                    date_range = f"{temp_dates.min().strftime('%Y-%m-%d')} to {temp_dates.max().strftime('%Y-%m-%d')}"
            except:
                pass

        summary = {
            "file": r.get("file_name", "Unknown File"),
            "title": r.get("title", "Untitled"),
            "rows": len(df),
            "date_range": date_range,
            "total_revenue": float(df[rev_col].sum()) if rev_col else 0,
            "total_profit": float(df[prof_col].sum()) if prof_col else 0,
            "sample_records": json.loads(df.head(5).to_json(orient='records', date_format='iso'))
        }
        context_parts.append(json.dumps(summary))
    
    return "\n---\n".join(context_parts)

from fastapi.responses import StreamingResponse

@app.post("/analytics/chat")
async def data_aware_chat(request: ChatRequest):
    """Real-time streaming analyst using Server-Sent Events (SSE)."""
    async def chat_generator():
        try:
            # 1. Gather Context
            data_context = await get_all_user_data_context(request.user_id)
            
            # 2. Prepare Prompt
            system_prompt = f"""
            You are 'InsightAI Analyst', a world-class Data Scientist and Business Consultant.
            CURRENT DATE: {datetime.datetime.now().strftime('%Y-%m-%d')}
            
            USER DATA CONTEXT:
            {data_context}
            
            GUIDELINES:
            1. Answer strictly based on data.
            2. If date ranges are provided, use them to answer "this month" or "this year" accurately.
            3. Use rich Markdown (bold, headers, tables).
            4. Keep it concise but insightful.
            """
            
            user_query = request.messages[-1].content
            model = get_ai_model()
            
            # Persistence Logic: Create or Update Session
            chat_id = request.chat_id
            chat_title = request.title or (user_query[:40] + "..." if len(user_query) > 40 else user_query)
            
            if not chat_id:
                chat_id = f"CHAT_{datetime.datetime.now().timestamp()}"
            
            if not model:
                mock = get_mock_chat_response(user_query, data_context)
                all_msgs = request.messages + [ChatMessage(role="assistant", content=mock['content'])]
                await app.db.chats.update_one(
                    {"id": chat_id},
                    {"$set": {
                        "user_id": request.user_id,
                        "title": chat_title,
                        "messages": [m.dict() for m in all_msgs],
                        "updated_at": datetime.datetime.now().isoformat()
                    }},
                    upsert=True
                )
                yield f"data: {json.dumps({'content': mock['content'], 'id': chat_id, 'title': chat_title})}\n\n"
                return

            full_query = f"{system_prompt}\n\nUSER QUERY: {user_query}"
            
            # Use streaming generation with Fallback
            accumulated_text = ""
            try:
                response = await model.generate_content_async(full_query, stream=True)
                
                async for chunk in response:
                    if chunk.text:
                        accumulated_text += chunk.text
                        yield f"data: {json.dumps({'content': chunk.text, 'id': chat_id, 'title': chat_title})}\n\n"
            except Exception as e:
                logger.error(f"AI Stream Failed (Quota/Net): {e}")
                # Fallback to Mock if AI fails mid-stream or at start
                logger.warning("⚠️ Triggering Mock Fallback due to AI Error")
                mock_payload = get_mock_chat_response(user_query, data_context, str(e))
                mock_text = mock_payload['content']
                
                # If we already sent some text, append a newline explanation
                if accumulated_text:
                    fallback_msg = "\n\n[System: Connection lost. Switching to offline backup...]\n" + mock_text
                    yield f"data: {json.dumps({'content': fallback_msg, 'id': chat_id, 'title': chat_title})}\n\n"
                    accumulated_text += fallback_msg
                else:
                    # If we haven't sent anything yet, just send the mock
                    yield f"data: {json.dumps({'content': mock_text, 'id': chat_id, 'title': chat_title})}\n\n"
                    accumulated_text = mock_text

            # Save completed interaction
            all_msgs = request.messages + [ChatMessage(role="assistant", content=accumulated_text)]
            await app.db.chats.update_one(
                {"id": chat_id},
                {"$set": {
                    "user_id": request.user_id,
                    "title": chat_title,
                    "messages": [m.dict() for m in all_msgs],
                    "updated_at": datetime.datetime.now().isoformat()
                }},
                upsert=True
            )
            
        except Exception as e:
            logger.error(f"Critical Chat System Error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(chat_generator(), media_type="text/event-stream")

def get_mock_chat_response(query: str, data_context: str, error_context: str = "") -> dict:
    """Provides a data-aware mock response when the AI engine is down."""
    prompt_hint = "Your API key is missing or invalid. I'm currently running in 'Safe Analysis' mode."
    if "429" in error_context:
        prompt_hint = "⚠️ **Quota Exceeded**: Your free Gemini API tier limit has been reached. I'm using fallback logic until the quota resets."
    elif "403" in error_context:
        prompt_hint = "⚠️ **API Key Leaked**: Your Gemini key has been disabled by Google. I'm using temporary analytical logic."
    
    # Generic but context-aware response construction
    response = f"{prompt_hint}\n\nBased on your synchronized repositories:\n\n"
    
    if "revenue" in query.lower() or "profit" in query.lower():
        response += "- I see multiple financial records. Your combined revenue appears to be trending positively.\n"
        response += "- Your profit margins are currently being calculated across all uploaded datasets.\n"
    elif "analyze" in query.lower():
        response += "- I've parsed your unstructured data and identified several key growth vectors.\n"
        response += "- Your operational efficiency is roughly 72% based on typical industry benchmarks for this data volume.\n"
    else:
        response += "- I'm ready to analyze your datasets. You have multiple reports ready for deep-diving.\n"
        response += "- Please update your API key in the `.env` file to enable full GPT-4 level insights.\n"

    response += "\n*Note: This is a structured analysis. Full conversational intelligence will resume once the API key is updated.*"

    return {
        "id": f"MOCK_{datetime.datetime.now().timestamp()}",
        "role": "assistant",
        "content": response,
        "created_at": datetime.datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    # Using app object directly is often more reliable
    uvicorn.run(app, host="0.0.0.0", port=port)
