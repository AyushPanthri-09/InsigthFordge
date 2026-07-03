import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
from typing import List, Dict, Any, Tuple
from backend.services.data_analyst.contracts import ForecastResult, ConfidenceBreakdown
from backend.services.data_analyst.utils import AnalystUtils

class ForecastingEngine:
    """
    Fits Exponential Smoothing (Holt-Winters) or ARIMA models to historical
    sequences and projects future values with 95% confidence bands.
    """

    @staticmethod
    def generate_forecast(
        df: pd.DataFrame,
        numerical_col: str,
        date_col: str,
        dq_conf: float
    ) -> List[ForecastResult]:
        """
        Validates historical length, fits Holt-Winters or ARIMA models,
        and returns future predictions.
        """
        results = []
        ev_id = f"ev_forecast_{numerical_col}_{date_col}"
        
        # Preprocess and group
        df_temp = df[[date_col, numerical_col]].dropna().copy()
        df_temp[date_col] = pd.to_datetime(df_temp[date_col])
        series = df_temp.groupby(date_col)[numerical_col].mean().sort_index()
        
        n = len(series)
        limits = []
        if n < 14:
            limits.append("small sample size")
            return results  # Not appropriate to forecast

        # Determine model
        try:
            # Try Holt-Winters Exponential Smoothing
            # Projections for 5 periods ahead
            steps = 5
            
            # Use additive trend; try to infer seasonal period if n is large enough
            seasonal_periods = 7 if n >= 21 else None
            seasonal_type = "add" if seasonal_periods else None
            
            model = ExponentialSmoothing(
                series,
                trend="add",
                seasonal=seasonal_type,
                seasonal_periods=seasonal_periods
            )
            fit_model = model.fit()
            forecast = fit_model.forecast(steps=steps)
            
            # Calculate fit statistics on historical
            in_sample_preds = fit_model.fittedvalues
            residuals = series - in_sample_preds
            mse = float((residuals ** 2).mean())
            
            # Simple R-squared
            y_mean = series.mean()
            ss_tot = ((series - y_mean) ** 2).sum()
            ss_res = (residuals ** 2).sum()
            r_sq = float(1.0 - (ss_res / ss_tot)) if ss_tot > 0 else 0.0
            
            # Calculate standard error of residuals to build 95% confidence intervals
            std_err = float(residuals.std())
            z_score = 1.96  # 95% confidence
            
            forecast_list = [float(x) for x in forecast.tolist()]
            lower_list = [float(x - z_score * std_err) for x in forecast_list]
            upper_list = [float(x + z_score * std_err) for x in forecast_list]

            # Confidence Breakdown
            fit_quality = max(0.0, min(1.0, r_sq)) if r_sq > 0 else 0.5
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.9,
                statistical_confidence=fit_quality,
                business_confidence=0.8,
                overall_confidence=dq_conf * 0.9 * fit_quality * 0.8
            )

            assumptions = [
                "Residual errors are independent and identically distributed.",
                "Historical trend patterns will continue linearly into the future."
            ]

            results.append(ForecastResult(
                evidence_ids=[ev_id],
                confidence_breakdown=conf,
                limitations=limits,
                reasoning_path=f"Fitted statsmodels ExponentialSmoothing (Holt-Winters) model on '{numerical_col}' by '{date_col}'",
                column=numerical_col,
                forecast_values=forecast_list,
                confidence_interval_lower=lower_list,
                confidence_interval_upper=upper_list,
                r_squared=r_sq,
                mse=mse,
                assumptions=assumptions
            ))

        except Exception:
            # Fall back to simple ARIMA(1,1,0)
            try:
                model = ARIMA(series, order=(1, 1, 0))
                fit_model = model.fit()
                forecast_res = fit_model.get_forecast(steps=5)
                forecast = forecast_res.predicted_mean
                ci = forecast_res.conf_int(alpha=0.05) # 95% CI
                
                in_sample_preds = fit_model.fittedvalues
                residuals = series - in_sample_preds
                mse = float((residuals ** 2).mean())
                r_sq = 0.5 # default moderate fit score for simple model fallback

                forecast_list = [float(x) for x in forecast.tolist()]
                lower_list = [float(x) for x in ci.iloc[:, 0].tolist()]
                upper_list = [float(x) for x in ci.iloc[:, 1].tolist()]

                conf = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=0.9,
                    statistical_confidence=0.5,
                    business_confidence=0.7,
                    overall_confidence=dq_conf * 0.9 * 0.5 * 0.7
                )

                results.append(ForecastResult(
                    evidence_ids=[ev_id],
                    confidence_breakdown=conf,
                    limitations=limits + ["fallback ARIMA model fitted"],
                    reasoning_path="Fitted fallback ARIMA(1,1,0) model",
                    column=numerical_col,
                    forecast_values=forecast_list,
                    confidence_interval_lower=lower_list,
                    confidence_interval_upper=upper_list,
                    r_squared=r_sq,
                    mse=mse,
                    assumptions=["Residuals are normal white noise."]
                ))
            except Exception:
                pass # Return empty if both models fail

        return results
