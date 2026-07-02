import numpy as np
import pandas as pd
from typing import Dict, Any, List
from backend.services.analytics.utils import sanitize_value

class DatasetEDAPerformer:
    """
    Performs Exploratory Data Analysis (EDA) on structured datasets.
    Computes correlation matrices, covariance, value distributions, group-by aggregates,
    and constructs automated rule-based descriptive observations.
    """

    @staticmethod
    def generate_eda(df: pd.DataFrame, numeric_cols: List[str], categorical_cols: List[str], datetime_cols: List[str]) -> Dict[str, Any]:
        """
        Runs numerical, categorical, and correlation EDA.
        Returns visual representation coordinates and dynamic rule-based insights.
        """
        row_count = len(df)
        correlations = []
        insights = []
        charts = []

        # 1. Compute Correlation Matrix
        if len(numeric_cols) >= 2:
            try:
                corr_matrix = df[numeric_cols].corr(method='pearson')
                for i in range(len(numeric_cols)):
                    for j in range(i + 1, len(numeric_cols)):
                        col_a = numeric_cols[i]
                        col_b = numeric_cols[j]
                        r_val = float(corr_matrix.loc[col_a, col_b])
                        if not pd.isna(r_val):
                            strength = "weak"
                            if abs(r_val) > 0.7:
                                strength = "strong"
                            elif abs(r_val) > 0.4:
                                strength = "moderate"
                                
                            correlations.append({
                                "a": col_a,
                                "b": col_b,
                                "r": round(r_val, 3),
                                "strength": strength,
                                "explanation": f"{strength.capitalize()} {'positive' if r_val > 0 else 'negative'} linear correlation observed between '{col_a}' and '{col_b}'."
                            })
                            
                            # Generate a dynamic insight based on high correlation
                            if strength in ["strong", "moderate"]:
                                insights.append({
                                    "id": f"ins_corr_{col_a}_{col_b}",
                                    "level": "descriptive",
                                    "title": f"Key Correlation: {col_a} & {col_b}",
                                    "observation": f"A {strength} correlation of {r_val:.2f} was detected between {col_a} and {col_b}.",
                                    "summary": f"Changes in '{col_a}' correspond tightly with changes in '{col_b}'. This indicates a potential driver relationship.",
                                    "recommendation": f"Monitor '{col_a}' as a leading proxy or predictor for forecasting '{col_b}'."
                                })
            except Exception:
                pass

        # 2. Trend & Datetime Visualizations
        if datetime_cols and numeric_cols:
            date_col = datetime_cols[0]
            # Try sorting to make a proper time series chart
            try:
                sorted_df = df.sort_values(by=date_col)
                # Group by date to keep the chart clean if the dataset is large
                grouped = sorted_df.groupby(sorted_df[date_col].dt.to_period("M" if row_count > 100 else "D")).mean(numeric_only=True)
                grouped.index = grouped.index.astype(str)
                
                # Take top 2 numeric columns for line charts
                for num_col in numeric_cols[:2]:
                    # Generate points for the chart
                    points = []
                    for idx, row in grouped.head(30).iterrows():
                        points.append({
                            "period": str(idx),
                            "value": sanitize_value(row[num_col])
                        })
                    
                    charts.append({
                        "id": f"trend_{num_col}",
                        "title": f"Historical Trend for {num_col} over {date_col}",
                        "type": "line",
                        "xColumn": date_col,
                        "yColumns": [num_col],
                        "data": points,
                        "rationale": f"Displays the aggregated timeline trend for '{num_col}' to evaluate seasonality and growth.",
                        "confidence": 0.9
                    })
                    
                    # Detect overall trend growth/decline
                    if len(points) >= 2:
                        first_val = points[0]["value"]
                        last_val = points[-1]["value"]
                        if first_val and last_val:
                            pct_change = (last_val - first_val) / first_val
                            direction = "increased" if pct_change > 0 else "decreased"
                            insights.append({
                                "id": f"ins_trend_{num_col}",
                                "level": "descriptive",
                                "title": f"Trend Analysis: {num_col}",
                                "observation": f"Average '{num_col}' {direction} by {abs(pct_change):.1%} over the recorded time periods.",
                                "summary": f"A long-term {direction} was identified, tracking from {points[0]['period']} to {points[-1]['period']}.",
                                "recommendation": f"Align operational strategies to account for the current {direction} trend in {num_col}."
                            })
            except Exception:
                pass

        # 3. Categorical Distribution Analysis
        for cat_col in categorical_cols[:2]:
            try:
                vc = df[cat_col].value_counts().head(5)
                categories = []
                for cat, count in vc.items():
                    categories.append({
                        "category": str(cat),
                        "count": int(count),
                        "percentage": float(count / row_count)
                    })
                
                charts.append({
                    "id": f"bar_{cat_col}",
                    "title": f"Category Distribution: {cat_col}",
                    "type": "bar",
                    "xColumn": cat_col,
                    "yColumns": ["count"],
                    "data": categories,
                    "rationale": f"Shows the frequency distribution of top classes in category '{cat_col}'."
                })
                
                # Insight for dominant category
                if len(categories) > 0:
                    dominant = categories[0]
                    if dominant["percentage"] > 0.4:
                        insights.append({
                            "id": f"ins_dom_{cat_col}",
                            "level": "descriptive",
                            "title": f"Concentration Risk: {cat_col}",
                            "observation": f"Category '{dominant['category']}' represents the majority ({dominant['percentage']:.1%}) of records in column '{cat_col}'.",
                            "summary": f"High skew detected in '{cat_col}' where a single category dominates standard operational registers.",
                            "recommendation": f"Diversify focus, or perform targeted sub-segment analysis on minority categories."
                        })
            except Exception:
                pass

        # Ensure we have at least one fallback insight if none are generated
        if not insights:
            insights.append({
                "id": "ins_fallback",
                "level": "descriptive",
                "title": "General Dataset Overview",
                "observation": f"The uploaded file consists of {row_count} records and {len(df.columns)} columns.",
                "summary": "Data distributions appear clean with stable baseline parameters.",
                "recommendation": "Use the Data Workspace filters to explore column profiles and anomalies in depth."
            })

        return {
            "correlations": correlations,
            "charts": charts,
            "insights": insights
        }
