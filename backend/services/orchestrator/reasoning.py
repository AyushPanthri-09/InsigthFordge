import uuid
from backend.services.intelligence.contracts import ReasoningNode, Evidence
from backend.services.business_analyst.contracts import (
    BusinessReasoningEdge,
    BusinessReasoningGraph
)
from backend.services.orchestrator.contracts import WorkflowContext

class OrchestrationReasoningEngine:
    """
    Connects workflow engine executions to the global reasoning structure.
    """

    @staticmethod
    def build_orchestrator_graph(
        context: WorkflowContext
    ) -> BusinessReasoningGraph:
        """
        Populates ReasoningGraph nodes and edges for the orchestrator context.
        """
        graph = BusinessReasoningGraph()
        
        # 1. Add node for Workflow Execution
        node_id = f"orchestrator_{context.workflow_id}"
        graph.nodes[node_id] = ReasoningNode(
            id=node_id,
            label=f"Workflow: {context.workflow_id}",
            node_type="Workflow",
            description=f"DAG execution engine sequence for dataset {context.dataset_id}.",
            evidence=[
                Evidence(
                    source="AIOrchestrator",
                    description="Successfully orchestrated 6-phase analytical workflow.",
                    confidence=1.0,
                    supporting_columns=[],
                    supporting_statistics={"completed_stages_count": len(context.completed_stages)},
                    agent_name="AIOrchestrator"
                )
            ]
        )

        # 2. Add edges to stages
        for stage in context.completed_stages:
            stage_node_id = f"stage_{stage}_{uuid.uuid4().hex[:6]}"
            graph.nodes[stage_node_id] = ReasoningNode(
                id=stage_node_id,
                label=f"Stage: {stage}",
                node_type="Stage",
                description=f"Workflow executor stage completed successfully.",
                evidence=[]
            )
            
            graph.edges.append(BusinessReasoningEdge(
                source=node_id,
                target=stage_node_id,
                relationship_type="executed",
                supporting_evidence_ids=[],
                confidence=1.0
            ))

        return graph
