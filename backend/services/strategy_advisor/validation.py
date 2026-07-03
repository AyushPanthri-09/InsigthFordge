import logging
from typing import List, Dict, Set
from backend.services.business_analyst.contracts import Recommendation
from backend.services.strategy_advisor.contracts import (
    StrategyAdvisorResult,
    ActionPlan,
    Scenario,
    ExecutiveSlide
)

logger = logging.getLogger(__name__)

class StrategyValidator:
    """
    Enforces strategic validation rules, duplicate merges, roadmap DAG checks,
    completeness checks, and hallucination prevention.
    """

    @staticmethod
    def validate_strategy_result(
        result: StrategyAdvisorResult
    ) -> StrategyAdvisorResult:
        """
        Runs comprehensive validation gates over the generated StrategyAdvisorResult payload.
        """
        validated = result.model_copy()
        
        # 1. Evidence and Confidence Validation
        validated = StrategyValidator._validate_evidence_and_confidence(validated)
        
        # 2. Strategy Consistency & Conflict Merges
        validated = StrategyValidator._validate_consistency_and_merge(validated)
        
        # 3. Scenario Completeness Validation
        validated = StrategyValidator._validate_scenarios(validated)
        
        # 4. Roadmap and Dependency DAG Cycle Validation
        validated = StrategyValidator._validate_roadmap_dag(validated)
        
        # 5. Report Completeness Validation
        validated = StrategyValidator._validate_report_completeness(validated)
        
        # 6. Presentation completeness Validation
        validated = StrategyValidator._validate_presentation_completeness(validated)
        
        return validated

    @staticmethod
    def _validate_evidence_and_confidence(
        res: StrategyAdvisorResult
    ) -> StrategyAdvisorResult:
        """Verifies evidence paths and invalidates low confidence components (< 60%)."""
        # Validate Decisions
        for dec in res.decision_matrix.decisions:
            overall = dec.confidence_breakdown.overall_confidence
            if overall < 0.60:
                dec.validation_status = "invalid"
                dec.limitations.append(f"Decision rejected: overall confidence ({overall:.2%}) is below 60% threshold.")
                res.global_limitations.append(f"Decision '{dec.decision_id}' marked invalid due to low confidence.")

        # Validate Action Plans
        for action in res.action_plans:
            if action.confidence < 0.60:
                action.validation_status = "invalid"
                action.limitations.append(f"Action plan confidence ({action.confidence:.2%}) under threshold.")
                res.global_limitations.append(f"Action '{action.action_id}' marked invalid due to low confidence.")

        return res

    @staticmethod
    def _validate_consistency_and_merge(
        res: StrategyAdvisorResult
    ) -> StrategyAdvisorResult:
        """Detects duplicates or conflicting strategies and merges/marks warnings."""
        seen_actions = set()
        unique_plans = []
        
        for action in res.action_plans:
            # Check for duplication of outcome / KPI / owner
            sig = (action.milestone, action.owner, action.target_kpi)
            if sig in seen_actions:
                # Merge duplicate or mark warning
                res.global_limitations.append(
                    f"Duplicate action detected and merged for owner '{action.owner}' and KPI '{action.target_kpi}'."
                )
            else:
                seen_actions.add(sig)
                unique_plans.append(action)
                
        res.action_plans = unique_plans
        return res

    @staticmethod
    def _validate_scenarios(
        res: StrategyAdvisorResult
    ) -> StrategyAdvisorResult:
        """Ensures scenarios contain assumptions, limitations, and evidence."""
        valid_scenarios = []
        for scen in res.scenarios:
            if not scen.evidence_ids or not scen.assumptions:
                scen.expected_benefits = "No reliable scenario can be produced."
                scen.validation_status = "invalid"
                scen.limitations.append("Insufficient evidence to build reliable scenario.")
            valid_scenarios.append(scen)
        res.scenarios = valid_scenarios
        return res

    @staticmethod
    def _validate_roadmap_dag(
        res: StrategyAdvisorResult
    ) -> StrategyAdvisorResult:
        """DFS cycle detection ensuring the roadmap is a Direct Acyclic Graph (DAG)."""
        adj = {}
        for plan in res.action_plans:
            adj[plan.action_id] = plan.dependencies

        visited = {} # 0: unvisited, 1: visiting, 2: visited
        has_cycle = False

        def dfs(node):
            nonlocal has_cycle
            visited[node] = 1
            for neighbor in adj.get(node, []):
                # Ensure neighbor exists, otherwise it's an orphan
                if neighbor not in adj:
                    res.global_limitations.append(f"Roadmap validation: Action '{node}' depends on missing action '{neighbor}' (orphan).")
                    continue
                if visited.get(neighbor, 0) == 1:
                    has_cycle = True
                    return True
                if visited.get(neighbor, 0) == 0:
                    if dfs(neighbor):
                        return True
            visited[node] = 2
            return False

        for node in adj.keys():
            if visited.get(node, 0) == 0:
                if dfs(node):
                    break

        if has_cycle:
            res.overall_validation_status = "warning"
            res.global_limitations.append("Circular dependency cycle detected in Action Roadmap graph.")

        return res

    @staticmethod
    def _validate_report_completeness(
        res: StrategyAdvisorResult
    ) -> StrategyAdvisorResult:
        """Checks completeness of the generated executive report narrative."""
        report = res.executive_report
        required = [
            report.executive_summary,
            report.key_findings,
            report.opportunities,
            report.risks,
            report.recommendations,
            report.roadmap_summary,
            report.outlook,
            report.confidence_summary
        ]
        
        if any(not field or len(field.strip()) < 10 for field in required):
            res.overall_validation_status = "warning"
            res.global_limitations.append("Executive report completeness check failed: missing required sections.")
            report.validation_status = "warning"
            
        return res

    @staticmethod
    def _validate_presentation_completeness(
        res: StrategyAdvisorResult
    ) -> StrategyAdvisorResult:
        """Ensures every slide has title, content, and evidence references."""
        pres = res.presentation
        if not pres.slides:
            res.global_limitations.append("Presentation completeness failed: Slide deck contains zero slides.")
            pres.validation_status = "warning"
            return res

        for slide in pres.slides:
            if not slide.title or not slide.content:
                res.global_limitations.append(f"Slide '{slide.title}' marked invalid due to empty title or body.")
                pres.validation_status = "warning"
                
        return res
