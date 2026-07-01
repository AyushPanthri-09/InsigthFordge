from pydantic import BaseModel, Field
from typing import Optional

class AnalysisSettings(BaseModel):
    """
    Pydantic schema to validate analyst settings and contextual notes.
    """
    notes: Optional[str] = Field(
        default=None,
        description="Optional instructions or notes to guide analysis",
        max_length=2000
    )
