import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeRegressor
from sklearn.feature_selection import mutual_info_regression
from typing import List, Dict, Any, Tuple
from backend.services.data_analyst.utils import AnalystUtils

class FeatureImportanceEngine:
    """
    Computes feature importance rankings using Decision Tree models
    and Mutual Information to determine key business drivers of target KPIs.
    """

    @staticmethod
    def calculate_drivers(
        df: pd.DataFrame,
        target_col: str,
        feature_cols: List[str]
    ) -> List[Tuple[str, float]]:
        """
        Uses Decision Tree Regressor to rank the predictive influence
        of feature columns on the target metric.
        """
        drivers = []
        if not feature_cols:
            return drivers

        # Drop rows where target is missing
        df_clean = df.dropna(subset=[target_col]).copy()
        if len(df_clean) < 15:
            return drivers

        # Encode features
        X_df = pd.DataFrame()
        for col in feature_cols:
            series = df_clean[col]
            if np.issubdtype(series.dtype, np.number):
                X_df[col] = series.fillna(series.mean() if not series.dropna().empty else 0.0)
            else:
                # Factorize categories
                X_df[col] = pd.factorize(series)[0]

        y = df_clean[target_col].values
        X = X_df.values
        
        try:
            # Fit a shallow Decision Tree Regressor to avoid overfitting
            model = DecisionTreeRegressor(max_depth=4, random_state=42)
            model.fit(X, y)
            
            importances = model.feature_importances_
            
            # Rank
            for col, imp in zip(feature_cols, importances):
                drivers.append((col, AnalystUtils.sanitize_float(imp)))
                
            drivers.sort(key=lambda x: x[1], reverse=True)
        except Exception:
            pass

        return drivers
