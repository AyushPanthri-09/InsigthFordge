import pandas as pd
import numpy as np
from scipy import stats
from typing import List, Dict, Any, Tuple
from backend.services.data_analyst.contracts import TrendResult, ConfidenceBreakdown
from backend.services.data_analyst.utils import AnalystUtils

class TrendAnalysisEngine:
    """
    Analyzes temporal data sequences to identify linear trends, growth,
    declines, and structural breaks (change points).
    """

    @staticmethod
    def analyze_trend(
        df: pd.DataFrame,
        numerical_col: str,
        date_col: str,
        dq_conf: float
    ) -> TrendResult:
        """
        Fits rolling regressions to find overall trend direction and locates
        change points where the mean structure shifts.
        """
        ev_id = f"ev_trend_{numerical_col}_{date_col}"
        
        # Sort and clean
        df_temp = df[[date_col, numerical_col]].dropna().copy()
        df_temp[date_col] = pd.to_datetime(df_temp[date_col])
        df_temp = df_temp.sort_values(date_col)
        n = len(df_temp)
        
        limits = []
        if n < 10:
            limits.append("small sample size")
            conf_fail = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.8,
                statistical_confidence=0.0,
                business_confidence=0.0,
                overall_confidence=0.0
            )
            return TrendResult(
                evidence_ids=[ev_id],
                confidence_breakdown=conf_fail,
                validation_status="warning",
                limitations=limits + ["insufficient history"],
                reasoning_path="Aborted trend analysis; less than 10 history points.",
                column=numerical_col,
                direction="stable",
                change_points=[],
                seasonality_detected=False,
                explanation="Trend could not be calculated due to insufficient date occurrences."
            )

        # Fit a simple linear line over index
        x = np.arange(n)
        y = df_temp[numerical_col].values
        
        slope, intercept, r_val, p_val, std_err = stats.linregress(x, y)
        slope = AnalystUtils.sanitize_float(slope)
        p_val = AnalystUtils.sanitize_float(p_val)
        r_sq = AnalystUtils.sanitize_float(r_val ** 2)
        is_sig = p_val < 0.05
        
        stat_conf = 1.0 - p_val if is_sig else 0.5 * (1.0 - p_val)
        biz_conf = min(1.0, abs(r_val))
        
        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=stat_conf,
            business_confidence=biz_conf,
            overall_confidence=dq_conf * 0.9 * stat_conf * biz_conf
        )

        direction = "stable"
        if is_sig:
            if slope > 0.001:
                direction = "growth"
            elif slope < -0.001:
                direction = "decline"
            else:
                direction = "plateau"

        # Detect structural breaks / change points (rolling window discrepancy)
        change_points = []
        if n >= 6:
            half = n // 2
            # Split and check if means are different
            m1 = y[:half].mean()
            m2 = y[half:].mean()
            if abs(m2 - m1) > y.std() * 0.5:
                # Mark mid-point as change point
                cp_date = AnalystUtils.resolve_date_string(df_temp[date_col].iloc[half])
                change_points.append(cp_date)

        explanation = (
            f"Statistically significant {direction} trend found in '{numerical_col}' over time "
            f"(slope = {slope:.4f}, p-value = {p_val:.4f})."
            if is_sig else f"No significant trend detected in '{numerical_col}' over time (stable)."
        )

        return TrendResult(
            evidence_ids=[ev_id],
            confidence_breakdown=conf,
            limitations=limits,
            reasoning_path=f"Fitted linear regression on temporal indices of '{numerical_col}' sorted by '{date_col}'",
            column=numerical_col,
            direction=direction,
            change_points=change_points,
            seasonality_detected=False, # check in seasonality module
            explanation=explanation
        )
