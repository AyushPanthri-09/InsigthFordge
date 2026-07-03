import pandas as pd
import numpy as np
from scipy import stats
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor
from typing import List, Dict, Any, Tuple
from backend.services.data_analyst.contracts import StatisticalResult, ConfidenceBreakdown
from backend.services.data_analyst.utils import AnalystUtils

class StatisticalAnalysisEngine:
    """
    Executes standard mathematical and statistical testing procedures,
    populates evidence registries, and evaluates significance bounds.
    """

    @staticmethod
    def run_correlation(
        series_x: pd.Series,
        series_y: pd.Series,
        method: str,
        rationale: str,
        dq_conf: float
    ) -> StatisticalResult:
        """Executes Pearson or Spearman correlation test."""
        name_x = series_x.name if series_x.name is not None else "col_x"
        name_y = series_y.name if series_y.name is not None else "col_y"
        
        s_x = series_x.copy()
        s_y = series_y.copy()
        s_x.name = name_x
        s_y.name = name_y
        
        # Drop NaNs pairwise
        df_temp = pd.concat([s_x, s_y], axis=1).dropna()
        n = len(df_temp)
        col_x = name_x
        col_y = name_y
        
        limits = []
        if n < 30:
            limits.append("small sample size")
        
        if n < 3 or df_temp[col_x].nunique() <= 1 or df_temp[col_y].nunique() <= 1:
            # Zero variance / insufficient data edge case
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=0.0,
                business_confidence=0.0,
                overall_confidence=0.0
            )
            return StatisticalResult(
                evidence_ids=[f"ev_stat_corr_{col_x}_{col_y}"],
                confidence_breakdown=conf,
                validation_status="warning",
                limitations=limits + ["insufficient variance"],
                reasoning_path=f"Failed correlation run between '{col_x}' and '{col_y}'",
                method_name=method.upper(),
                test_statistic=0.0,
                p_value=1.0,
                selection_rationale=rationale,
                is_significant=False,
                business_interpretation="Correlation could not be calculated due to lack of distinct data points."
            )

        if method == "pearson":
            stat, p_val = stats.pearsonr(df_temp[col_x], df_temp[col_y])
        else:
            stat, p_val = stats.spearmanr(df_temp[col_x], df_temp[col_y])

        stat = AnalystUtils.sanitize_float(stat)
        p_val = AnalystUtils.sanitize_float(p_val)
        
        is_sig = p_val < 0.05
        stat_conf = 1.0 - p_val if is_sig else 0.5 * (1.0 - p_val)
        
        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.9,
            statistical_confidence=stat_conf,
            business_confidence=abs(stat),
            overall_confidence=dq_conf * 0.9 * stat_conf * abs(stat)
        )

        direction = "positive" if stat > 0 else "negative"
        strength = "strong" if abs(stat) > 0.7 else "moderate" if abs(stat) > 0.4 else "weak"
        interpretation = (
            f"There is a statistically significant, {strength} {direction} association (coefficient = {stat:.3f}) between '{col_x}' and '{col_y}'."
            if is_sig else f"No statistically significant association could be proven between '{col_x}' and '{col_y}' (p-value = {p_val:.4f})."
        )

        if 0.05 <= p_val < 0.10:
            limits.append("marginal significance")

        return StatisticalResult(
            evidence_ids=[f"ev_stat_corr_{col_x}_{col_y}"],
            confidence_breakdown=conf,
            limitations=limits,
            reasoning_path=f"Computed correlation coefficient using scipy.stats",
            method_name=method.upper(),
            test_statistic=stat,
            p_value=p_val,
            selection_rationale=rationale,
            is_significant=is_sig,
            business_interpretation=interpretation
        )

    @staticmethod
    def run_group_comparison(
        df: pd.DataFrame,
        numerical_col: str,
        categorical_col: str,
        method: str,
        rationale: str,
        dq_conf: float
    ) -> StatisticalResult:
        """Executes T-Test, Mann-Whitney, ANOVA, or Kruskal-Wallis comparisons."""
        groups = [grp.dropna() for _, grp in df.groupby(categorical_col)[numerical_col]]
        n = sum(len(g) for g in groups)
        
        limits = []
        if n < 30:
            limits.append("small sample size")
            
        ev_id = f"ev_stat_comp_{numerical_col}_{categorical_col}"
        
        if len(groups) < 2 or any(len(g) < 3 for g in groups):
            # Insufficient group size fallback
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=0.0,
                business_confidence=0.0,
                overall_confidence=0.0
            )
            return StatisticalResult(
                evidence_ids=[ev_id],
                confidence_breakdown=conf,
                validation_status="warning",
                limitations=limits + ["insufficient group size"],
                reasoning_path=f"Failed group comparison on '{numerical_col}' by '{categorical_col}'",
                method_name=method.upper(),
                test_statistic=0.0,
                p_value=1.0,
                selection_rationale=rationale,
                is_significant=False,
                business_interpretation="Comparison was aborted; one or more categories have less than 3 samples."
            )

        try:
            if method == "t_test":
                stat, p_val = stats.ttest_ind(groups[0], groups[1], equal_var=False)
            elif method == "mann_whitney":
                stat, p_val = stats.mannwhitneyu(groups[0], groups[1])
            elif method == "anova":
                stat, p_val = stats.f_oneway(*groups)
            else: # kruskal
                stat, p_val = stats.kruskal(*groups)
                
            stat = AnalystUtils.sanitize_float(stat)
            p_val = AnalystUtils.sanitize_float(p_val)
            is_sig = p_val < 0.05
            
            stat_conf = 1.0 - p_val if is_sig else 0.5 * (1.0 - p_val)
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=stat_conf,
                business_confidence=0.8, # constant heuristic for business impact
                overall_confidence=dq_conf * 0.9 * stat_conf * 0.8
            )

            interpretation = (
                f"Statistical comparison ({method.upper()}) shows a significant difference in '{numerical_col}' across '{categorical_col}' groups (p-value = {p_val:.4f})."
                if is_sig else f"No significant difference in '{numerical_col}' across groups of '{categorical_col}' was detected (p-value = {p_val:.4f})."
            )
            
            if 0.05 <= p_val < 0.10:
                limits.append("marginal significance")

            return StatisticalResult(
                evidence_ids=[ev_id],
                confidence_breakdown=conf,
                limitations=limits,
                reasoning_path=f"Executed {method.upper()} hypothesis test",
                method_name=method.upper(),
                test_statistic=stat,
                p_value=p_val,
                selection_rationale=rationale,
                is_significant=is_sig,
                business_interpretation=interpretation
            )
        except Exception as e:
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=0.0,
                business_confidence=0.0,
                overall_confidence=0.0
            )
            return StatisticalResult(
                evidence_ids=[ev_id],
                confidence_breakdown=conf,
                validation_status="warning",
                limitations=limits + ["computation error"],
                reasoning_path=f"Error executing group comparison: {str(e)}",
                method_name=method.upper(),
                test_statistic=0.0,
                p_value=1.0,
                selection_rationale=rationale,
                is_significant=False,
                business_interpretation="Hypothesis test failed to compute mathematically."
            )

    @staticmethod
    def run_chi_square(
        df: pd.DataFrame,
        col_x: str,
        col_y: str,
        dq_conf: float
    ) -> StatisticalResult:
        """Runs Chi-Square test of independence between two categorical columns."""
        contingency = pd.crosstab(df[col_x], df[col_y])
        n = int(contingency.sum().sum())
        ev_id = f"ev_stat_chisq_{col_x}_{col_y}"
        limits = []
        
        if n < 20 or contingency.shape[0] < 2 or contingency.shape[1] < 2:
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.8,
                statistical_confidence=0.0,
                business_confidence=0.0,
                overall_confidence=0.0
            )
            return StatisticalResult(
                evidence_ids=[ev_id],
                confidence_breakdown=conf,
                validation_status="warning",
                limitations=["sparse cells"],
                reasoning_path="Aborted Chi-Square; sparse counts or single category columns.",
                method_name="CHI_SQUARE",
                test_statistic=0.0,
                p_value=1.0,
                selection_rationale="Requires categorical variables with multiple states and sufficient observations.",
                is_significant=False,
                business_interpretation="Chi-square test of independence could not be evaluated due to insufficient category counts."
            )

        stat, p_val, _, _ = stats.chi2_contingency(contingency)
        stat = AnalystUtils.sanitize_float(stat)
        p_val = AnalystUtils.sanitize_float(p_val)
        is_sig = p_val < 0.05
        
        stat_conf = 1.0 - p_val if is_sig else 0.5 * (1.0 - p_val)
        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.85,
            statistical_confidence=stat_conf,
            business_confidence=0.7,
            overall_confidence=dq_conf * 0.85 * stat_conf * 0.7
        )

        interpretation = (
            f"Chi-square test suggests a significant association between '{col_x}' and '{col_y}' (p-value = {p_val:.4f})."
            if is_sig else f"No significant relationship between '{col_x}' and '{col_y}' could be established (p-value = {p_val:.4f})."
        )

        return StatisticalResult(
            evidence_ids=[ev_id],
            confidence_breakdown=conf,
            limitations=limits,
            reasoning_path="Calculated contingency chi-square on cross-tabulations.",
            method_name="CHI_SQUARE",
            test_statistic=stat,
            p_value=p_val,
            selection_rationale="Categorical vs categorical relationship check.",
            is_significant=is_sig,
            business_interpretation=interpretation
        )

    @staticmethod
    def calculate_vif(df: pd.DataFrame, numeric_cols: List[str]) -> Dict[str, float]:
        """Calculates Variance Inflation Factor (VIF) to detect multicollinearity."""
        if len(numeric_cols) < 2:
            return {}
            
        clean_df = df[numeric_cols].dropna()
        if len(clean_df) < 10:
            return {}
            
        # Add constant column
        X = sm.add_constant(clean_df)
        
        vif_dict = {}
        for i, col in enumerate(numeric_cols):
            try:
                # Add constant adds const at index 0, so shift col index by 1
                vif = variance_inflation_factor(X.values, i + 1)
                if np.isinf(vif) or np.isnan(vif):
                    vif_dict[col] = 999.0
                else:
                    vif_dict[col] = AnalystUtils.sanitize_float(vif)
            except Exception:
                vif_dict[col] = 999.0 # flag collinearity if VIF error
                
        return vif_dict
