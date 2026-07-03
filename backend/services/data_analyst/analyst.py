import pandas as pd
import uuid
from typing import List, Dict, Any, Tuple

from backend.core.logger import logger
from backend.services.intelligence.reasoning_graph import ReasoningGraph
from backend.services.data_engineer.contracts import TrustedDataset

from backend.services.data_analyst.contracts import (
    AnalystResult,
    KPIResult,
    KPIDefinition,
    StatisticalResult,
    TrendResult,
    ForecastResult,
    SegmentResult,
    AnomalyResult,
    Insight,
    AnalystQuestion,
    ConfidenceBreakdown
)
from backend.services.data_analyst.validation import DataAnalystValidator
from backend.services.data_analyst.kpi_discovery import KPIDiscoveryEngine
from backend.services.data_analyst.adaptive_statistics import AdaptiveStatisticalSelector
from backend.services.data_analyst.statistical_engine import StatisticalAnalysisEngine
from backend.services.data_analyst.eda_engine import EDAEngine
from backend.services.data_analyst.trend_analysis import TrendAnalysisEngine
from backend.services.data_analyst.seasonality import SeasonalityDetector
from backend.services.data_analyst.segmentation import SegmentationEngine
from backend.services.data_analyst.anomaly_investigation import AnomalyInvestigator
from backend.services.data_analyst.forecasting import ForecastingEngine
from backend.services.data_analyst.insight_builder import InsightBuilder
from backend.services.data_analyst.reasoning import AnalystReasoningEngine

class AIDataAnalyst:
    """
    Autonomous Data Analyst reasoning engine performing dynamic statistical discovery,
    segmentation, forecasting, and evidence-backed insight synthesis.
    """

    @staticmethod
    def analyze_trusted_dataset(trusted_dataset: TrustedDataset, df: pd.DataFrame) -> AnalystResult:
        """
        Orchestrates full scientific validation and analytical pipeline on a trusted dataset.
        """
        dataset_id = trusted_dataset.dataset_id
        logger.info(f"[AIDataAnalyst] Commencing analysis for trusted dataset: {dataset_id}")
        
        # 1. Challenge Data Engineer & Propagate Confidence
        challenge_res = DataAnalystValidator.challenge_data_engineer(trusted_dataset)
        dq_conf = challenge_res["data_quality_confidence"]
        global_limits = challenge_res["global_limitations"]
        col_limits = challenge_res["column_limitations"]
        
        # 2. Extract column roles
        numeric_cols = []
        categorical_cols = []
        datetime_cols = []
        
        for col, meta in trusted_dataset.column_dictionary.items():
            col_type = meta["column_type"]
            role = meta["business_role"]
            if col_type in ["numeric", "currency"] or role == "measure":
                numeric_cols.append(col)
            elif col_type == "categorical" or role == "dimension":
                categorical_cols.append(col)
            elif col_type == "temporal":
                datetime_cols.append(col)

        # Fallbacks for empty column roles from metadata
        if not numeric_cols:
            numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])][:5]
        if not categorical_cols:
            categorical_cols = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])][:3]

        # 3. Discover and Calculate KPIs
        kpi_defs, kpi_res = KPIDiscoveryEngine.discover_and_compute_kpis(
            trusted_dataset=trusted_dataset,
            df=df,
            base_confidence=challenge_res
        )

        # 4. Adaptive Statistical Testing
        statistical_tests = []
        
        # Correlations (Continuous vs Continuous)
        if len(numeric_cols) >= 2:
            col_x = numeric_cols[0]
            col_y = numeric_cols[1]
            method, rationale = AdaptiveStatisticalSelector.select_correlation_method(df[col_x], df[col_y])
            stat_res = StatisticalAnalysisEngine.run_correlation(
                df[col_x], df[col_y], method, rationale, dq_conf
            )
            statistical_tests.append(stat_res)

        # Group Comparisons (Numerical vs Categorical)
        if numeric_cols and categorical_cols:
            num_col = numeric_cols[0]
            cat_col = categorical_cols[0]
            method, rationale = AdaptiveStatisticalSelector.select_group_comparison_method(
                df, num_col, cat_col
            )
            if method != "none":
                group_res = StatisticalAnalysisEngine.run_group_comparison(
                    df, num_col, cat_col, method, rationale, dq_conf
                )
                statistical_tests.append(group_res)

        # Chi-Square check (Categorical vs Categorical)
        if len(categorical_cols) >= 2:
            cat_x = categorical_cols[0]
            cat_y = categorical_cols[1]
            chisq_res = StatisticalAnalysisEngine.run_chi_square(df, cat_x, cat_y, dq_conf)
            statistical_tests.append(chisq_res)

        # 5. Run EDA Engine
        eda_report = EDAEngine.run_eda(df, numeric_cols, categorical_cols, datetime_cols)

        # 6. Trend and Seasonality Analysis
        trends = []
        forecasts = []
        
        date_col = datetime_cols[0] if datetime_cols else None
        if not date_col:
            # Fallback check
            for col in df.columns:
                if "date" in col.lower() or "time" in col.lower():
                    date_col = col
                    break
                    
        if date_col and numeric_cols:
            for num_col in numeric_cols[:2]: # analyze top 2 numeric columns
                # Calculate Trend
                trend = TrendAnalysisEngine.analyze_trend(df, num_col, date_col, dq_conf)
                
                # Check Seasonality
                season_detected, period, explanation = SeasonalityDetector.detect_seasonality(df, num_col, date_col)
                if season_detected:
                    trend.seasonality_detected = True
                    trend.seasonality_period = period
                    trend.explanation += f" Seasonality detected: {explanation}"
                trends.append(trend)

                # Generate Forecast
                forecast_res = ForecastingEngine.generate_forecast(df, num_col, date_col, dq_conf)
                forecasts.extend(forecast_res)

        # 7. Segmentation Analysis
        segments = []
        if numeric_cols and categorical_cols:
            for num_col in numeric_cols[:2]:
                for cat_col in categorical_cols[:2]:
                    seg_res = SegmentationEngine.analyze_segments(df, num_col, cat_col, dq_conf)
                    segments.extend(seg_res)

        # 8. Anomaly Investigation
        anomalies = AnomalyInvestigator.investigate_anomaly_events(df, numeric_cols, dq_conf)

        # 9. Insight Synthesis
        insights = InsightBuilder.synthesize_insights(
            statistical_results=statistical_tests,
            trend_results=trends,
            segment_results=segments,
            dq_conf=dq_conf
        )

        # 10. Analyst Questions for Phase 4 AI Business Analyst
        questions = []
        
        # Identify declining trends
        for trend in trends:
            if trend.direction == "decline":
                questions.append(AnalystQuestion(
                    evidence_ids=trend.evidence_ids,
                    confidence_breakdown=trend.confidence_breakdown,
                    reasoning_path=f"Declining trend vector discovered in column '{trend.column}'",
                    question_id=f"q_decline_{trend.column}",
                    question_text=f"Why has the performance of KPI '{trend.column}' been consistently declining over the historical timeline?",
                    target_metric=trend.column,
                    hypothesis_to_investigate="Declining temporal trend caused by structural changes or market drops.",
                    urgency="high"
                ))

        # Identify negative segments
        for seg in segments:
            if seg.comparison_to_average < -0.20:
                questions.append(AnalystQuestion(
                    evidence_ids=seg.evidence_ids,
                    confidence_breakdown=seg.confidence_breakdown,
                    reasoning_path=f"Significant negative cohort deviation found in segment '{seg.segment_name}'",
                    question_id=f"q_seg_fail_{seg.segment_name}",
                    question_text=f"What operational bottlenecks or customer behavior shifts explain why segment '{seg.segment_name}' in dimension '{seg.dimension}' underperforms the average by {abs(seg.comparison_to_average):.1%}?",
                    target_metric=seg.dimension,
                    hypothesis_to_investigate=f"Cohort '{seg.segment_name}' experiences specific localized performance deficits.",
                    urgency="medium"
                ))

        # Default fallback question if list is empty
        if not questions:
            questions.append(AnalystQuestion(
                evidence_ids=["ev_generic_question"],
                confidence_breakdown=ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.8,
                    statistical_confidence=0.5,
                    business_confidence=0.5,
                    overall_confidence=dq_conf * 0.8 * 0.25
                ),
                reasoning_path="Constructed standard baseline cohort question.",
                question_id="q_baseline_performers",
                question_text="How can we further optimize the highest-performing segments to sustain long-term business growth?",
                target_metric="overall_performance",
                hypothesis_to_investigate="Performance growth is driven by core outlier segments.",
                urgency="low"
            ))

        # Compile AnalystResult
        raw_result = AnalystResult(
            dataset_id=dataset_id,
            kpi_definitions=kpi_defs,
            kpis=kpi_res,
            statistical_tests=statistical_tests,
            trends=trends,
            forecasts=forecasts,
            segments=segments,
            anomalies=anomalies,
            insights=insights,
            questions=questions,
            global_limitations=global_limits
        )

        # 11. Run Final Validation Gates
        final_result = DataAnalystValidator.enforce_final_validation_gates(raw_result)

        # 12. Map results to explaining ReasoningGraph
        reasoning_graph = ReasoningGraph()
        AnalystReasoningEngine.map_results_to_graph(final_result, reasoning_graph)

        # Cache reasoning graph in Shared Project Memory for downstream agents
        from backend.services.intelligence.memory import SharedProjectMemory
        SharedProjectMemory().set_metadata(dataset_id, "reasoning_graph", reasoning_graph)

        logger.info(f"[AIDataAnalyst] Completed analysis successfully. Status: {final_result.overall_validation_status}")
        
        return final_result
