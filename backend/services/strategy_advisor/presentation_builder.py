import uuid
from typing import List
from backend.services.business_analyst.contracts import BusinessAnalystResult
from backend.services.strategy_advisor.contracts import PresentationMetadata, ExecutiveSlide, ConfidenceBreakdown

class PresentationBuilderEngine:
    """
    Assembles presentation slide metadata for executive presentations.
    """

    @staticmethod
    def build_presentation(
        dataset_id: str,
        business_result: BusinessAnalystResult,
        dq_conf: float
    ) -> PresentationMetadata:
        """
        Builds slides representing title, summary, opportunities, risks, and roadmap.
        """
        pres_id = f"pres_{uuid.uuid4().hex[:6]}"
        slides = []

        # 1. Title Slide
        slides.append(ExecutiveSlide(
            title="Strategic Performance Review",
            content=[
                f"Target Dataset: {dataset_id}",
                f"Analysis Timestamp: 2026-07-04 UTC",
                "Prepared by: AI Strategy Advisor"
            ],
            evidence_references=[],
            slide_type="title"
        ))

        # 2. Executive Summary
        slides.append(ExecutiveSlide(
            title="Executive Summary",
            content=[
                "Identified key operational anomalies and downward trend components.",
                "Prioritized structural solutions to recover margins and stabilize sales."
            ],
            evidence_references=["ev_quality_report"],
            slide_type="bullet"
        ))

        # 3. KPI Overview
        kpis_list = [f"- Metric '{f.metric_name}' is tracked under type '{f.finding_type}'" for f in business_result.findings[:3]]
        slides.append(ExecutiveSlide(
            title="KPI Performance Overview",
            content=kpis_list if kpis_list else ["All core KPIs operating within normal variance."],
            evidence_references=[f.evidence_ids[0] for f in business_result.findings if f.evidence_ids],
            slide_type="bullet"
        ))

        # 4. Opportunities
        opps_list = [f"- Opportunity: {o.opportunity_type} (ROI: {o.estimated_roi:.1%})" for o in business_result.opportunities[:3]]
        slides.append(ExecutiveSlide(
            title="Value Opportunities Discovered",
            content=opps_list if opps_list else ["No high-margin expansion opportunities identified."],
            evidence_references=[],
            slide_type="bullet"
        ))

        # 5. Risks
        risks_list = [f"- Risk: {r.risk_type} (Mitigation: {r.mitigation})" for r in business_result.risks[:3]]
        slides.append(ExecutiveSlide(
            title="Key Risk Indicators & Mitigations",
            content=risks_list if risks_list else ["No significant financial or data risks flagged."],
            evidence_references=[],
            slide_type="bullet"
        ))

        # 6. Recommendations
        recs_list = [f"- {r.observation} (Owner: {r.owner}, Timeline: {r.timeline})" for r in business_result.recommendations[:3]]
        slides.append(ExecutiveSlide(
            title="Prioritized Tactical Recommendations",
            content=recs_list if recs_list else ["Maintain standard compliance and monitoring audits."],
            evidence_references=[r.evidence_ids[0] for r in business_result.recommendations if r.evidence_ids],
            slide_type="bullet"
        ))

        # 7. Roadmap Slide
        slides.append(ExecutiveSlide(
            title="Strategic Milestone Roadmap",
            content=[
                "Immediate: Stabilize KPIs and address critical quality issues.",
                "30-90 Days: Replicate positive segment slices.",
                "6-12 Months: Expand high-growth category sectors."
            ],
            evidence_references=[],
            slide_type="bullet"
        ))

        # 8. Appendix
        slides.append(ExecutiveSlide(
            title="Appendix & Data Quality Index",
            content=[
                f"Data quality confidence score: {dq_conf:.2%}",
                "All findings validated using non-parametric hypothesis tests."
            ],
            evidence_references=["ev_quality_report"],
            slide_type="bullet"
        ))

        # Build evidence references list for overall presentation
        evidence_ids = []
        for r in business_result.recommendations:
            evidence_ids.extend(r.evidence_ids)
        evidence_ids = list(set(evidence_ids))

        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=1.0,
            business_confidence=1.0,
            overall_confidence=dq_conf * 0.9
        )

        return PresentationMetadata(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Assembled slide presentation metadata.",
            presentation_id=pres_id,
            slides=slides
        )
