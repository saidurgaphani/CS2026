# Insightra: Generative AI Business Intelligence System

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Gemini_1.5_Flash-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)

Insightra is a powerful Generative AI system designed to bridge the gap between raw data and executive decision-making. It transforms structured (CSV, JSON, Excel) and unstructured (raw text) data into professional business reports, narratives, and actionable insights with factual consistency.

## 🚀 Problem Statement
Organizations spend countless hours manually converting raw data into readable business reports. This process is slow, prone to inconsistencies, and often lacks a cohesive narrative. Insightra automates this entire pipeline, understanding data context to produce executive-ready summaries.

## ✨ Key Features
- **Flexible Data Input**: Seamlessly upload CSV, JSON, Excel, or raw text files.
- **Unstructured to Structured**: Uses Gemini Pro to extract business records from messy, unstructured text.
- **AI Analyst Chat**: A real-time, data-aware streaming analyst that answers questions about your specific datasets.
- **Executive Narratives**: Generates professional narratives, executive summaries, and insight highlights.
- **Trend & Anomaly Detection**: Automatically identifies statistical anomalies and business trends.
- **Intelligent Data Pipeline**: Advanced cleaning including standardization, imputation, and normalization.
- **Beautiful Visualizations**: Interactive charts and cards built with Recharts and Framer Motion.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS & Shadcn UI
- **Animations**: Framer Motion & GSAP
- **Icons/UI**: Lucide React & Radix UI
- **State Management**: React Hook Form with Zod validation

### Backend
- **Framework**: FastAPI (Python)
- **AI Model**: Google Gemini 1.5 Flash
- **Database**: MongoDB Atlas (Async with Motor)
- **Data Processing**: Pandas, NumPy, Scikit-learn
- **API**: RESTful with SSE (Server-Sent Events) for real-time chat

## 📂 Project Structure
```text
├── client/                 # React frontend (Vite)
│   ├── src/components/     # UI components & Glassmorphism effects
│   ├── src/pages/          # Main application views (Dashboard, Chat, Insights)
│   └── tailwind.config.js  # Custom design tokens
├── server/                 # FastAPI backend
│   ├── main.py             # Core logic & AI orchestration
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Environment variables
└── render.yaml             # Deployment configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MongoDB Atlas Account
- Gemini API Key

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/saidurgaphani/CS2026.git
   cd CS2026
   ```

2. **Backend Setup**
   ```bash
   cd server
   pip install -r requirements.txt
   # Create a .env file with your MONGO_URI and GEMINI_API_KEY
   python main.py
   ```

3. **Frontend Setup**
   ```bash
   cd ..
   npm install
   npm run dev
   ```

## 🛡️ Factual Consistency
Insightra ensures factual consistency by grounding Gemini's narratives in strict data context. The system performs pre-analysis on datasets (summaries, metadata) before passing it to the LLM, ensuring that generated reports reflect the actual numbers in your files.


---
*Developed for Hackathon Project - 2026*
