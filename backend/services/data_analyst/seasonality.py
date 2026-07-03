import pandas as pd
import numpy as np
from typing import Tuple, Optional

class SeasonalityDetector:
    """
    Evaluates autocorrelation coefficients across multiple lags to discover 
    weekly, monthly, or annual cyclical periods in numeric series.
    """

    @staticmethod
    def detect_seasonality(
        df: pd.DataFrame,
        numerical_col: str,
        date_col: str
    ) -> Tuple[bool, Optional[int], str]:
        """
        Calculates ACF coefficients. Returns seasonality_detected (bool),
        period (int/None), and explanation (str).
        """
        # Group by date to get a daily/clean frequency series if possible
        df_temp = df[[date_col, numerical_col]].dropna().copy()
        df_temp[date_col] = pd.to_datetime(df_temp[date_col])
        series = df_temp.groupby(date_col)[numerical_col].mean().sort_index()
        
        n = len(series)
        if n < 14:
            return False, None, "Insufficient data length to evaluate seasonality cycles."

        # Compute autocorrelation for various lags
        # Check weekly (7) and monthly (30) or yearly (12)
        lags_to_test = [7, 12, 30]
        max_acf = 0.0
        best_lag = None

        for lag in lags_to_test:
            if n > lag * 2:
                try:
                    acf_coef = series.autocorr(lag=lag)
                    if pd.notna(acf_coef) and acf_coef > max_acf:
                        max_acf = acf_coef
                        best_lag = lag
                except Exception:
                    pass

        # Threshold of 0.35 indicates moderate/strong cyclical correlation
        if best_lag and max_acf > 0.35:
            return (
                True,
                best_lag,
                f"Moderate/strong seasonal cycle detected at lag {best_lag} (autocorrelation = {max_acf:.3f})."
            )
            
        return False, None, "No significant seasonal cyclical autocorrelation found."
