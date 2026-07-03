import uuid
from backend.services.intelligence.contracts import ReasoningNode, Evidence
from backend.services.business_analyst.contracts import (
    BusinessReasoningEdge,
    BusinessReasoningGraph
)
from backend.services.platform_intelligence.contracts import PlatformIntelligenceResult

class SupervisorReasoningEngine:
    """
    Connects compliance audits and explainability features to the causal graph.
    """

    @staticmethod
    def build_supervisor_graph(
        result: PlatformIntelligenceResult
    ) -> BusinessReasoningGraph:
        """
        Structures ReasoningGraph nodes and edges for the supervisor deliverables.
        """
        graph = BusinessReasoningGraph()
        
        # 1. Add Governance Node
        gov_node = f"governance_audit_{uuid.uuid4().hex[:6]}"
        graph.nodes[gov_node] = ReasoningNode(
            id=gov_node,
            label="Governance Audit",
            node_type="GovernanceCheck",
            description=result.governance_report.bias_audit,
            evidence=[
                Evidence(
                    source="Platform Governance Engine",
                    description=result.governance_report.data_sovereignty,
                    confidence=result.governance_report.confidence_breakdown.overall_confidence,
                    supporting_columns=[],
                    supporting_statistics={"hash": result.governance_report.audit_trail_hash[:8]},
                    agent_name="AIPlatformSupervisor"
                )
            ]
        )

        # 2. Add Explainability Node
        exp_node = f"explainability_check_{uuid.uuid4().hex[:6]}"
        graph.nodes[exp_node] = ReasoningNode(
            id=exp_node,
            label="Explainability attributions",
            node_type="ExplainabilityMap",
            description=result.explainability_report.algorithm_details,
            evidence=[]
        )

        # Connect Gov -> Exp
        graph.edges.append(BusinessReasoningEdge(
            source=gov_node,
            target=exp_node,
            relationship_type="traces_to",
            supporting_evidence_ids=[],
            confidence=1.0
        ))

        return graph
