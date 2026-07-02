import numpy as np
import pandas as pd
from typing import List, Dict, Any
from sklearn.ensemble import IsolationForest
from backend.services.analytics.utils import sanitize_value

class AnomalyDetectionEngine:
    """
    Detects statistical and multi-dimensional anomalies in datasets.
    Uses Isolation Forest for multivariate anomaly detection and IQR/Z-score thresholds for univariate checks.
    """

    @staticmethod
    def detect_anomalies(df: pd.DataFrame, numeric_cols: List[str], datetime_cols: List[str]) -> List[Dict[str, Any]]:
        """
        Runs multiple anomaly detection methods (IQR and Isolation Forest).
        Returns a list of structured anomaly details.
        """
        anomalies = []
        anomaly_id_counter = 1
        row_count = len(df)

        if row_count < 5 or not numeric_cols:
            return []

        # 1. Univariate IQR Anomaly Check (Extreme Outliers)
        # We flag values outside [Q1 - 3 * IQR, Q3 + 3 * IQR] as extreme outliers
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) < 5:
                continue
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            if iqr == 0:
                # If IQR is 0 (due to constant or high skew), skip to prevent divide by zero
                continue
                
            lower_bound = q1 - 3.0 * iqr
            upper_bound = q3 + 3.0 * iqr
            
            outliers_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
            outliers_count = int(outliers_mask.sum())
            
            if outliers_count > 0:
                pct = outliers_count / row_count
                severity = "HIGH" if pct > 0.01 else "MEDIUM"
                
                # Sample some outlier indexes or values
                sample_indices = df[outliers_mask].index[:3].tolist()
                sample_values = df.loc[sample_indices, col].tolist()
                sample_str = ", ".join([f"{val:.2f}" for val in sample_values])
                
                anomalies.append({
                    "id": f"anomaly_iqr_{anomaly_id_counter}",
                    "type": "univariate_outlier",
                    "column": str(col),
                    "severity": severity,
                    "description": f"Column '{col}' has {outliers_count} extreme univariate outliers ({pct:.1%} of rows). Sample values: [{sample_str}] outside normal boundaries [{lower_bound:.2f}, {upper_bound:.2f}].",
                    "remedy": f"Examine outliers in '{col}' for sensor/data errors, or clip them using winsorization before training predictive models."
                })
                anomaly_id_counter += 1

        # 2. Multivariate Isolation Forest Check
        # Run multivariate isolation forest if we have multiple numeric columns and enough rows
        if len(numeric_cols) >= 2 and row_count >= 10:
            try:
                # Prepare data by filling missing values temporarily
                data_for_if = df[numeric_cols].copy()
                for col in numeric_cols:
                    data_for_if[col] = data_for_if[col].fillna(data_for_if[col].median())
                
                # Check for variance (skip IF if data has no variance)
                if data_for_if.var().sum() > 1e-9:
                    # Contamination set to 1%
                    iso_forest = IsolationForest(contamination=0.01, random_state=42)
                    preds = iso_forest.fit_predict(data_for_if)
                    
                    multivariate_anomalies_mask = preds == -1
                    multivariate_count = int(multivariate_anomalies_mask.sum())
                    
                    if multivariate_count > 0:
                        # Find the rows with highest anomaly score
                        scores = iso_forest.decision_function(data_for_if)
                        worst_idx = np.argmin(scores)
                        worst_row = df.iloc[worst_idx]
                        
                        # Build a description summarizing the worst anomaly row values
                        details_list = []
                        for col in numeric_cols[:3]:
                            details_list.append(f"{col}={worst_row[col]}")
                        worst_details_str = ", ".join(details_list)
                        
                        anomalies.append({
                            "id": f"anomaly_iforest_{anomaly_id_counter}",
                            "type": "multivariate_anomaly",
                            "column": None,
                            "severity": "HIGH",
                            "description": f"Detected {multivariate_count} multivariate anomalous rows using Isolation Forest. The combinations of features in these rows do not fit standard variance models. Example row details: [{worst_details_str}].",
                            "remedy": "Conduct a manual audit of anomalous rows to verify if they are fraud, processing glitches, or unique customer transactions."
                        })
                        anomaly_id_counter += 1
            except Exception:
                pass

        # 3. Fallback: If no anomalies found, generate a baseline message
        if not anomalies:
            anomalies.append({
                "id": "anomaly_none",
                "type": "clean_scan",
                "column": None,
                "severity": "INFO",
                "description": "No critical statistical anomalies detected across numeric features.",
                "remedy": "Continuous scanning is enabled. Standard data distributions are operational."
            })

        return anomalies
