import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from backend.services.data_analyst.contracts import AnomalyResult, ConfidenceBreakdown
from backend.services.data_analyst.utils import AnalystUtils

class AnomalyInvestigator:
    """
    Investigates anomaly events and determines statistical attributions
    (business event, promo, operational issue) based on concurrent indicators.
    """

    @staticmethod
    def investigate_anomaly_events(
        df: pd.DataFrame,
        numeric_cols: List[str],
        dq_conf: float
    ) -> List[AnomalyResult]:
        """
        Detects dataset outliers and runs multi-variable correlation checks 
        to attribute them, defaulting to 'unknown' if no evidence is found.
        """
        results = []
        if not numeric_cols:
            return results

        target_col = numeric_cols[0]
        series = df[target_col].dropna()
        if len(series) < 10:
            return results

        # Simple IQR anomaly detection
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 2.5 * iqr  # conservative bounds
        upper_bound = q3 + 2.5 * iqr

        anomaly_indices = series[(series < lower_bound) | (series > upper_bound)].index
        
        for idx in anomaly_indices:
            row = df.loc[idx]
            val = float(row[target_col])
            
            # Investigate other columns at this index for supporting evidence
            classification = "unknown"
            explanation = "No statistically reliable explanation can be determined."
            evidence_ids = [f"ev_anomaly_{target_col}_{idx}"]
            biz_conf = 0.0

            # Rule 1: Check if there's a promo / discount column that also spiked
            promo_spikes = False
            for col in df.columns:
                if col != target_col and any(term in col.lower() for term in ["promo", "discount", "coupon"]):
                    p_val = float(row[col])
                    # If this row's promo/discount is higher than 80% of other rows
                    if p_val > df[col].quantile(0.80):
                        promo_spikes = True
                        evidence_ids.append(f"ev_anomaly_promo_link_{col}_{idx}")
                        break

            # Rule 2: Check if volume / quantity also spiked concurrently
            volume_spikes = False
            for col in df.columns:
                if col != target_col and any(term in col.lower() for term in ["qty", "quantity", "volume", "order_count"]):
                    q_val = float(row[col])
                    if q_val > df[col].quantile(0.90):
                        volume_spikes = True
                        evidence_ids.append(f"ev_anomaly_volume_link_{col}_{idx}")
                        break

            # Deduce attribution based on multiple statistical indicators
            if promo_spikes and volume_spikes:
                classification = "promo"
                explanation = f"Spike in '{target_col}' ({val:.2f}) is statistically attributed to a promotion event, supported by concurrent spikes in discount rates and order quantities."
                biz_conf = 0.90
            elif volume_spikes:
                classification = "business_event"
                explanation = f"Atypical value in '{target_col}' ({val:.2f}) occurred concurrently with an extreme volume/quantity spike, indicating a high-scale business event."
                biz_conf = 0.80
            elif any(col for col in df.columns if "error" in col.lower() or "fail" in col.lower()):
                # Check if there is an error/fail column flagged
                err_cols = [c for c in df.columns if "error" in c.lower() or "fail" in c.lower()]
                if any(str(row[c]).lower() in ["true", "1", "fail", "failed", "yes"] for c in err_cols):
                    classification = "operational"
                    explanation = f"Outlier in '{target_col}' ({val:.2f}) correlates with an operational warning flag in logging columns."
                    biz_conf = 0.85

            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=0.90,
                statistical_confidence=0.85 if classification != "unknown" else 0.0,
                business_confidence=biz_conf,
                overall_confidence=dq_conf * 0.90 * (0.85 if classification != "unknown" else 0.0) * biz_conf
            )

            results.append(AnomalyResult(
                anomaly_id=f"anom_{target_col}_{idx}",
                timestamp_or_index=str(idx),
                column=target_col,
                value=val,
                classification=classification,
                explanation=explanation,
                evidence_ids=evidence_ids,
                confidence_breakdown=conf,
                limitations=[] if classification != "unknown" else ["unexplained variance"]
            ))

        return results
