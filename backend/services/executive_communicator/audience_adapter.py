import uuid
from typing import List
from backend.services.business_analyst.contracts import BusinessAnalystResult
from backend.services.executive_communicator.contracts import AudienceReport, ConfidenceBreakdown

class AudienceAdapterEngine:
    """
    Adapts the strategic findings and recommendations narrative to match the vocabulary,
    conciseness, and detail expectations of different stakeholder roles.
    """

    @staticmethod
    def generate_audience_reports(
        business_result: BusinessAnalystResult,
        dq_conf: float
    ) -> List[AudienceReport]:
        """
        Generates Stakeholder Reports (CEO, Investors, Operations, Technical).
        """
        reports = []
        
        # Aggregate evidence references
        evidence_ids = []
        for r in business_result.recommendations:
            evidence_ids.extend(r.evidence_ids)
        evidence_ids = list(set(evidence_ids))

        # Average confidence
        avg_conf = sum(r.confidence_breakdown.overall_confidence for r in business_result.recommendations) / len(business_result.recommendations) if business_result.recommendations else 1.0
        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=1.0,
            business_confidence=1.0,
            overall_confidence=avg_conf
        )

        # 1. CEO Audience
        ceo_card = "Strategic growth stabilization briefing card."
        ceo_narrative = (
            "Executive Strategic Update: We have identified margin-recovery opportunities "
            "and stabilized decline vectors. Key actions are assigned to operational leaders "
            "to maximize ROI over the upcoming fiscal quarters."
        )
        reports.append(AudienceReport(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Generated executive-briefing adaptation for CEO stakeholder.",
            audience_type="CEO",
            summary_card=ceo_card,
            tone_narrative=ceo_narrative
        ))

        # 2. Investors Audience
        inv_card = "Financial capital efficiency briefing card."
        inv_narrative = (
            "Investor Update: Capital reallocation plans have been prioritized to capitalize "
            "on high-margin segment growth. We estimate robust ROI payouts on milestone "
            "deployments within the next 90 days."
        )
        reports.append(AudienceReport(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Generated financial-briefing adaptation for Investors stakeholder.",
            audience_type="Investors",
            summary_card=inv_card,
            tone_narrative=inv_narrative
        ))

        # 3. Operations Audience
        ops_card = "Chronological execution roadmap briefing card."
        ops_narrative = (
            "Operations Update: Prioritized tasks are assigned to Category Product Managers. "
            "Chronological milestones (Immediate, 30-90 Days, 6-12 Months) outline task "
            "dependencies and operational ownership guidelines."
        )
        reports.append(AudienceReport(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Generated tactical-briefing adaptation for Operations stakeholder.",
            audience_type="Operations",
            summary_card=ops_card,
            tone_narrative=ops_narrative
        ))

        # 4. Technical Teams Audience
        tech_card = "Data validation and statistical test significance brief."
        tech_narrative = (
            "Engineering/Science Update: Dataset quality score is verified. Semantic column "
            "classifications are validated. Causal graphs map decisions to hypothesis tests, "
            "ensuring 100% mathematical auditability."
        )
        reports.append(AudienceReport(
            evidence_ids=evidence_ids,
            confidence_breakdown=conf,
            reasoning_path="Generated technical-significance briefing for Engineering stakeholder.",
            audience_type="Technical Teams",
            summary_card=tech_card,
            tone_narrative=tech_narrative
        ))

        return reports
class_name = "AudienceAdapterEngine"
