import uuid
from backend.services.intelligence.contracts import ReasoningNode, Evidence
from backend.services.business_analyst.contracts import (
    BusinessReasoningEdge,
    BusinessReasoningGraph
)
from backend.services.platform_operations.contracts import PlatformOperationsResult

class OperationsReasoningEngine:
    """
    Connects deployment records and RBAC policies to the global Reasoning Graph.
    """

    @staticmethod
    def build_operations_graph(
        result: PlatformOperationsResult
    ) -> BusinessReasoningGraph:
        """
        Structures ReasoningGraph nodes and edges for the operations deliverables.
        """
        graph = BusinessReasoningGraph()
        
        # 1. Add Operations Node
        ops_node = f"operations_audit_{uuid.uuid4().hex[:6]}"
        graph.nodes[ops_node] = ReasoningNode(
            id=ops_node,
            label="Enterprise Operations Audit",
            node_type="EnterpriseOperations",
            description=f"Security policy verification completed. Deployment tag: {result.deployment_record.version}.",
            evidence=[
                Evidence(
                    source="Platform Security Manager",
                    description=result.security_policy.auth_policy,
                    confidence=1.0,
                    supporting_columns=[],
                    supporting_statistics={"score": result.benchmark_result.score},
                    agent_name="AIPlatformOperations"
                )
            ]
        )

        # 2. Add Deployment Node
        dep_node = f"deployment_target_{uuid.uuid4().hex[:6]}"
        graph.nodes[dep_node] = ReasoningNode(
            id=dep_node,
            label="Deployment Target",
            node_type="EnterpriseOperations",
            description=f"Environment target: {result.deployment_record.environment}.",
            evidence=[]
        )

        # Connect Ops -> Deployment
        graph.edges.append(BusinessReasoningEdge(
            source=ops_node,
            target=dep_node,
            relationship_type="deploys_to",
            supporting_evidence_ids=[],
            confidence=1.0
        ))

        return graph
