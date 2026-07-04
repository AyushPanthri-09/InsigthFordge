InsightForge – AI-Powered Data Analysis Platform

Overview

InsightForge is an advanced AI-driven data analytics platform designed to convert raw datasets into actionable business insights. Users can upload CSV or Excel files, after which the platform automatically performs data cleaning, analysis, and visualization. It also generates AI-powered insights and strategic recommendations.

The platform streamlines exploratory data analysis (EDA), enabling users to make informed, data-driven decisions without requiring extensive programming expertise.

---

Features

- Upload CSV and Excel datasets
- Automated data cleaning and preprocessing
- Comprehensive exploratory data analysis (EDA)
- Interactive charts and visualizations
- AI-generated insights
- Actionable business recommendations
- Summary statistics generation
- Downloadable analysis reports
- Responsive and modern web interface

---

System Architecture

User
│
▼
Frontend (React + Vite)
│
▼
FastAPI Backend
│
├── Data Validation
├── Data Cleaning
├── Statistical Analysis
├── AI Insight Generation
└── Report Generation
│
▼
Results Dashboard

---

Technology Stack

Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- React Query

Backend

- Python
- FastAPI
- Pandas
- NumPy
- SQLAlchemy
- Pydantic

Database

- PostgreSQL

AI Integration

- OpenAI-compatible AI SDK

Additional Tools

- Git & GitHub
- Docker (optional)

---

Project Structure

InsightForge/
│
├── backend/
│ ├── api/
│ ├── core/
│ ├── services/
│ ├── repositories/
│ ├── models/
│ └── utils/
│
├── src/
│
├── public/
│
├── package.json
├── vite.config.ts
└── README.md

---

Workflow

1. Upload a CSV or Excel file.
2. Validate the dataset.
3. Clean missing values and remove duplicates.
4. Perform exploratory data analysis (EDA).
5. Generate interactive visualizations.
6. Produce AI-driven insights.
7. Present business recommendations.
8. Download the analysis report.

---

Key Functionalities

- Data upload and validation
- Data cleaning and preprocessing
- Statistical and correlation analysis
- Data visualization
- AI-powered insight generation
- Recommendation engine
- Report generation

---

Installation

Clone Repository

git clone <repository-url>

Frontend Setup

cd frontend
npm install
npm run dev

Backend Setup

cd backend
pip install -r requirements.txt
uvicorn app:app --reload

---

Business Use Cases

- Customer analytics
- Sales performance analysis
- Financial reporting
- Marketing analytics
- Inventory management
- Human resources analytics
- Business intelligence

---

Screenshots

Include screenshots of:

- Home page
- Dataset upload interface
- Dashboard
- AI-generated insights
- Recommendations

---

Future Enhancements

- Predictive analytics capabilities
- Integration of machine learning models
- Real-time data processing
- Automated PDF report generation
- Multi-language support
- Cloud deployment options

---

Contributors

-Team Cybermind

---
