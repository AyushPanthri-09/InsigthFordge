import math
import pandas as pd
from typing import List, Dict, Any, Tuple
from backend.services.data_analyst.contracts import SegmentResult, ConfidenceBreakdown
from backend.services.data_analyst.utils import AnalystUtils

class SegmentationEngine:
    """
    Slices metrics by dimensions, performs cohort variance comparison,
    and identifies top/bottom performer segments.
    """

    @staticmethod
    def analyze_segments(
        df: pd.DataFrame,
        numerical_col: str,
        categorical_col: str,
        dq_conf: float
    ) -> List[SegmentResult]:
        """
        Slices the target numerical KPI across category groups and
        finds outstanding cohorts.
        """
        results = []
        ev_id = f"ev_segment_{numerical_col}_{categorical_col}"
        
        # Calculate overall mean
        overall_mean = float(df[numerical_col].mean())
        if pd.isna(overall_mean) or math.isclose(overall_mean, 0.0, rel_tol=1e-9, abs_tol=1e-12):
            return results

        # Group and calculate category statistics
        grouped = df.groupby(categorical_col)[numerical_col].agg(["mean", "count"]).dropna()
        
        for cat_name, stats_row in grouped.iterrows():
            cat_mean = float(stats_row["mean"])
            cat_count = int(stats_row["count"])
            
            # Skip extremely small segments for stability
            if cat_count < 3:
                continue

            comparison = float((cat_mean - overall_mean) / overall_mean)
            
            # Check if this category differs significantly (> 15% difference from mean)
            if abs(comparison) > 0.15:
                limits = []
                if cat_count < 10:
                    limits.append("sparse observations in segment")
                    
                # Confidence Breakdown
                conf = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.9,
                    statistical_confidence=0.85,
                    business_confidence=min(1.0, abs(comparison)),
                    overall_confidence=dq_conf * 0.9 * 0.85 * min(1.0, abs(comparison))
                )

                role_type = "Top performer" if comparison > 0 else "Bottom performer"
                insight_str = (
                    f"Segment '{cat_name}' is a {role_type.lower()}, averaging {cat_mean:.2f} "
                    f"({comparison:+.1%}) compared to the dataset mean of {overall_mean:.2f}."
                )

                results.append(SegmentResult(
                    evidence_ids=[ev_id],
                    confidence_breakdown=conf,
                    limitations=limits,
                    reasoning_path=f"Compared group mean of category '{cat_name}' against global mean for '{numerical_col}'",
                    dimension=categorical_col,
                    segment_name=str(cat_name),
                    performance_metric=cat_mean,
                    comparison_to_average=comparison,
                    insights=[insight_str]
                ))

        return results
