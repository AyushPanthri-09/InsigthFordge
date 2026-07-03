from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from backend.services.data_analyst.contracts import ConfidenceBreakdown

class ExecutiveBaseObject(BaseModel):
    """
    Enforces trace evidence, confidence propagation, and communication audit pathways.
    """
    evidence_ids: List[str] = Field(default_factory=list)
    confidence_breakdown: ConfidenceBreakdown
    validation_status: str = "valid"  # valid, warning, invalid
    limitations: List[str] = Field(default_factory=list)
    generated_by: str = "AI Executive Communicator"
    reasoning_path: str = ""

class ExecutiveSummary(ExecutiveBaseObject):
    """Concise summary cards using only validated findings."""
    summary_id: str
    text_content: str
    key_findings: List[str] = Field(default_factory=list)
    business_impact: str
    top_risks: List[str] = Field(default_factory=list)
    top_opportunities: List[str] = Field(default_factory=list)
    highest_priority_recommendation: str

class AudienceReport(ExecutiveBaseObject):
    """Tone-tailored briefings for specific corporate audiences (CEO, Investors, etc.)."""
    audience_type: str  # CEO, Board, Investors, Operations, Finance, Sales, Marketing, HR, Technical
    summary_card: str
    tone_narrative: str

class DashboardNarrative(ExecutiveBaseObject):
    """Text storytelling narratives for dashboards, KPIs, and anomalies."""
    narrative_id: str
    kpi_narratives: Dict[str, str] = Field(default_factory=dict)
    chart_narratives: Dict[str, str] = Field(default_factory=dict)
    anomaly_narratives: Dict[str, str] = Field(default_factory=dict)

class PresentationSlide(BaseModel):
    """A slide containing bullets, related charts, and speaker notes."""
    title: str
    summary: str
    bullet_points: List[str] = Field(default_factory=list)
    chart_keys: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    speaker_notes: str = ""

class PresentationDeck(ExecutiveBaseObject):
    """Presentation Slide Deck metadata container."""
    deck_id: str
    slides: List[PresentationSlide] = Field(default_factory=list)

class ExecutiveReport(ExecutiveBaseObject):
    """The finalized markdown narrative document report."""
    report_id: str
    dataset_overview: str
    data_quality_summary: str
    kpi_metrics_narrative: str
    strategic_recommendations_narrative: str
    markdown_content: str

class ExecutiveEmail(ExecutiveBaseObject):
    """Structured fields for corporate executive email updates."""
    subject: str
    body: str
    call_to_actions: List[str] = Field(default_factory=list)

class WeeklySummary(ExecutiveBaseObject):
    """Weekly digest brief."""
    text_content: str

class MonthlySummary(ExecutiveBaseObject):
    """Monthly performance brief."""
    text_content: str

class QuarterlySummary(ExecutiveBaseObject):
    """Quarterly performance brief."""
    text_content: str

class MeetingBrief(ExecutiveBaseObject):
    """Agenda topics and key decisions required card."""
    agenda_topics: List[str] = Field(default_factory=list)
    key_decisions_required: List[str] = Field(default_factory=list)

class CommunicationBundle(BaseModel):
    """Collection of channel updates (Email, Slack, MS Teams, briefs)."""
    email: ExecutiveEmail
    weekly_summary: WeeklySummary
    monthly_summary: MonthlySummary
    quarterly_summary: QuarterlySummary
    meeting_brief: MeetingBrief
    slack_summary: str
    teams_summary: str

class ExecutiveCommunicatorResult(BaseModel):
    """Aggregated executive communication result payload saved to memory."""
    dataset_id: str
    executive_summary: ExecutiveSummary
    audience_reports: List[AudienceReport] = Field(default_factory=list)
    dashboard_narrative: DashboardNarrative
    report: ExecutiveReport
    presentation: PresentationDeck
    communications: CommunicationBundle
    overall_validation_status: str = "valid"
    global_limitations: List[str] = Field(default_factory=list)
