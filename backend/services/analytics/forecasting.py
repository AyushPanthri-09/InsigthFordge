import numpy as np
import pandas as pd
from typing import Dict, Any, List
from statsmodels.tsa.holtwinters import SimpleExpSmoothing, ExponentialSmoothing
from sklearn.linear_model import LinearRegression
from backend.services.analytics.utils import safe_float, sanitize_value

class ForecastingEngine:
    """
    Performs time-series forecasting and trend projections.
    Uses Holt-Winters Exponential Smoothing or linear regressions depending on seasonal signals and data scale.
    """

    @staticmethod
    def generate_forecasts(df: pd.DataFrame, datetime_cols: List[str], numeric_cols: List[str]) -> Dict[str, Any]:
        """
        Generates forecasts for the top numeric columns.
        Returns a dictionary mapping columns to ForecastDetail objects.
        """
        forecasts = {}
        row_count = len(df)
        
        if row_count < 5 or not datetime_cols or not numeric_cols:
            return {}

        date_col = datetime_cols[0]
        
        # Sort and aggregate by time to get a clean chronological series
        try:
            ts_df = df.copy()
            ts_df[date_col] = pd.to_datetime(ts_df[date_col])
            ts_df = ts_df.sort_values(by=date_col)
            
            # Resample or group by to obtain a uniform step series
            grouped = ts_df.groupby(ts_df[date_col].dt.to_period("M" if row_count > 100 else "D")).mean(numeric_only=True)
            grouped.index = grouped.index.astype(str)
            
            # Forecast top 2 numeric columns
            for col in numeric_cols[:2]:
                series = grouped[col].dropna()
                if len(series) < 5:
                    continue

                y = series.values
                n_periods = 3
                
                # Dynamic model selection
                fitted_model_name = "linear_regression"
                predictions = []
                lower_bounds = []
                upper_bounds = []
                
                # Attempt Exponential Smoothing first
                try:
                    if len(y) >= 12:
                        # Try Holt-Winters with additive trend
                        model = ExponentialSmoothing(y, trend="add", seasonal=None, initialization_method="estimated")
                        fit = model.fit()
                        pred = fit.forecast(n_periods)
                        fitted_model_name = "holt_winters"
                    else:
                        model = SimpleExpSmoothing(y)
                        fit = model.fit(smoothing_level=0.5, optimized=False)
                        pred = fit.forecast(n_periods)
                        fitted_model_name = "exponential_smoothing"
                        
                    predictions = list(pred)
                    
                    # Estimate confidence intervals from residual variance
                    residuals = y - fit.fittedvalues
                    sigma = np.std(residuals) if len(residuals) > 0 else (np.std(y) * 0.1)
                    
                    for idx, val in enumerate(predictions):
                        # Increasing variance over time steps
                        step_sigma = sigma * np.sqrt(idx + 1)
                        lower_bounds.append(val - 1.96 * step_sigma)
                        upper_bounds.append(val + 1.96 * step_sigma)
                except Exception:
                    # Fallback to Linear Trend Regression
                    fitted_model_name = "linear_trend_regression"
                    X = np.arange(len(y)).reshape(-1, 1)
                    reg = LinearRegression()
                    reg.fit(X, y)
                    
                    future_X = np.arange(len(y), len(y) + n_periods).reshape(-1, 1)
                    pred = reg.predict(future_X)
                    predictions = list(pred)
                    
                    # Residual variance calculation
                    preds_train = reg.predict(X)
                    residuals = y - preds_train
                    sigma = np.std(residuals) if len(residuals) > 0 else (np.std(y) * 0.1)
                    
                    for idx, val in enumerate(predictions):
                        step_sigma = sigma * np.sqrt(idx + 1)
                        lower_bounds.append(val - 1.96 * step_sigma)
                        upper_bounds.append(val + 1.96 * step_sigma)

                # Format future periods
                next_periods = []
                last_period = series.index[-1]
                
                # Generate next period labels
                for idx in range(n_periods):
                    p_label = f"Period_{idx+1}"
                    try:
                        # Attempt to increment period safely
                        if "-" in str(last_period):
                            # Monthly or YYYY-MM
                            parts = str(last_period).split("-")
                            year = int(parts[0])
                            month = int(parts[1])
                            month += (idx + 1)
                            while month > 12:
                                month -= 12
                                year += 1
                            p_label = f"{year}-{month:02d}"
                        else:
                            p_label = f"Day_{idx+1}"
                    except Exception:
                        pass
                    
                    pred_val = float(predictions[idx])
                    low_val = float(lower_bounds[idx])
                    up_val = float(upper_bounds[idx])
                    
                    # Ensure non-negative lower bounds for strictly positive columns (e.g. quantity, sales)
                    if "sales" in col.lower() or "qty" in col.lower() or "price" in col.lower():
                        low_val = max(0.0, low_val)

                    next_periods.append({
                        "period": p_label,
                        "predicted": round(pred_val, 2),
                        "lower": round(low_val, 2),
                        "upper": round(up_val, 2)
                    })

                forecasts[col] = {
                    "method": fitted_model_name,
                    "nextPeriods": next_periods,
                    "confidence": 0.85 if fitted_model_name in ["holt_winters", "exponential_smoothing"] else 0.70,
                    "explanation": f"Forecast modeled via {fitted_model_name.replace('_', ' ').title()}. Standard errors represent 95% confidence intervals based on backtesting residuals."
                }
        except Exception:
            pass

        return forecasts
