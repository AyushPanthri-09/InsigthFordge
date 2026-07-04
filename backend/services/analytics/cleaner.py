import re
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from scipy import stats

class DatasetCleaningEngine:
    """
    Cleans datasets by standardizing column types, handling missing values,
    clipping/detecting outliers, and normalising texts.
    Generates a structured log detailing every cleaning action.
    """

    @staticmethod
    def clean_dataset(df: pd.DataFrame, config: Dict[str, Any] = None) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        """
        Runs the cleaning pipeline. If config is not provided, defaults to auto-cleaning.
        Returns the cleaned DataFrame and a list of cleaning actions/logs.
        """
        cleaned_df = df.copy()
        cleaning_log = []
        
        if config is None:
            config = {
                "deduplicate": True,
                "normalize_columns": True,
                "impute_missing": True,
                "handle_outliers": True,
                "normalize_strings": True
            }

        # 1. Row Deduplication
        if config.get("deduplicate", True):
            initial_rows = len(cleaned_df)
            cleaned_df = cleaned_df.drop_duplicates()
            final_rows = len(cleaned_df)
            diff = initial_rows - final_rows
            if diff > 0:
                cleaning_log.append({
                    "action": "deduplicate_rows",
                    "description": f"Removed {diff} exact duplicate rows from the dataset.",
                    "count": diff
                })

        # 2. Column Header Normalization
        if config.get("normalize_columns", True):
            orig_columns = list(cleaned_df.columns)
            new_columns = []
            renamed_count = 0
            for col in orig_columns:
                # Replace special chars, convert to lowercase-like cleaner formatting if required
                new_col = str(col).strip()
                new_col = re.sub(r'[^\w\s]', '', new_col)  # remove special characters
                new_col = re.sub(r'\s+', '_', new_col)      # replace space sequences with underscore
                if new_col != col:
                    renamed_count += 1
                new_columns.append(new_col)
            cleaned_df.columns = new_columns
            if renamed_count > 0:
                cleaning_log.append({
                    "action": "normalize_columns",
                    "description": f"Normalized {renamed_count} column headers to follow clean naming conventions.",
                    "count": renamed_count
                })

        # Process columns
        for col in cleaned_df.columns:
            # 3. Dynamic Datatype Inference & Type Standardization
            series = cleaned_df[col]
            non_null = series.dropna()
            if len(non_null) == 0:
                continue

            # Check if Date
            is_date = False
            # If string type, try parsing as date if it matches common structures
            if series.dtype == "object":
                # Sample a few non-null elements
                sample = non_null.head(10).astype(str)
                date_match_count = sum(1 for s in sample if re.match(r'^\d{4}[-/]\d{2}[-/]\d{2}', s) or re.match(r'^\d{2}[-/]\d{2}[-/]\d{4}', s))
                if date_match_count > 5:
                    try:
                        cleaned_df[col] = pd.to_datetime(cleaned_df[col], errors='coerce')
                        is_date = True
                        cleaning_log.append({
                            "action": "cast_datetime",
                            "description": f"Inferred datetime format and cast column '{col}' to datetime.",
                            "column": col
                        })
                    except Exception:
                        pass

            # Check if Numeric conversion is possible
            if not is_date and series.dtype == "object":
                # Check if it represents numbers (stripping common currencies/percentages)
                sample = non_null.head(20).astype(str)
                clean_numeric_match = 0
                for s in sample:
                    cleaned_str = s.replace("$", "").replace("%", "").replace(",", "").strip()
                    if re.match(r'^-?\d+(\.\d+)?$', cleaned_str):
                        clean_numeric_match += 1
                if clean_numeric_match > 15:
                    try:
                        cleaned_df[col] = cleaned_df[col].astype(str).str.replace("$", "", regex=False)
                        cleaned_df[col] = cleaned_df[col].astype(str).str.replace("%", "", regex=False)
                        cleaned_df[col] = cleaned_df[col].astype(str).str.replace(",", "", regex=False)
                        cleaned_df[col] = pd.to_numeric(cleaned_df[col], errors='coerce')
                        cleaning_log.append({
                            "action": "cast_numeric",
                            "description": f"Cleaned financial/percentage symbols and cast column '{col}' to numeric.",
                            "column": col
                        })
                    except Exception:
                        pass

            # Update series reference
            series = cleaned_df[col]

            # 4. Impute missing values
            null_count = int(series.isnull().sum())
            if config.get("impute_missing", True) and null_count > 0:
                if pd.api.types.is_numeric_dtype(series.dtype):
                    # Numeric: use median to be robust against outliers
                    median_val = float(series.median()) if not pd.isna(series.median()) else 0.0
                    cleaned_df[col] = cleaned_df[col].fillna(median_val)
                    cleaning_log.append({
                        "action": "impute_numeric",
                        "description": f"Imputed {null_count} missing values in numeric column '{col}' with the median value ({median_val:.2f}).",
                        "column": col,
                        "count": null_count
                    })
                elif np.issubdtype(series.dtype, np.datetime64) or isinstance(series.dtype, pd.DatetimeTZDtype):
                    # Datetime: forward-fill then backward-fill
                    cleaned_df[col] = cleaned_df[col].ffill().bfill()
                    cleaning_log.append({
                        "action": "impute_datetime",
                        "description": f"Imputed {null_count} missing datetimes in column '{col}' using forward/backward fill.",
                        "column": col,
                        "count": null_count
                    })
                else:
                    # Categorical: use mode
                    mode_series = series.mode()
                    mode_val = str(mode_series.iloc[0]) if not mode_series.empty else "Unknown"
                    cleaned_df[col] = cleaned_df[col].fillna(mode_val)
                    cleaning_log.append({
                        "action": "impute_categorical",
                        "description": f"Imputed {null_count} missing values in categorical column '{col}' with mode value '{mode_val}'.",
                        "column": col,
                        "count": null_count
                    })

            # Update series reference
            series = cleaned_df[col]

            # 5. Handle Outliers
            if config.get("handle_outliers", True) and pd.api.types.is_numeric_dtype(series.dtype):
                q1 = series.quantile(0.25)
                q3 = series.quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                # Check for outliers
                outliers_mask = (series < lower_bound) | (series > upper_bound)
                outliers_count = int(outliers_mask.sum())
                if outliers_count > 0:
                    # Clip values inside bounds
                    cleaned_df[col] = cleaned_df[col].clip(lower=lower_bound, upper=upper_bound)
                    cleaning_log.append({
                        "action": "clip_outliers",
                        "description": f"Clipped {outliers_count} outliers in numeric column '{col}' using IQR method limits [{lower_bound:.2f}, {upper_bound:.2f}].",
                        "column": col,
                        "count": outliers_count
                    })

            # 6. Normalize text strings
            if config.get("normalize_strings", True) and series.dtype == "object":
                cleaned_df[col] = cleaned_df[col].astype(str).str.strip()
                # Normalize double spaces or control characters
                cleaned_df[col] = cleaned_df[col].apply(lambda x: re.sub(r'\s+', ' ', x))
                
        return cleaned_df, cleaning_log
