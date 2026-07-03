import uuid
from typing import List, Dict
from backend.services.intelligence.contracts import ReasoningNode, Evidence
from backend.services.business_analyst.contracts import (
    BusinessReasoningEdge,
    BusinessReasoningGraph
)
from backend.services.executive_communicator.contracts import ExecutiveCommunicatorResult

class CommunicationReasoningEngine:
    """
    Constructs the Communication Reasoning Graph mapping decision deliverables.
    """

    @staticmethod
    def build_communication_graph(
        result: ExecutiveCommunicatorResult,
        dataset_id: str
    ) -> BusinessReasoningGraph:
        """
        Populates causal nodes and edges mapping Strategy -> Communication -> Deliverable.
        """
        graph = BusinessReasoningGraph()
        
        # 1. Add nodes for Audience Reports (Tone adaptations)
        for report in result.audience_reports:
            node_id = f"comm_tone_{report.audience_type}_{uuid.uuid4().hex[:6]}"
            graph.nodes[node_id] = ReasoningNode(
                id=node_id,
                label=f"Tone: {report.audience_type}",
                node_type="Communication",
                description=report.tone_narrative,
                evidence=[
                    Evidence(
                        source="Audience Adapter Engine",
                        description=report.summary_card,
                        confidence=report.confidence_breakdown.overall_confidence,
                        supporting_columns=[],
                        supporting_statistics={},
                        agent_name="AIExecutiveCommunicator"
                    )
                ]
            )

        # 2. Add nodes for Executive Summary
        sum_id = result.executive_summary.summary_id
        graph.nodes[sum_id] = ReasoningNode(
            id=sum_id,
            label="Executive Summary",
            node_type="ExecutiveDeliverable",
            description=result.executive_summary.text_content,
            evidence=[
                Evidence(
                    source="Executive Summary Builder",
                    description=result.executive_summary.business_impact,
                    confidence=result.executive_summary.confidence_breakdown.overall_confidence,
                    supporting_columns=[],
                    supporting_statistics={},
                    agent_name="AIExecutiveCommunicator"
                )
            ]
        )

        # 3. Add node for presentation Cover slide
        deck_id = result.presentation.deck_id
        graph.nodes[deck_id] = ReasoningNode(
            id=deck_id,
            label="Presentation Deck Cover",
            node_type="ExecutiveDeliverable",
            description=result.presentation.slides[0].summary,
            evidence=[
                Evidence(
                    source="Presentation Builder Engine",
                    description=result.presentation.slides[0].title,
                    confidence=result.presentation.confidence_breakdown.overall_confidence,
                    supporting_columns=[],
                    supporting_statistics={},
                    agent_name="AIExecutiveCommunicator"
                )
            ]
        )

        # 4. Connect Tone -> ExecutiveSummary
        for report in result.audience_reports:
            node_id = f"comm_tone_{report.audience_type}"
            graph.edges.append(BusinessReasoningEdge(
                source=node_id,
                target=sum_id,
                relationship_type="supports",
                supporting_evidence_ids=report.evidence_ids,
                confidence=report.confidence_breakdown.overall_confidence
            ))
            
            # Connect Tone -> Presentation Cover
            graph.edges.append(BusinessReasoningEdge(
                source=node_id,
                target=deck_id,
                relationship_type="supports",
                supporting_evidence_ids=report.evidence_ids,
                confidence=report.confidence_breakdown.overall_confidence
            ))

        return graph
