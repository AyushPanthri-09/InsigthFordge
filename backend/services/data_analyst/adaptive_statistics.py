import pandas as pd
import numpy as np
from scipy import stats
from typing import Tuple, Dict, Any

class AdaptiveStatisticalSelector:
    """
    Evaluates dataset distributions, shapes, and types to dynamically select 
    the correct parametric or non-parametric statistical tests.
    """

    @staticmethod
    def test_normality(series: pd.Series) -> Tuple[bool, float, str]:
        """
        Runs Shapiro-Wilk or D'Agostino K-squared to verify normality.
        Returns is_normal (bool), p_value (float), and explanation (str).
        """
        clean_series = series.dropna()
        n = len(clean_series)
        
        if n < 8:
            return False, 1.0, f"Sample size too small ({n} < 8) to assert normality."
            
        try:
            if n <= 5000:
                stat, p_val = stats.shapiro(clean_series)
                test_name = "Shapiro-Wilk"
            else:
                stat, p_val = stats.normaltest(clean_series)
                test_name = "D'Agostino K-squared"
                
            is_normal = p_val > 0.05
            explanation = (
                f"{test_name} normality test p-value: {p_val:.4f}. "
                f"Fail to reject normality (normal)" if is_normal else f"Reject normality (non-normal)"
            )
            return is_normal, float(p_val), explanation
        except Exception as e:
            return False, 0.0, f"Normality test failed: {str(e)}"

    @staticmethod
    def select_correlation_method(series_x: pd.Series, series_y: pd.Series) -> Tuple[str, str]:
        """
        Selects Pearson for normal continuous pairs, Spearman for non-normal or rank pairs.
        """
        norm_x, _, expl_x = AdaptiveStatisticalSelector.test_normality(series_x)
        norm_y, _, expl_y = AdaptiveStatisticalSelector.test_normality(series_y)
        
        if norm_x and norm_y:
            return "pearson", f"Pearson selected because both variables are normally distributed. ({expl_x}; {expl_y})"
        else:
            return "spearman", f"Spearman rank correlation selected due to non-normal distributions. ({expl_x}; {expl_y})"

    @staticmethod
    def select_group_comparison_method(
        df: pd.DataFrame,
        numerical_col: str,
        categorical_col: str
    ) -> Tuple[str, str]:
        """
        Selects between T-Test/Mann-Whitney (2 groups) or ANOVA/Kruskal-Wallis (>2 groups).
        """
        groups = df.groupby(categorical_col)[numerical_col]
        num_groups = groups.ngroups
        
        if num_groups < 2:
            return "none", "Requires at least 2 distinct categories for group comparison."

        # Check normality of each group containing >= 8 samples
        all_normal = True
        reasons = []
        for name, grp in groups:
            if len(grp) >= 8:
                normal, _, expl = AdaptiveStatisticalSelector.test_normality(grp)
                if not normal:
                    all_normal = False
                    reasons.append(f"Group '{name}' is non-normal ({expl})")
            else:
                all_normal = False
                reasons.append(f"Group '{name}' has insufficient size ({len(grp)} < 8)")

        if num_groups == 2:
            if all_normal:
                return "t_test", "Independent two-sample T-Test selected. Both categories exhibit normally distributed values."
            else:
                reason_str = "; ".join(reasons[:2])
                return "mann_whitney", f"Mann-Whitney U non-parametric comparison selected. Reason: {reason_str}"
        else:
            if all_normal:
                return "anova", "One-way ANOVA parametric comparison selected. All group samples exhibit normally distributed values."
            else:
                reason_str = "; ".join(reasons[:2])
                return "kruskal", f"Kruskal-Wallis non-parametric comparison selected. Reason: {reason_str}"
