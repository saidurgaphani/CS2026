from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import json
import io
import os
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="InsightAI API", description="AI-driven business report generator")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ReportRequest(BaseModel):
    file_id: str
    template: str = "business_performance"

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

@app.get("/")
async def root():
    return {"message": "InsightAI Architect API is online"}

@app.post("/upload")
async def upload_data(file: UploadFile = File(...)):
    filename = file.filename
    content = await file.read()
    
    # Simple ETL process
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith('.json'):
            df = pd.DataFrame(json.loads(content))
        else:
            # Handle text
            text_content = content.decode('utf-8')
            return {"type": "text", "preview": text_content[:200]}
            
        return {
            "type": "structured",
            "columns": list(df.columns),
            "rows": len(df),
            "preview": df.head(5).to_dict(orient='records')
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid file format: {str(e)}")

@app.post("/generate-report", response_model=ReportResponse)
async def generate_report(request: ReportRequest):
    # This is where the AI Layer Logic lives
    # 1. Fetch file from storage
    # 2. Context Analysis (LLM)
    # 3. Insight Synthesis
    # 4. Narrative Generation
    
    # Mock Response for MVP
    return {
        "id": "rep_78234",
        "title": "Quarterly Operations Audit",
        "executive_summary": "The analysis reveals a steady growth in revenue but highlights significant inefficiencies in supply chain logistics.",
        "insights": [
            {
                "metric": "Revenue",
                "value": "$4.2M",
                "change": "+12%",
                "sentiment": "positive",
                "narrative": "Consistent growth driven by regional expansion."
            },
            {
                "metric": "Logistics Cost",
                "value": "$890k",
                "change": "+24%",
                "sentiment": "negative",
                "narrative": "Surge in fuel surcharges and carrier delays."
            }
        ],
        "status": "completed"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
