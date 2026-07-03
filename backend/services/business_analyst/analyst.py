import logging
import uuid
from typing import List, Dict, Any

from backend.services.data_engineer.contracts import TrustedDataset
from backend.services.data_analyst.contracts import AnalystResult, ConfidenceBreakdown
from backend.services.business_analyst.contracts import (
    BusinessAnalystResult,
    BusinessFinding
)
from backend.services.business_analyst.validation import BusinessAnalystValidator
from backend.services.business_analyst.root_cause import RootCauseAnalyzer
from backend.services.business_analyst.hypothesis_engine import HypothesisEngine
from backend.services.business_analyst.hypothesis_validation import HypothesisValidator
from backend.services.business_analyst.opportunity_engine import OpportunityDiscoveryEngine
from backend.services.business_analyst.risk_engine import RiskAssessmentEngine
from backend.services.business_analyst.recommendation_engine import RecommendationEngine
from backend.services.business_analyst.decision_prioritization import DecisionPrioritizationEngine
from backend.services.business_analyst.story_builder import ExecutiveStoryBuilder
from backend.services.business_analyst.reasoning import BusinessReasoningEngine
from backend.services.intelligence.memory import SharedProjectMemory

logger = logging.getLogger(__name__)

class AIBusinessAnalyst:
    """
    Main orchestrator for the AI Business Analyst Decision Intelligence Engine.
    """

    @staticmethod
    def analyze_business(
        dataset_id: str,
        trusted_dataset: TrustedDataset,
        analyst_result: AnalystResult
    ) -> BusinessAnalystResult:
        """
        Coordinates full decision-intelligence flow: root causes, hypotheses validation,
        opportunity discovery, risk assessment, executive stories, prioritization scoring,
        and causal graph population.
        """
        logger.info(f"[AIBusinessAnalyst] Initiating decision analysis for dataset ID: {dataset_id}")
        
        dq_conf = float(trusted_dataset.quality_report.quality_score.trust_score) / 100.0
        
        # 1. Extract Findings from trends/segments/anomalies
        findings = []
        for trend in analyst_result.trends:
            finding_id = f"find_trend_{trend.column}_{uuid.uuid4().hex[:6]}"
            impact = 100.0 if trend.direction == "growth" else -100.0
            
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=trend.confidence_breakdown.statistical_confidence,
                business_confidence=trend.confidence_breakdown.business_confidence,
                overall_confidence=dq_conf * 0.9 * trend.confidence_breakdown.statistical_confidence * trend.confidence_breakdown.business_confidence
            )

            findings.append(BusinessFinding(
                evidence_ids=trend.evidence_ids,
                confidence_breakdown=conf,
                reasoning_path=f"Extracted from temporal trend analysis on '{trend.column}'",
                finding_id=finding_id,
                metric_name=trend.column,
                finding_type="trend",
                description=f"Direction: {trend.direction}. {trend.explanation}",
                numerical_impact=impact
            ))

        for seg in analyst_result.segments:
            if abs(seg.comparison_to_average) > 0.15:
                finding_id = f"find_seg_{seg.segment_name}_{uuid.uuid4().hex[:6]}"
                
                conf = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.9,
                    statistical_confidence=seg.confidence_breakdown.statistical_confidence,
                    business_confidence=seg.confidence_breakdown.business_confidence,
                    overall_confidence=dq_conf * 0.9 * seg.confidence_breakdown.statistical_confidence * seg.confidence_breakdown.business_confidence
                )

                findings.append(BusinessFinding(
                    evidence_ids=seg.evidence_ids,
                    confidence_breakdown=conf,
                    reasoning_path=f"Extracted from performance variance segment slice for '{seg.dimension}'",
                    finding_id=finding_id,
                    metric_name=seg.dimension,
                    finding_type="segment",
                    description=f"Cohort '{seg.segment_name}' deviates from average benchmark by {seg.comparison_to_average:+.1%}.",
                    numerical_impact=seg.comparison_to_average
                ))

        # Default fallback finding if none exists
        if not findings:
            conf_fail = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=0.5,
                business_confidence=0.5,
                overall_confidence=dq_conf * 0.9 * 0.25
            )
            findings.append(BusinessFinding(
                evidence_ids=[],
                confidence_breakdown=conf_fail,
                reasoning_path="Generated baseline dataset discovery finding.",
                finding_id="find_baseline_health",
                metric_name="dataset_health",
                finding_type="trend",
                description="Dataset exhibits normal variance and stable metric limits.",
                numerical_impact=0.0
            ))

        # 2. Run Root Cause Analyzer (RCA Five Whys)
        root_causes = RootCauseAnalyzer.analyze_root_causes(analyst_result, dq_conf)

        # 3. Generate Competing Hypotheses
        hypotheses = HypothesisEngine.generate_hypotheses(analyst_result, dq_conf)

        # 4. Validate Hypotheses against statistical tests
        validated_hypotheses = HypothesisValidator.validate_hypotheses(hypotheses, analyst_result, dq_conf)

        # 5. Opportunity Discovery Engine
        opportunities = OpportunityDiscoveryEngine.discover_opportunities(analyst_result, dq_conf)

        # 6. Risk Assessment Engine
        risks = RiskAssessmentEngine.assess_risks(trusted_dataset, analyst_result, dq_conf)

        # 7. Recommendation Engine
        recommendations = RecommendationEngine.generate_recommendations(analyst_result, dq_conf)

        # 8. Prioritization Engine (Executive Priority Score 0-100)
        prioritized_recommendations = DecisionPrioritizationEngine.prioritize_recommendations(recommendations)

        # 9. Executive Story Builder (Executive narratives)
        narratives = ExecutiveStoryBuilder.build_narratives(recommendations)

        # Compile raw result
        raw_result = BusinessAnalystResult(
            dataset_id=dataset_id,
            findings=findings,
            root_causes=root_causes,
            hypotheses=validated_hypotheses,
            opportunities=opportunities,
            risks=risks,
            recommendations=recommendations,
            prioritized_recommendations=prioritized_recommendations,
            narratives=narratives
        )

        # 10. Run Validation Gates
        final_result = BusinessAnalystValidator.enforce_gates(raw_result)

        # 11. Build Business Reasoning Graph
        business_graph = BusinessReasoningEngine.build_business_graph(final_result, dataset_id)

        # 12. Cache all artifacts inside SharedProjectMemory
        mem = SharedProjectMemory()
        mem.set_metadata(dataset_id, "business_analyst_result", final_result)
        mem.set_metadata(dataset_id, "business_reasoning_graph", business_graph)
        
        logger.info(f"[AIBusinessAnalyst] Completed analysis for dataset ID: {dataset_id}. Status: {final_result.overall_validation_status}")
        
        return final_result
