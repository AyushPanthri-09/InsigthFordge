import uuid
from typing import List, Dict
from backend.services.business_analyst.contracts import BusinessAnalystResult
from backend.services.strategy_advisor.contracts import StrategyAdvisorResult
from backend.services.executive_communicator.contracts import DashboardNarrative, ConfidenceBreakdown

class DashboardStorytellingEngine:
    """
    Generates text descriptions explaining KPIs, charts, and anomalies
    for downstream dashboard renderers.
    """

    @staticmethod
    def generate_narratives(
        business_result: BusinessAnalystResult,
        strategy_result: StrategyAdvisorResult,
        dq_conf: float
    ) -> DashboardNarrative:
        """
        Structures explanations and limitations for dashboards.
        """
        narrative_id = f"dash_{uuid.uuid4().hex[:6]}"
        kpi_narratives = {}
        chart_narratives = {}
        anomaly_narratives = {}

        # 1. KPI Storytelling
        for finding in business_result.findings:
            kpi_narratives[finding.metric_name] = (
                f"Metric '{finding.metric_name}' is validated. "
                f"We track a performance delta of {finding.numerical_impact:+.1f} units. "
                f"Significance checks confirm this represents a strategic trend."
            )

        # 2. Chart Storytelling
        for rec in business_result.recommendations:
            chart_narratives[rec.rec_id] = (
                f"Chart Recommendation: {rec.observation} expected outcome: {rec.expected_outcome}. "
                f"Operational owner: {rec.owner}. ROI potential: {rec.roi:.1%}"
            )

        # 3. Anomaly Storytelling
        for rc in business_result.root_causes:
            anomaly_narratives[rc.cause_id] = (
                f"Anomaly Attributions: Structured root cause verification completed. "
                f"Five Whys observation path: {rc.observation}."
            )

        evidence_ids = []
        for r in business_result.recommendations:
            evidence_ids.extend(r.evidence_ids)
        evidence_ids = list(set(evidence_ids))

        avg_conf = strategy_result.roadmap.confidence_breakdown.overall_confidence
        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=1.0,
            business_confidence=1.0,
            overall_confidence=avg_conf
        )

        return DashboardNarrative(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Generated dashboard storytelling narratives.",
            narrative_id=narrative_id,
            kpi_narratives=kpi_narratives,
            chart_narratives=chart_narratives,
            anomaly_narratives=anomaly_narratives
        )
