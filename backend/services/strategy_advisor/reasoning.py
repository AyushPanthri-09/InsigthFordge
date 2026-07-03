import uuid
from typing import List, Dict
from backend.services.intelligence.contracts import ReasoningNode, Evidence
from backend.services.business_analyst.contracts import (
    BusinessReasoningEdge,
    BusinessReasoningGraph
)
from backend.services.strategy_advisor.contracts import StrategyAdvisorResult

class StrategyReasoningEngine:
    """
    Constructs the Strategic Reasoning Graph mapping Finding -> Recommendation -> Strategy -> Action -> Outcome.
    """

    @staticmethod
    def build_strategy_graph(
        result: StrategyAdvisorResult,
        dataset_id: str
    ) -> BusinessReasoningGraph:
        """
        Populates causal nodes and edges for the Strategic Decision Graph.
        """
        graph = BusinessReasoningGraph()
        
        # 1. Add nodes for Decisions (Strategy)
        for dec in result.decision_matrix.decisions:
            node_id = dec.decision_id
            graph.nodes[node_id] = ReasoningNode(
                id=node_id,
                label=f"Strategy: Rank {dec.execution_order}",
                node_type="Strategy",
                description=dec.business_reason,
                evidence=[
                    Evidence(
                        source="Decision Prioritization Matrix",
                        description=dec.business_reason,
                        confidence=dec.confidence_breakdown.overall_confidence,
                        supporting_columns=[],
                        supporting_statistics={"priority_score": dec.priority_score},
                        agent_name="AIStrategyAdvisor"
                    )
                ]
            )

        # 2. Add nodes for Action Plans
        for plan in result.action_plans:
            node_id = plan.action_id
            graph.nodes[node_id] = ReasoningNode(
                id=node_id,
                label=f"Action: {plan.milestone}",
                node_type="Action",
                description=plan.expected_outcome,
                evidence=[
                    Evidence(
                        source="Action Planner Engine",
                        description=plan.expected_outcome,
                        confidence=plan.confidence,
                        supporting_columns=[plan.target_kpi],
                        supporting_statistics={"priority": plan.priority},
                        agent_name="AIStrategyAdvisor"
                    )
                ]
            )

        # 3. Add nodes for Outcomes (Scenarios)
        for scen in result.scenarios:
            node_id = f"outcome_{scen.scenario_type}_{uuid.uuid4().hex[:6]}"
            graph.nodes[node_id] = ReasoningNode(
                id=node_id,
                label=f"Outcome: {scen.scenario_type}",
                node_type="ExpectedOutcome",
                description=scen.expected_benefits,
                evidence=[
                    Evidence(
                        source="Scenario Planner",
                        description=scen.expected_benefits,
                        confidence=scen.confidence,
                        supporting_columns=[],
                        supporting_statistics={},
                        agent_name="AIStrategyAdvisor"
                    )
                ]
            )

        # 4. Connect Decision -> Action -> ExpectedOutcome
        for dec in result.decision_matrix.decisions:
            for plan in result.action_plans:
                # Link priorities
                graph.edges.append(BusinessReasoningEdge(
                    source=dec.decision_id,
                    target=plan.action_id,
                    relationship_type="devolves_to",
                    supporting_evidence_ids=dec.evidence_ids,
                    confidence=dec.confidence_breakdown.overall_confidence
                ))

        for plan in result.action_plans:
            for scen in result.scenarios:
                # Link action to scenarios
                graph.edges.append(BusinessReasoningEdge(
                    source=plan.action_id,
                    target=f"outcome_{scen.scenario_type}", # wildcard prefix link
                    relationship_type="supports",
                    supporting_evidence_ids=plan.evidence_ids,
                    confidence=plan.confidence
                ))

        return graph
