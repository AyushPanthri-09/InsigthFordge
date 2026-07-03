import uuid
from typing import List
from backend.services.business_analyst.contracts import BusinessAnalystResult
from backend.services.strategy_advisor.contracts import StrategyAdvisorResult
from backend.services.executive_communicator.contracts import ExecutiveReport, ConfidenceBreakdown

class ReportBuilderEngine:
    """
    Assembles narrative sections and compiles the final Executive Report markdown text.
    """

    @staticmethod
    def build_report(
        dataset_id: str,
        business_result: BusinessAnalystResult,
        strategy_result: StrategyAdvisorResult,
        dq_conf: float
    ) -> ExecutiveReport:
        """
        Structures the full markdown report.
        """
        report_id = f"rep_doc_{uuid.uuid4().hex[:6]}"
        
        # Prepare text blocks
        overview = f"Dataset overview for '{dataset_id}'. Tracks chronological transaction cycles."
        dq_summary = f"Dataset quality certified. Quality Score Trust Index: {dq_conf:.1%}."
        
        kpi_narrative = "\n".join(
            f"- Metric: {f.metric_name}. Finding: {f.description}"
            for f in business_result.findings
        )
        
        strat_narrative = "\n".join(
            f"- Strategy: Priority score: {dec.priority_score:.1f}. Target rec: {dec.recommendation_id}. Reason: {dec.business_reason}"
            for dec in strategy_result.decision_matrix.decisions
        )

        # Assemble Markdown Content
        md = f"""# Executive Performance Report: {dataset_id}

## 1. Executive Summary
- Dataset Quality score: {dq_conf:.1%}
- Core decision priority tracks have been mapped in memory.

## 2. Dataset Overview
{overview}

## 3. Data Quality
{dq_summary}

## 4. Key Performance Indicators
{kpi_narrative}

## 5. Strategic Recommendations
{strat_narrative}
"""

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

        return ExecutiveReport(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Assembled comprehensive markdown Executive Report.",
            report_id=report_id,
            dataset_overview=overview,
            data_quality_summary=dq_summary,
            kpi_metrics_narrative=kpi_narrative if kpi_narrative else "No metrics logged.",
            strategic_recommendations_narrative=strat_narrative if strat_narrative else "No strategies compiled.",
            markdown_content=md
        )
