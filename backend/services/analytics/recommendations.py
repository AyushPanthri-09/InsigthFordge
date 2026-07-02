import pandas as pd
from typing import List, Dict, Any

class RecommendationEngine:
    """
    Generates strategic recommendations based on validation reports, anomaly logs,
    and discovered correlations.
    """

    @staticmethod
    def generate_recommendations(validation_report: Dict[str, Any], anomalies: List[Dict[str, Any]], correlations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Synthesizes strategic recommendations mapping to standard priority / effort profiles.
        """
        recommendations = []
        rec_id_counter = 1

        # 1. Recommendations from Validation Issues
        for issue in validation_report.get("issues", []):
            issue_id = issue.get("id", "")
            column = issue.get("column")
            
            if "duplicate_rows" in issue_id:
                recommendations.append({
                    "id": f"rec_val_{rec_id_counter}",
                    "action": "Deduplicate system registers",
                    "expectedImpact": "Reduces data redundancy, corrects inflated averages, and improves downstream model accuracy.",
                    "effort": "low",
                    "priority": "high",
                    "riskOfInaction": "Strategic metrics (like revenue sums) will remain artificially inflated, misinforming business planning."
                })
                rec_id_counter += 1
            elif "excessive_nulls" in issue_id and column:
                recommendations.append({
                    "id": f"rec_val_{rec_id_counter}",
                    "action": f"Review input logging for '{column}'",
                    "expectedImpact": f"Improves dataset completeness for '{column}' which currently exhibits high missingness.",
                    "effort": "medium",
                    "priority": "medium",
                    "riskOfInaction": "Calculations relying on this column will drop records, skewing analytics results."
                })
                rec_id_counter += 1
            elif "mixed_types" in issue_id and column:
                recommendations.append({
                    "id": f"rec_val_{rec_id_counter}",
                    "action": f"Standardize type castings on '{column}'",
                    "expectedImpact": "Prevents type exceptions and ensures parsing scripts behave uniformly.",
                    "effort": "low",
                    "priority": "high",
                    "riskOfInaction": "Downstream databases will reject messy registers, causing upload failures."
                })
                rec_id_counter += 1

        # 2. Recommendations from Anomalies
        for anomaly in anomalies:
            col = anomaly.get("column")
            a_type = anomaly.get("type")
            
            if a_type == "univariate_outlier" and col:
                recommendations.append({
                    "id": f"rec_anom_{rec_id_counter}",
                    "action": f"Audit outliers in '{col}'",
                    "expectedImpact": "Flags operational errors or system disruptions that lead to extreme metrics values.",
                    "effort": "medium",
                    "priority": "high",
                    "riskOfInaction": "Outliers skew statistical baseline averages, weakening forecast reliability."
                })
                rec_id_counter += 1
            elif a_type == "multivariate_anomaly":
                recommendations.append({
                    "id": f"rec_anom_{rec_id_counter}",
                    "action": "Conduct multivariate audit on anomalous records",
                    "expectedImpact": "Isolates fraudulent profiles or telemetry glitches that do not fit general population parameters.",
                    "effort": "high",
                    "priority": "high",
                    "riskOfInaction": "Systemic anomalies can propagate undetected, masking network, transaction, or supply leaks."
                })
                rec_id_counter += 1

        # 3. Recommendations from Correlations
        for corr in correlations[:2]:
            col_a = corr.get("a")
            col_b = corr.get("b")
            r = corr.get("r", 0.0)
            
            if abs(r) > 0.7:
                recommendations.append({
                    "id": f"rec_corr_{rec_id_counter}",
                    "action": f"Leverage '{col_a}' as a proxy driver for '{col_b}'",
                    "expectedImpact": f"A strong correlation of {r:.2f} allows predicting changes in '{col_b}' using '{col_a}' as a leading indicator.",
                    "effort": "low",
                    "priority": "medium",
                    "riskOfInaction": "Operations will miss predictive signals, failing to adapt capacity to demand shifts."
                })
                rec_id_counter += 1

        # Fallback Recommendation
        if not recommendations:
            recommendations.append({
                "id": "rec_fallback",
                "action": "Implement automated dataset check schedules",
                "expectedImpact": "Ensures data schema formats are kept clean and verified continuously.",
                "effort": "low",
                "priority": "low",
                "riskOfInaction": "Silent data corruption or format changes could occur undetected."
            })

        return recommendations
