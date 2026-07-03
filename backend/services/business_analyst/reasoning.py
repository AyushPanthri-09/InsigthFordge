import uuid
from datetime import datetime
from typing import List, Dict
from backend.services.intelligence.contracts import ReasoningNode, Evidence
from backend.services.business_analyst.contracts import (
    BusinessAnalystResult,
    BusinessReasoningEdge,
    BusinessReasoningGraph
)

class BusinessReasoningEngine:
    """
    Constructs the Business Reasoning Graph mapping strategic decision flows.
    """

    @staticmethod
    def build_business_graph(
        result: BusinessAnalystResult,
        dataset_id: str
    ) -> BusinessReasoningGraph:
        """
        Builds graph mapping Trend -> Finding -> Root Cause -> Hypothesis -> Opportunity -> Recommendation.
        """
        graph = BusinessReasoningGraph()
        
        # 1. Add nodes for Findings
        for f in result.findings:
            node_id = f.finding_id
            graph.nodes[node_id] = ReasoningNode(
                id=node_id,
                label=f"Finding: {f.metric_name}",
                node_type="Finding",
                description=f.description,
                evidence=[
                    Evidence(
                        source="AI Data Analyst",
                        description=f.description,
                        confidence=f.confidence_breakdown.overall_confidence,
                        supporting_columns=[f.metric_name],
                        supporting_statistics={"impact": f.numerical_impact},
                        agent_name="AIDataAnalyst"
                    )
                ]
            )

        # 2. Add nodes for Root Causes
        for rc in result.root_causes:
            node_id = rc.cause_id
            graph.nodes[node_id] = ReasoningNode(
                id=node_id,
                label="Root Cause",
                node_type="RootCause",
                description=rc.observation,
                evidence=[
                    Evidence(
                        source="Five Whys Framework",
                        description=rc.observation,
                        confidence=rc.confidence_breakdown.overall_confidence,
                        supporting_columns=[],
                        supporting_statistics={"impact_score": rc.impact_score},
                        agent_name="AIBusinessAnalyst"
                    )
                ]
            )

        # 3. Add nodes for Validated Hypotheses
        for hyp in result.hypotheses:
            node_id = hyp.hypothesis_id
            graph.nodes[node_id] = ReasoningNode(
                id=node_id,
                label="Hypothesis",
                node_type="Hypothesis",
                description=hyp.formulated_text,
                evidence=[
                    Evidence(
                        source="Statistical validation path",
                        description=hyp.formulated_text,
                        confidence=hyp.confidence_breakdown.overall_confidence,
                        supporting_columns=hyp.supporting_findings,
                        supporting_statistics={},
                        agent_name="AIBusinessAnalyst"
                    )
                ]
            )

        # 4. Add nodes for Opportunities
        for opp in result.opportunities:
            node_id = opp.opportunity_id
            graph.nodes[node_id] = ReasoningNode(
                id=node_id,
                label=f"Opportunity: {opp.opportunity_type}",
                node_type="Opportunity",
                description=f"Estimated ROI: {opp.estimated_roi:.1%}",
                evidence=[
                    Evidence(
                        source="Opportunity Engine",
                        description=f"Estimated ROI: {opp.estimated_roi:.1%}",
                        confidence=opp.confidence_breakdown.overall_confidence,
                        supporting_columns=[],
                        supporting_statistics={"business_value": opp.business_value, "roi": opp.estimated_roi},
                        agent_name="AIBusinessAnalyst"
                    )
                ]
            )

        # 5. Add nodes for Recommendations
        for rec in result.recommendations:
            node_id = rec.rec_id
            graph.nodes[node_id] = ReasoningNode(
                id=node_id,
                label=f"Recommendation: {rec.owner}",
                node_type="Recommendation",
                description=rec.expected_outcome,
                evidence=[
                    Evidence(
                        source="Recommendation Engine",
                        description=rec.business_reason,
                        confidence=rec.confidence_breakdown.overall_confidence,
                        supporting_columns=[],
                        supporting_statistics={"roi": rec.roi},
                        agent_name="AIBusinessAnalyst"
                    )
                ]
            )

        # 6. Build causal edges: Finding -> Root Cause -> Validated Hypothesis -> Opportunity -> Recommendation
        # Link findings to root causes
        for f in result.findings:
            for rc in result.root_causes:
                # Link if they share evidence reference or default
                graph.edges.append(BusinessReasoningEdge(
                    source=f.finding_id,
                    target=rc.cause_id,
                    relationship_type="causes",
                    supporting_evidence_ids=rc.evidence_ids,
                    confidence=rc.confidence_breakdown.overall_confidence
                ))

        # Link root causes to validated hypotheses
        for rc in result.root_causes:
            for hyp in result.hypotheses:
                graph.edges.append(BusinessReasoningEdge(
                    source=rc.cause_id,
                    target=hyp.hypothesis_id,
                    relationship_type="validates",
                    supporting_evidence_ids=hyp.evidence_ids,
                    confidence=hyp.confidence_breakdown.overall_confidence
                ))

        # Link validated hypotheses to opportunities
        for hyp in result.hypotheses:
            for opp in result.opportunities:
                graph.edges.append(BusinessReasoningEdge(
                    source=hyp.hypothesis_id,
                    target=opp.opportunity_id,
                    relationship_type="yields",
                    supporting_evidence_ids=opp.evidence_ids,
                    confidence=opp.confidence_breakdown.overall_confidence
                ))

        # Link opportunities to recommendations
        for opp in result.opportunities:
            for rec in result.recommendations:
                # Check for matching target columns or context
                graph.edges.append(BusinessReasoningEdge(
                    source=opp.opportunity_id,
                    target=rec.rec_id,
                    relationship_type="addresses",
                    supporting_evidence_ids=rec.evidence_ids,
                    confidence=rec.confidence_breakdown.overall_confidence
                ))

        return graph
