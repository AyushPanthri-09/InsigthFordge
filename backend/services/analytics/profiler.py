import numpy as np
import pandas as pd
from typing import Dict, Any, List
from scipy.stats import skew, kurtosis
from backend.services.analytics.utils import sanitize_value, safe_float

class DatasetProfilingEngine:
    """
    Profiles datasets: identifies metadata statistics (null ratios, uniqueness, cardinality)
    and mathematical shape details (mean, skewness, kurtosis, entropy).
    Automatically classifies columns as Measures, Dimensions, Keys, or Datetimes.
    """

    @staticmethod
    def calculate_entropy(series: pd.Series) -> float:
        """
        Calculates Shannon Entropy for a pandas Series.
        """
        non_null = series.dropna()
        if len(non_null) == 0:
            return 0.0
        value_counts = non_null.value_counts(normalize=True)
        return -float(np.sum(value_counts * np.log2(value_counts + 1e-12)))

    @staticmethod
    def profile_dataset(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generates profile analysis for a DataFrame.
        """
        row_count, col_count = df.shape
        columns_profile = []
        
        # Identify types of columns
        datetime_cols = []
        numeric_cols = []
        categorical_cols = []
        id_cols = []
        
        # Memory usage calculation
        try:
            memory_bytes = int(df.memory_usage(deep=True).sum())
            memory_usage_str = f"{memory_bytes / 1024:.2f} KB" if memory_bytes < 1048576 else f"{memory_bytes / 1048576:.2f} MB"
        except Exception:
            memory_usage_str = "Unknown"

        for col in df.columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            null_pct = null_count / row_count if row_count > 0 else 0.0
            nunique = series.nunique()
            
            # 1. Determine role & type
            role = "dimension"
            col_type = "categorical"
            
            if np.issubdtype(series.dtype, np.datetime64) or isinstance(series.dtype, pd.DatetimeTZDtype):
                role = "datetime"
                col_type = "temporal"
                datetime_cols.append(col)
            elif np.issubdtype(series.dtype, np.number):
                # Is it an identifier or a scale?
                if nunique == row_count and series.dtype in ["int64", "int32"]:
                    role = "key"
                    col_type = "identifier"
                    id_cols.append(col)
                elif nunique / row_count < 0.05 and nunique < 15:
                    role = "dimension"
                    col_type = "categorical"
                    categorical_cols.append(col)
                else:
                    role = "measure"
                    col_type = "numeric_measure"
                    numeric_cols.append(col)
            else:
                # String / object type
                # Try to see if it is identifier
                if nunique == row_count:
                    role = "key"
                    col_type = "identifier"
                    id_cols.append(col)
                else:
                    role = "dimension"
                    col_type = "categorical"
                    categorical_cols.append(col)

            # Compute column statistics
            col_stats = {
                "name": str(col),
                "role": role,
                "type": col_type,
                "nullPct": float(null_pct),
                "nullCount": null_count,
                "uniqueCount": nunique,
                "entropy": DatasetProfilingEngine.calculate_entropy(series)
            }
            
            if col_type == "numeric_measure":
                non_null_numeric = series.dropna()
                if len(non_null_numeric) > 0:
                    col_stats.update({
                        "min": sanitize_value(non_null_numeric.min()),
                        "max": sanitize_value(non_null_numeric.max()),
                        "mean": sanitize_value(non_null_numeric.mean()),
                        "median": sanitize_value(non_null_numeric.median()),
                        "variance": sanitize_value(non_null_numeric.var()),
                        "stdDev": sanitize_value(non_null_numeric.std()),
                        "skewness": safe_float(skew(non_null_numeric, bias=False)),
                        "kurtosis": safe_float(kurtosis(non_null_numeric, bias=False))
                    })
                    
            columns_profile.append(col_stats)

        # 2. Recommendations for Targets & Features
        # Target recommendation: Usually numeric measures that have a reasonable distribution
        # or categorical columns with medium entropy (e.g. status, label, churn)
        target_recommendations = []
        feature_recommendations = []
        
        for col_stats in columns_profile:
            col_name = col_stats["name"]
            # Look for typical target column names (revenue, sales, churn, price, count, status, target, y)
            is_target_name = any(t in col_name.lower() for t in ["target", "churn", "revenue", "sales", "price", "status", "outcome", "label"])
            if col_stats["role"] in ["measure", "dimension"] and col_stats["nullPct"] < 0.3:
                if is_target_name:
                    target_recommendations.insert(0, col_name)  # High priority
                else:
                    feature_recommendations.append(col_name)
                    
        if not target_recommendations and numeric_cols:
            # Fallback target: the first numeric measure
            target_recommendations.append(numeric_cols[0])
            if numeric_cols[0] in feature_recommendations:
                feature_recommendations.remove(numeric_cols[0])
                
        # Detect domain
        domain = "generic"
        domain_confidence = 0.5
        all_col_names = " ".join([str(c).lower() for c in df.columns])
        
        if any(w in all_col_names for w in ["price", "qty", "quantity", "sale", "revenue", "transaction", "order", "customer", "product"]):
            domain = "ecommerce"
            domain_confidence = 0.85
        elif any(w in all_col_names for w in ["patient", "clinical", "heart", "blood", "medical", "treatment", "doctor"]):
            domain = "healthcare"
            domain_confidence = 0.90
        elif any(w in all_col_names for w in ["balance", "loan", "interest", "credit", "rate", "transaction", "account"]):
            domain = "finance"
            domain_confidence = 0.85

        return {
            "rowCount": row_count,
            "columnCount": col_count,
            "memoryUsage": memory_usage_str,
            "domain": domain,
            "domainConfidence": domain_confidence,
            "columns": columns_profile,
            "recommendedTargets": target_recommendations[:2],
            "recommendedFeatures": feature_recommendations[:10],
            "recommendedDatetimes": datetime_cols,
            "recommendedCategoricals": categorical_cols
        }
