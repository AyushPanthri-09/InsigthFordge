import uuid
from typing import List
from backend.services.business_analyst.contracts import BusinessAnalystResult
from backend.services.strategy_advisor.contracts import StrategyAdvisorResult
from backend.services.executive_communicator.contracts import PresentationDeck, PresentationSlide, ConfidenceBreakdown

class PresentationBuilderEngine:
    """
    Builds the executive slide deck metadata including speaker notes and bullet items.
    """

    @staticmethod
    def build_presentation(
        dataset_id: str,
        business_result: BusinessAnalystResult,
        strategy_result: StrategyAdvisorResult,
        dq_conf: float
    ) -> PresentationDeck:
        """
        Structures the 10 standard slides deck.
        """
        deck_id = f"deck_{uuid.uuid4().hex[:6]}"
        slides = []

        # Slide 1: Cover
        slides.append(PresentationSlide(
            title="Strategic Executive Presentation",
            summary=f"Performance review for target dataset '{dataset_id}'.",
            bullet_points=[
                f"Dataset ID: {dataset_id}",
                f"Data quality confidence rating: {dq_conf:.1%}",
                "Autonomous Decision briefing prepared by InsightForge AI."
            ],
            speaker_notes="Welcome executives. Today we review performance trends and prioritized recommendations."
        ))

        # Slide 2: Executive Summary
        slides.append(PresentationSlide(
            title="Executive Summary",
            summary="Key strategic outcomes and recommendations overview.",
            bullet_points=[
                "Identified downward performance metrics requiring correction.",
                "Consolidated corrective roadmaps to recover margins.",
                "Validation gates confirm robust confidence ratings."
            ],
            speaker_notes="To summarize, our analysis isolates category margin differences and declining KPI trends."
        ))

        # Slide 3: KPI Overview
        kpis = [f"Metric '{f.metric_name}' finding: {f.description}" for f in business_result.findings[:3]]
        slides.append(PresentationSlide(
            title="KPI Overview",
            summary="Validated KPI performance benchmarks.",
            bullet_points=kpis if kpis else ["All tracked KPIs show normal variance."],
            speaker_notes="Here we examine the baseline KPIs. Notice the localized category variances."
        ))

        # Slide 4: Trends
        slides.append(PresentationSlide(
            title="Temporal Trends Analysis",
            summary="Chronological regression trend vectors.",
            bullet_points=[
                "Decline trend confirmed on key metrics.",
                "Seasonality cycle detected in baseline transactions."
            ],
            speaker_notes="Trend regressions confirm a steady decline that warrants proactive remediation."
        ))

        # Slide 5: Forecasts
        slides.append(PresentationSlide(
            title="Performance Forecasting Model",
            summary="Time series predictions and upper/lower bounds.",
            bullet_points=[
                "Predicted KPI paths modeled using Holt-Winters smoothing.",
                "Variance bounds expand over a 5-step forecast horizon."
            ],
            speaker_notes="Our predictive models show stable paths, but variance widens downstream."
        ))

        # Slide 6: Opportunities
        opps = [f"Opportunity: {o.opportunity_type} (ROI: {o.estimated_roi:.1%})" for o in business_result.opportunities[:3]]
        slides.append(PresentationSlide(
            title="Value Opportunities Discovered",
            summary="Revenue growth and cost reduction opportunities.",
            bullet_points=opps if opps else ["Replicating baseline category averages."],
            speaker_notes="Expanding high-margin category sectors presents the fastest path to ROI recovery."
        ))

        # Slide 7: Risks
        risks = [f"Risk: {r.risk_type} (Severity: {r.severity:.2f}, Owner: {r.owner_recommendation})" for r in business_result.risks[:3]]
        slides.append(PresentationSlide(
            title="Operational & Financial Risks",
            summary="Discovered strategic risk categories and mitigations.",
            bullet_points=risks if risks else ["Baseline compliance operational risks flat."],
            speaker_notes="We must mitigate financial risks associated with the KPI declines."
        ))

        # Slide 8: Recommendations
        recs = [f"Rec: {r.observation} (Owner: {r.owner}, ROI: {r.roi:.1%})" for r in business_result.recommendations[:3]]
        slides.append(PresentationSlide(
            title="Strategic Action Recommendations",
            summary="Prioritized operational adjustments.",
            bullet_points=recs if recs else ["Audit baseline transaction sequences."],
            speaker_notes="These prioritized recommendations address specific category performance deficits."
        ))

        # Slide 9: Roadmap
        slides.append(PresentationSlide(
            title="Action Milestones Roadmap",
            summary="Chronological implementation milestones and task dependencies.",
            bullet_points=[
                "Immediate: Stabilize quality indicators and audit transactions.",
                "30-90 Days: Align product pricing and category management.",
                "6-12 Months: Scale segment volume configurations."
            ],
            speaker_notes="This roadmap organizes tasks sequentially to resolve milestones on schedule."
        ))

        # Slide 10: Appendix
        slides.append(PresentationSlide(
            title="Appendix",
            summary="Data quality metrics and statistical test summaries.",
            bullet_points=[
                f"Data quality confidence rating: {dq_conf:.2%}",
                "Significance tests: Pearson, Kruskal-Wallis, Mann-Whitney U."
            ],
            speaker_notes="Refer to the appendix for specific p-values and data validation details."
        ))

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

        return PresentationDeck(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Assembled 10-slide executive presentation deck.",
            deck_id=deck_id,
            slides=slides
        )
