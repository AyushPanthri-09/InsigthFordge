import time
import numpy as np
import pandas as pd
from typing import Dict, Any, List

from backend.services.analytics.validator import DatasetValidationEngine
from backend.services.analytics.cleaner import DatasetCleaningEngine
from backend.services.analytics.profiler import DatasetProfilingEngine
from backend.services.analytics.eda import DatasetEDAPerformer
from backend.services.analytics.statistics import StatisticalAnalysisEngine
from backend.services.analytics.anomaly import AnomalyDetectionEngine
from backend.services.analytics.root_cause import RootCauseAnalysisEngine
from backend.services.analytics.forecasting import ForecastingEngine
from backend.services.analytics.recommendations import RecommendationEngine
from backend.services.analytics.utils import sanitize_value

class ExecutiveReportEngine:
    """
    Orchestrates the entire offline analytical pipeline: Runs validation, cleaning,
    profiling, EDA, statistical checks, anomaly detection, root-cause, forecasting,
    and strategic recommendations.
    Outputs standard structures matching the FastAPI Response models.
    """

    @staticmethod
    def run_full_pipeline(df: pd.DataFrame, file_name: str, dataset_id: str) -> Dict[str, Any]:
        """
        Orchestrates full analytics run on the provided DataFrame.
        """
        start_time = time.time()
        
        # --- Run AI Orchestrator workflow engine ---
        from backend.services.orchestrator.orchestrator import AIOrchestrator
        orchestrator_result = AIOrchestrator.run(dataset_id=dataset_id, df=df)
        
        cleaned_df = orchestrator_result.dataframe
        val_report = orchestrator_result.validation_report
        cleaning_log = orchestrator_result.cleaning_log
        
        # If dataset becomes empty, fall back to original
        if cleaned_df.empty:
            cleaned_df = df.copy()

        analyst_result = orchestrator_result.analyst_result
        business_analyst_result = orchestrator_result.business_result
        strategy_result = orchestrator_result.strategy_result
        executive_result = orchestrator_result.executive_result

        # --- Run AI Platform Intelligence Supervisor ---
        from backend.services.platform_intelligence.supervisor import AIPlatformSupervisor
        platform_result = AIPlatformSupervisor.supervise(
            dataset_id=dataset_id,
            orchestrator_result=orchestrator_result
        )

        # --- Run AI Platform Operations ---
        from backend.services.platform_operations.operations import AIPlatformOperations
        operations_result = AIPlatformOperations.run(
            dataset_id=dataset_id,
            platform_result=platform_result
        )

        # --- 3. Profiling Phase ---
        profile_report = DatasetProfilingEngine.profile_dataset(cleaned_df)
        
        # Extract column role groupings
        columns_meta = profile_report.get("columns", [])
        numeric_cols = [c["name"] for c in columns_meta if c["type"] == "numeric_measure"]
        categorical_cols = [c["name"] for c in columns_meta if c["type"] == "categorical"]
        datetime_cols = [c["name"] for c in columns_meta if c["type"] == "temporal"]
        
        # --- 4. EDA Phase ---
        eda_report = DatasetEDAPerformer.generate_eda(cleaned_df, numeric_cols, categorical_cols, datetime_cols)
        
        # --- 5. Statistical Hypothesis Testing Phase ---
        # Dynamically compare numeric measures across top categories
        stats_results = []
        if numeric_cols and categorical_cols:
            comparison = StatisticalAnalysisEngine.compare_groups(cleaned_df, numeric_cols[0], categorical_cols[0])
            if "test" in comparison and "explanation" not in comparison:
                stats_results.append(comparison)

        # --- 6. Anomaly Detection Phase ---
        anomalies = AnomalyDetectionEngine.detect_anomalies(cleaned_df, numeric_cols, datetime_cols)
        
        # --- 7. Root Cause Analysis Phase ---
        root_causes = RootCauseAnalysisEngine.analyze_root_causes(cleaned_df, anomalies, numeric_cols, categorical_cols)
        
        # Incorporate root cause corrective actions into the anomaly records if matched
        for root_c in root_causes:
            a_id = root_c.get("anomalyId")
            for anom in anomalies:
                if anom["id"] == a_id:
                    anom["description"] += f" Root cause: {root_c['evidence']} {root_c['explanation']}"
                    anom["remedy"] = root_c["correctiveAction"]

        # --- 8. Forecasting Phase ---
        forecasts = ForecastingEngine.generate_forecasts(cleaned_df, datetime_cols, numeric_cols)
        
        # --- 9. Recommendations Phase ---
        recommendations = RecommendationEngine.generate_recommendations(val_report, anomalies, eda_report.get("correlations", []))
        
        # --- 10. Dynamic KPIs generation ---
        kpis = []
        # KPI 1: Record Count
        kpis.append({
            "id": "kpi_record_count",
            "label": "Total Records",
            "value": float(len(cleaned_df)),
            "formattedValue": f"{len(cleaned_df):,}",
            "rationale": "Total non-duplicate records parsed and validated."
        })
        
        # KPI 2: Quality Score
        issues_count = len(val_report.get("issues", []))
        quality_score = max(40, 100 - (issues_count * 5))
        kpis.append({
            "id": "kpi_quality_score",
            "label": "Data Quality Score",
            "value": float(quality_score),
            "formattedValue": f"{quality_score}%",
            "rationale": f"Determined by analyzing duplicate entries, null records, and format inconsistencies."
        })
        
        # KPI 3: Mean of Primary Measure
        if numeric_cols:
            primary_col = numeric_cols[0]
            avg_val = float(cleaned_df[primary_col].mean())
            kpis.append({
                "id": "kpi_measure_average",
                "label": f"Average {primary_col.replace('_', ' ').title()}",
                "value": avg_val,
                "formattedValue": f"{avg_val:,.2f}",
                "rationale": f"Mathematical mean of column '{primary_col}' across all clean records."
            })
            
        # KPI 4: Sum of Primary Measure
        if len(numeric_cols) > 0:
            primary_col = numeric_cols[0]
            sum_val = float(cleaned_df[primary_col].sum())
            kpis.append({
                "id": "kpi_measure_sum",
                "label": f"Sum of {primary_col.replace('_', ' ').title()}",
                "value": sum_val,
                "formattedValue": f"{sum_val:,.2f}",
                "rationale": f"Cumulative sum of column '{primary_col}' across all clean records."
            })

        # --- 11. Narrative Formulation ---
        # Situation
        situation = f"The dataset '{file_name}' contains {len(cleaned_df)} rows and {len(cleaned_df.columns)} columns."
        if profile_report.get("domain") != "generic":
            situation += f" It relates directly to {profile_report.get('domain')} operations."
            
        # Complication
        complication = ""
        critical_issues = [i for i in val_report.get("issues", []) if i["severity"] == "critical"]
        warning_issues = [i for i in val_report.get("issues", []) if i["severity"] == "warning"]
        if critical_issues:
            complication = "However, critical validation issues regarding duplicate or missing columns were resolved during ingest."
        elif warning_issues:
            complication = f"However, warning-level quality issues (such as missing values or duplicates) represent a minor risk."
        else:
            complication = "No major data validation warnings or schema corruptions were flagged."

        # Insight
        insight = "During exploration, "
        correlations = eda_report.get("correlations")
        if correlations and len(correlations) > 0:
            top_corr = correlations[0]
            insight += f"we discovered a {top_corr['strength']} relationship between '{top_corr['a']}' and '{top_corr['b']}' (r = {top_corr['r']:.2f})."
        elif numeric_cols:
            insight += f"we mapped distribution structures for '{numeric_cols[0]}' showing baseline values averaging {cleaned_df[numeric_cols[0]].mean():.2f}."
        else:
            insight += "we mapped dimensional features and baseline frequency tables."

        # Recommendation
        rec_action = recommendations[0]["action"] if recommendations else "Maintain continuous monitoring of key metrics."
        rec_impact = recommendations[0]["expectedImpact"] if recommendations else "Provides reliable reporting structures."
        
        # Build the final response dict matching AnalyzeResponse schema
        preview_df = cleaned_df.head(5).fillna("")
        preview = []
        for _, row in preview_df.iterrows():
            preview.append({str(k): sanitize_value(v) for k, v in row.items()})

        # Final quality issues translation
        quality_issues = []
        for issue in val_report.get("issues", []):
            quality_issues.append({
                "id": issue.get("id"),
                "column": issue.get("column"),
                "severity": issue.get("severity"),
                "description": issue.get("description"),
                "action": issue.get("action")
            })

        # Ensure profile columns have matching schema types
        columns_mapped = []
        for col_p in profile_report.get("columns", []):
            columns_mapped.append({
                "name": col_p["name"],
                "role": col_p["role"],
                "type": col_p["type"],
                "nullPct": col_p["nullPct"]
            })

        duration = time.time() - start_time
        print(f"Executed analytical pipeline in {duration:.3f}s")

        return {
            "dataset": {
                "datasetId": dataset_id,
                "fileName": file_name,
                "rowCount": len(cleaned_df),
                "columnCount": len(cleaned_df.columns),
                "columns": list(cleaned_df.columns),
                "preview": preview
            },
            "quality": {
                "qualityScore": quality_score,
                "issues": quality_issues,
                "recommendations": val_report.get("recommendations", [])
            },
            "profile": {
                "domain": profile_report.get("domain", "generic"),
                "domainConfidence": profile_report.get("domainConfidence", 0.5),
                "columns": columns_mapped
            },
            "kpis": kpis,
            "correlations": eda_report.get("correlations", []),
            "anomalies": anomalies,
            "forecast": forecasts,
            "recommendations": recommendations,
            "insights": eda_report.get("insights", []),
            "narrative": {
                "situation": situation,
                "complication": complication,
                "insight": insight,
                "recommendation": rec_action,
                "expectedOutcome": rec_impact
            }
        }
