import pytest
from backend.services.data_analyst.contracts import ConfidenceBreakdown
from backend.services.business_analyst.contracts import Recommendation
from backend.services.strategy_advisor import (
    StrategyValidator,
    StrategyAdvisorResult,
    DecisionMatrix,
    Decision,
    Scenario,
    WhatIfScenario,
    ActionPlan,
    Roadmap,
    ExecutiveReport,
    PresentationMetadata,
    ExecutiveSlide
)

@pytest.fixture
def base_confidence():
    return ConfidenceBreakdown(
        data_quality_confidence=1.0,
        semantic_confidence=0.9,
        statistical_confidence=0.8,
        business_confidence=0.8,
        overall_confidence=0.576 # 1.0 * 0.9 * 0.8 * 0.8 = 0.576
    )

def test_evidence_and_confidence_validation(base_confidence):
    # Overall confidence is 0.576 (below 60%), should trigger validation limitations/warnings
    dec = Decision(
        evidence_ids=[],
        confidence_breakdown=base_confidence,
        decision_id="dec_test",
        recommendation_id="rec_test",
        priority_score=50.0,
        priority_level="Medium",
        execution_order=1,
        business_reason="Reason"
    )
    
    action = ActionPlan(
        evidence_ids=[],
        confidence_breakdown=base_confidence,
        action_id="act_test",
        milestone="Immediate",
        owner="VP",
        expected_outcome="outcome",
        target_kpi="kpi",
        priority="High",
        effort="low",
        confidence=0.576 # below 0.60
    )

    res = StrategyAdvisorResult(
        dataset_id="test_ds",
        decision_matrix=DecisionMatrix(decisions=[dec]),
        scenarios=[],
        what_if_simulations=[],
        action_plans=[action],
        roadmap=Roadmap(roadmap_id="road_test", confidence_breakdown=base_confidence),
        executive_report=ExecutiveReport(report_id="rep_test", confidence_breakdown=base_confidence, executive_summary="Summary text...", key_findings="Findings text...", opportunities="Opps text...", risks="Risks text...", recommendations="Recs text...", roadmap_summary="Roadmap text...", outlook="Outlook text...", confidence_summary="Confidence text..."),
        presentation=PresentationMetadata(presentation_id="pres_test", confidence_breakdown=base_confidence, slides=[ExecutiveSlide(title="Title", content=["bullet"])]),
        global_limitations=[]
    )

    validated = StrategyValidator.validate_strategy_result(res)
    assert validated.decision_matrix.decisions[0].validation_status == "invalid"
    assert validated.action_plans[0].validation_status == "invalid"
    assert len(validated.global_limitations) > 0

def test_strategy_consistency_duplicate_merges(base_confidence):
    # Two actions with the same owner, KPI, and milestone
    action1 = ActionPlan(
        evidence_ids=[],
        confidence_breakdown=base_confidence,
        action_id="act_1",
        milestone="Immediate",
        owner="VP Sales",
        expected_outcome="Outcome 1",
        target_kpi="revenue_val",
        priority="High",
        effort="low",
        confidence=0.90
    )
    action2 = ActionPlan(
        evidence_ids=[],
        confidence_breakdown=base_confidence,
        action_id="act_2",
        milestone="Immediate",
        owner="VP Sales",
        expected_outcome="Outcome 2",
        target_kpi="revenue_val",
        priority="High",
        effort="low",
        confidence=0.90
    )

    res = StrategyAdvisorResult(
        dataset_id="test_ds",
        decision_matrix=DecisionMatrix(),
        scenarios=[],
        what_if_simulations=[],
        action_plans=[action1, action2],
        roadmap=Roadmap(roadmap_id="road_test", confidence_breakdown=base_confidence),
        executive_report=ExecutiveReport(report_id="rep_test", confidence_breakdown=base_confidence, executive_summary="Summary text...", key_findings="Findings text...", opportunities="Opps text...", risks="Risks text...", recommendations="Recs text...", roadmap_summary="Roadmap text...", outlook="Outlook text...", confidence_summary="Confidence text..."),
        presentation=PresentationMetadata(presentation_id="pres_test", confidence_breakdown=base_confidence, slides=[ExecutiveSlide(title="Title", content=["bullet"])]),
        global_limitations=[]
    )

    validated = StrategyValidator.validate_strategy_result(res)
    # Duplicate action should be merged/removed, leaving exactly 1
    assert len(validated.action_plans) == 1
    assert any("Duplicate action detected" in limit for limit in validated.global_limitations)

def test_circular_dependency_dag_validation(base_confidence):
    # Define circular dependency: act_1 -> act_2 -> act_1
    action1 = ActionPlan(
        evidence_ids=[],
        confidence_breakdown=base_confidence,
        action_id="act_1",
        milestone="Immediate",
        owner="VP",
        expected_outcome="outcome",
        target_kpi="kpi",
        priority="High",
        effort="low",
        confidence=0.90,
        dependencies=["act_2"]
    )
    action2 = ActionPlan(
        evidence_ids=[],
        confidence_breakdown=base_confidence,
        action_id="act_2",
        milestone="30 Days",
        owner="VP",
        expected_outcome="outcome",
        target_kpi="kpi",
        priority="High",
        effort="low",
        confidence=0.90,
        dependencies=["act_1"]
    )

    res = StrategyAdvisorResult(
        dataset_id="test_ds",
        decision_matrix=DecisionMatrix(),
        scenarios=[],
        what_if_simulations=[],
        action_plans=[action1, action2],
        roadmap=Roadmap(roadmap_id="road_test", confidence_breakdown=base_confidence),
        executive_report=ExecutiveReport(report_id="rep_test", confidence_breakdown=base_confidence, executive_summary="Summary text...", key_findings="Findings text...", opportunities="Opps text...", risks="Risks text...", recommendations="Recs text...", roadmap_summary="Roadmap text...", outlook="Outlook text...", confidence_summary="Confidence text..."),
        presentation=PresentationMetadata(presentation_id="pres_test", confidence_breakdown=base_confidence, slides=[ExecutiveSlide(title="Title", content=["bullet"])]),
        global_limitations=[]
    )

    validated = StrategyValidator.validate_strategy_result(res)
    assert validated.overall_validation_status == "warning"
    assert any("Circular dependency cycle" in limit for limit in validated.global_limitations)

def test_scenario_evidence_check(base_confidence):
    # Scenario without evidence_ids or assumptions
    scen = Scenario(
        evidence_ids=[], # empty -> should invalidate
        confidence_breakdown=base_confidence,
        scenario_type="Balanced",
        expected_benefits="Benefits",
        expected_risks="Risks",
        confidence=0.80,
        required_effort="medium",
        timeline="90 days",
        assumptions=[] # empty -> should invalidate
    )

    res = StrategyAdvisorResult(
        dataset_id="test_ds",
        decision_matrix=DecisionMatrix(),
        scenarios=[scen],
        what_if_simulations=[],
        action_plans=[],
        roadmap=Roadmap(roadmap_id="road_test", confidence_breakdown=base_confidence),
        executive_report=ExecutiveReport(report_id="rep_test", confidence_breakdown=base_confidence, executive_summary="Summary text...", key_findings="Findings text...", opportunities="Opps text...", risks="Risks text...", recommendations="Recs text...", roadmap_summary="Roadmap text...", outlook="Outlook text...", confidence_summary="Confidence text..."),
        presentation=PresentationMetadata(presentation_id="pres_test", confidence_breakdown=base_confidence, slides=[ExecutiveSlide(title="Title", content=["bullet"])]),
        global_limitations=[]
    )

    validated = StrategyValidator.validate_strategy_result(res)
    assert validated.scenarios[0].validation_status == "invalid"
    assert validated.scenarios[0].expected_benefits == "No reliable scenario can be produced."

def test_report_and_presentation_completeness(base_confidence):
    # Empty slide and missing report fields
    report = ExecutiveReport(
        evidence_ids=[],
        confidence_breakdown=base_confidence,
        report_id="rep_test",
        executive_summary="", # missing
        key_findings="Findings",
        opportunities="Opps",
        risks="Risks",
        recommendations="Recs",
        roadmap_summary="Roadmap",
        outlook="Outlook",
        confidence_summary="Confidence"
    )
    
    slide = ExecutiveSlide(
        title="Slide Title",
        content=[] # missing content -> should warn
    )

    res = StrategyAdvisorResult(
        dataset_id="test_ds",
        decision_matrix=DecisionMatrix(),
        scenarios=[],
        what_if_simulations=[],
        action_plans=[],
        roadmap=Roadmap(roadmap_id="road_test", confidence_breakdown=base_confidence),
        executive_report=report,
        presentation=PresentationMetadata(presentation_id="pres_test", confidence_breakdown=base_confidence, slides=[slide]),
        global_limitations=[]
    )

    validated = StrategyValidator.validate_strategy_result(res)
    assert validated.overall_validation_status == "warning"
    assert any("report completeness check failed" in limit.lower() for limit in validated.global_limitations)
    assert any("slide" in limit.lower() and "marked invalid" in limit.lower() for limit in validated.global_limitations)
