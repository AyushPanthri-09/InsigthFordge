import pandas as pd
import numpy as np
from typing import Dict, Any, List
from backend.services.data_analyst.utils import AnalystUtils

class EDAEngine:
    """
    Computes distribution properties, cross-tabulations, missingness,
    correlations, and performers on a cleaned DataFrame.
    """

    @staticmethod
    def run_eda(
        df: pd.DataFrame,
        numeric_cols: List[str],
        categorical_cols: List[str],
        datetime_cols: List[str]
    ) -> Dict[str, Any]:
        """Runs descriptive analytics and computes correlation/covariance matrices."""
        eda_report = {}
        
        # 1. Distribution Summaries
        dist_summaries = {}
        for col in numeric_cols:
            series = df[col].dropna()
            if not series.empty:
                dist_summaries[col] = {
                    "mean": float(series.mean()),
                    "median": float(series.median()),
                    "min": float(series.min()),
                    "max": float(series.max()),
                    "std": float(series.std()),
                    "skewness": float(series.skew()),
                    "kurtosis": float(series.kurt())
                }
        eda_report["distributions"] = AnalystUtils.sanitize_dict_or_list(dist_summaries)

        # 2. Missingness Summaries
        missing_summary = {}
        row_count = len(df)
        for col in df.columns:
            null_count = int(df[col].isnull().sum())
            missing_summary[col] = {
                "null_count": null_count,
                "null_pct": float(null_count / row_count) if row_count > 0 else 0.0
            }
        eda_report["missingness"] = AnalystUtils.sanitize_dict_or_list(missing_summary)

        # 3. Frequency Tables
        freq_tables = {}
        for col in categorical_cols:
            counts = df[col].value_counts().head(10)
            freq_tables[col] = {str(k): int(v) for k, v in counts.items()}
        eda_report["frequencies"] = AnalystUtils.sanitize_dict_or_list(freq_tables)

        # 4. Correlation and Covariance Matrices
        if len(numeric_cols) >= 2:
            clean_num = df[numeric_cols].dropna()
            if not clean_num.empty:
                corr_matrix = clean_num.corr().to_dict()
                cov_matrix = clean_num.cov().to_dict()
                eda_report["correlation_matrix"] = AnalystUtils.sanitize_dict_or_list(corr_matrix)
                eda_report["covariance_matrix"] = AnalystUtils.sanitize_dict_or_list(cov_matrix)
            else:
                eda_report["correlation_matrix"] = {}
                eda_report["covariance_matrix"] = {}
        else:
            eda_report["correlation_matrix"] = {}
            eda_report["covariance_matrix"] = {}

        # 5. Top and Bottom Performers per Category
        performers = {}
        if numeric_cols and categorical_cols:
            num_col = numeric_cols[0]
            cat_col = categorical_cols[0]
            grouped = df.groupby(cat_col)[num_col].mean().dropna().sort_values()
            if not grouped.empty:
                performers[f"{num_col}_by_{cat_col}"] = {
                    "top_performers": {str(k): float(v) for k, v in grouped.tail(3).items()},
                    "bottom_performers": {str(k): float(v) for k, v in grouped.head(3).items()}
                }
        eda_report["performers"] = AnalystUtils.sanitize_dict_or_list(performers)

        # 6. Cross-tabulations
        crosstabs = {}
        if len(categorical_cols) >= 2:
            cat1 = categorical_cols[0]
            cat2 = categorical_cols[1]
            crosstabs[f"{cat1}_vs_{cat2}"] = pd.crosstab(df[cat1], df[cat2]).head(10).to_dict()
        eda_report["crosstabs"] = AnalystUtils.sanitize_dict_or_list(crosstabs)

        # 7. Auto-generated observations
        observations = []
        for col, stats in dist_summaries.items():
            if abs(stats["skewness"]) > 1.0:
                direction = "right-skewed" if stats["skewness"] > 0 else "left-skewed"
                observations.append(f"Column '{col}' exhibits a high positive/negative skew ({stats['skewness']:.2f}), suggesting a {direction} distribution.")
            if stats["std"] > stats["mean"] and stats["mean"] > 0:
                observations.append(f"Column '{col}' displays high relative volatility, with standard deviation ({stats['std']:.2f}) exceeding its average value ({stats['mean']:.2f}).")
                
        eda_report["observations"] = observations

        return eda_report
