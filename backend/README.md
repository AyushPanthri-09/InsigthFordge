# InsightForge AI Backend Service

An enterprise-grade, production-ready Python backend built with FastAPI to parse, validate, and orchestrate analysis pipelines for CSV and Excel datasets.

---

## Technical Stack

- **Framework**: Python 3.12+, FastAPI
- **Parsing & Math**: Pandas, NumPy, OpenPyXL
- **Validation**: Pydantic v2, Pydantic Settings
- **Testing**: Pytest, HTTPX

---

## Structure

- `app.py`: FastAPI server setup, middleware (CORS), and routers mounting.
- `core/`: Logger configuration, security layers, and configuration loader.
- `api/`: Endpoint controllers for `/health`, `/upload`, and `/analyze`.
- `models/`: Input/output validation models strictly conforming to schema contracts.
- `services/`: Staged file, parser, and schema validator utilities.
- `utils/`: Custom mapping exceptions and formatting helper functions.

---

## Installation & Setup

1. **Change Directory**:

   ```bash
   cd backend
   ```

2. **Initialize Environment Configuration**:
   Create a `.env` file from the example:

   ```bash
   cp .env.example .env
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

---

## Running the Server

Start the FastAPI application in reload mode:

```bash
uvicorn app:app --reload
```

- **Server URL**: `http://127.0.0.1:8000`
- **Swagger Interactive Documentation**: `http://127.0.0.1:8000/docs`
- **ReDoc Alternative Documentation**: `http://127.0.0.1:8000/redoc`

---

## Running Automated Tests

Run the test suite from the root of the project:

```bash
python -m pytest backend/tests/
```
