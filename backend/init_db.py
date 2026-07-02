from backend.core.database import engine, Base
from backend.models.db_models import User, Project, Dataset, DatasetVersion, AnalysisHistory, Report, Session, AuditLog

print("Initializing InsightForge Database...")
Base.metadata.create_all(bind=engine)
print("Database initialized successfully!")
