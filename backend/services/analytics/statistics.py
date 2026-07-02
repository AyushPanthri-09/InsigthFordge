import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from scipy import stats
from backend.services.analytics.utils import safe_float, sanitize_value

class StatisticalAnalysisEngine:
    """
    Performs dynamic hypothesis testing and statistical analysis.
    Supports Normality tests, Correlation coefficients, Chi-Square, T-tests, ANOVA, and non-parametric alternatives.
    Includes business-oriented interpretations and assumption checks.
    """

    @staticmethod
    def test_normality(series: pd.Series) -> Dict[str, Any]:
        """
        Runs Shapiro-Wilk (n < 5000) or Kolmogorov-Smirnov normality test.
        """
        clean_data = series.dropna()
        n = len(clean_data)
        
        if n < 3:
            return {
                "test": "Insufficient Data",
                "statistic": 0.0,
                "pValue": 1.0,
                "isNormal": True,
                "rationale": "Sample size too small to evaluate normality.",
                "interpretation": "Normality assumed due to insufficient records."
            }

        # Select test based on sample size
        if n < 5000:
            stat, p_val = stats.shapiro(clean_data)
            test_name = "Shapiro-Wilk Normality Test"
            rationale = "Selected Shapiro-Wilk as it is optimal for smaller datasets (N < 5000)."
        else:
            # KS test against standard normal distribution (requires standardized series)
            standardized = (clean_data - clean_data.mean()) / (clean_data.std() + 1e-9)
            stat, p_val = stats.kstest(standardized, 'norm')
            test_name = "Kolmogorov-Smirnov Normality Test"
            rationale = "Selected Kolmogorov-Smirnov as it handles large scale datasets efficiently."

        is_normal = p_val > 0.05
        interpretation = (
            f"The data appears to be normally distributed (p = {p_val:.4f} > 0.05). "
            f"We fail to reject the null hypothesis of normality."
            if is_normal else
            f"The data deviates significantly from a normal distribution (p = {p_val:.4f} <= 0.05). "
            f"We reject the null hypothesis of normality."
        )

        return {
            "test": test_name,
            "statistic": safe_float(stat),
            "pValue": safe_float(p_val),
            "isNormal": is_normal,
            "rationale": rationale,
            "interpretation": interpretation
        }

    @staticmethod
    def compare_groups(df: pd.DataFrame, numeric_col: str, categorical_col: str) -> Dict[str, Any]:
        """
        Compares numeric column distributions across groups defined by the categorical column.
        Dynamically selects T-test / Mann-Whitney U (for 2 categories) or ANOVA / Kruskal-Wallis (for 3+ categories).
        """
        # Get groups
        groups_data = []
        group_names = []
        for name, group in df.groupby(categorical_col):
            clean_grp = group[numeric_col].dropna()
            if len(clean_grp) >= 3:
                groups_data.append(clean_grp)
                group_names.append(str(name))

        num_groups = len(groups_data)
        if num_groups < 2:
            return {
                "test": "Insufficient Groups",
                "explanation": "At least two categories with sufficient samples are required."
            }

        # Check normality of the overall column
        normality_res = StatisticalAnalysisEngine.test_normality(df[numeric_col])
        is_normal = normality_res["isNormal"]

        # Run test
        if num_groups == 2:
            group_a, group_b = groups_data[0], groups_data[1]
            if is_normal:
                # Run Independent T-Test
                stat, p_val = stats.ttest_ind(group_a, group_b, equal_var=False)
                test_name = "Welch's Independent Two-Sample T-Test"
                rationale = "Selected Welch's T-Test because we are comparing exactly 2 groups with normally distributed values."
                assumptions = "Assumes independent random samples from normally distributed populations."
            else:
                # Run Mann-Whitney U
                stat, p_val = stats.mannwhitneyu(group_a, group_b, alternative='two-sided')
                test_name = "Mann-Whitney U Test"
                rationale = "Selected non-parametric Mann-Whitney U test because the numeric distribution is non-normal."
                assumptions = "Assumes independent samples and ordinal/continuous distributions."

            mean_a = float(group_a.mean())
            mean_b = float(group_b.mean())
            effect_size = float(abs(mean_a - mean_b) / (df[numeric_col].std() + 1e-9))
            
            sig_text = "statistically significant" if p_val < 0.05 else "not statistically significant"
            interpretation = (
                f"The difference between '{group_names[0]}' (mean: {mean_a:.2f}) and "
                f"'{group_names[1]}' (mean: {mean_b:.2f}) is {sig_text} (p = {p_val:.4f})."
            )
            business_meaning = (
                f"Operating performance varies reliably between these groups. "
                f"Tailor separate operational paths for '{group_names[0]}' and '{group_names[1]}'."
                if p_val < 0.05 else
                "No strong evidence of performance difference. Treat these categories identically in strategic plans."
            )

            return {
                "test": test_name,
                "statistic": safe_float(stat),
                "pValue": safe_float(p_val),
                "effectSize": round(effect_size, 3),
                "rationale": rationale,
                "assumptions": assumptions,
                "interpretation": interpretation,
                "businessMeaning": business_meaning
            }
        else:
            # 3+ groups
            if is_normal:
                # ANOVA
                stat, p_val = stats.f_oneway(*groups_data)
                test_name = "One-way Analysis of Variance (ANOVA)"
                rationale = "Selected ANOVA because we are comparing 3 or more groups with normally distributed values."
                assumptions = "Assumes independent random samples, normality, and homogeneity of variances."
            else:
                # Kruskal-Wallis
                stat, p_val = stats.kruskal(*groups_data)
                test_name = "Kruskal-Wallis H Test"
                rationale = "Selected non-parametric Kruskal-Wallis test because values are non-normal and we have 3+ groups."
                assumptions = "Assumes independent samples and continuous/ordinal outcomes."

            sig_text = "statistically significant" if p_val < 0.05 else "not statistically significant"
            interpretation = f"The differences across the {num_groups} category groups are {sig_text} (p = {p_val:.4f})."
            business_meaning = (
                f"At least one category exhibits unique performance dynamics. Investigate group averages to optimize resources."
                if p_val < 0.05 else
                "Categories demonstrate statistically uniform behaviour. No segment-specific targeting is justified."
            )

            return {
                "test": test_name,
                "statistic": safe_float(stat),
                "pValue": safe_float(p_val),
                "effectSize": None,
                "rationale": rationale,
                "assumptions": assumptions,
                "interpretation": interpretation,
                "businessMeaning": business_meaning
            }

    @staticmethod
    def check_independence(df: pd.DataFrame, col_a: str, col_b: str) -> Dict[str, Any]:
        """
        Performs Chi-Square Test of Independence between two categorical variables.
        """
        contingency_table = pd.crosstab(df[col_a], df[col_b])
        if contingency_table.size < 4:
            return {
                "test": "Chi-Square Test of Independence",
                "explanation": "Contingency table too small to perform Chi-Square test safely."
            }

        try:
            stat, p_val, dof, expected = stats.chi2_contingency(contingency_table)
            is_significant = p_val < 0.05
            
            interpretation = (
                f"Significant association detected between '{col_a}' and '{col_b}' "
                f"(p = {p_val:.4f} < 0.05). They are not independent."
                if is_significant else
                f"No significant association detected between '{col_a}' and '{col_b}' "
                f"(p = {p_val:.4f} >= 0.05). They appear independent."
            )
            
            business_meaning = (
                f"Distribution of '{col_a}' is linked to '{col_b}'. Segment your plans accordingly."
                if is_significant else
                f"Varying '{col_a}' does not affect '{col_b}'. These items behave independently."
            )

            return {
                "test": "Chi-Square Test of Independence",
                "statistic": safe_float(stat),
                "pValue": safe_float(p_val),
                "degreesOfFreedom": int(dof),
                "rationale": "Selected Chi-Square test of independence to assess relationships between nominal variables.",
                "assumptions": "Assumes nominal or ordinal categories, independent observations, and expected cell counts >= 5.",
                "interpretation": interpretation,
                "businessMeaning": business_meaning
            }
        except Exception as e:
            return {
                "test": "Chi-Square Test of Independence",
                "explanation": f"Failed to calculate Chi-Square: {str(e)}"
            }

    @staticmethod
    def calculate_vif(df: pd.DataFrame, numeric_cols: List[str]) -> Dict[str, float]:
        """
        Calculates Variance Inflation Factor (VIF) to detect multicollinearity.
        VIF = 1 / (1 - R_i^2) for each column regressed on others.
        """
        vifs = {}
        if len(numeric_cols) < 2:
            return {col: 1.0 for col in numeric_cols}

        # Ensure no NaNs or constant columns in calculations
        clean_df = df[numeric_cols].dropna()
        if len(clean_df) < 5:
            return {col: 1.0 for col in numeric_cols}

        for col in numeric_cols:
            y = clean_df[col]
            x_cols = [c for c in numeric_cols if c != col]
            X = clean_df[x_cols]
            # Verify if X has variance
            if X.var().min() < 1e-9 or y.var() < 1e-9:
                vifs[col] = 1.0
                continue
            try:
                # Fit simple linear model to calculate R^2
                # VIF = 1 / (1 - R^2)
                # Using numpy lstsq for fast vectorised fitting
                X_matrix = np.hstack([np.ones((X.shape[0], 1)), X.values])
                coef, residuals, rank, s = np.linalg.lstsq(X_matrix, y.values, rcond=None)
                
                # R^2 = 1 - (SS_res / SS_tot)
                ss_res = residuals[0] if len(residuals) > 0 else np.sum((y.values - X_matrix @ coef) ** 2)
                ss_tot = np.sum((y.values - y.mean()) ** 2)
                
                r_squared = 1.0 - (ss_res / (ss_tot + 1e-9))
                vif = float(1.0 / (1.0 - r_squared + 1e-9))
                vifs[col] = min(vif, 999.0)  # Bound extreme VIFs
            except Exception:
                vifs[col] = 1.0

        return vifs
