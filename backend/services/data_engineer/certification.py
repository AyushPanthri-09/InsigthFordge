from typing import List, Dict, Any
import pandas as pd
from datetime import datetime
from backend.services.data_engineer.contracts import Certification, QualityScore, QualityReport, TrustedDataset, ValidationIssue

class CertificationEngine:
    """
    Evaluates dataset trust metrics to assign official Certification seals.
    Compiles final TrustedDataset envelopes.
    """

    @staticmethod
    def generate_certification(quality_score: QualityScore) -> Certification:
        """
        Determines the certification status and builds a formal Explanation card.
        """
        score = quality_score.trust_score
        
        if score >= 75.0:
            status = "certified"
            explanation = f"This dataset is certified with an Excellent/Good trust rating of {score}%. Schema structures, completeness levels, and business rules are highly reliable."
        elif score >= 50.0:
            status = "warning"
            explanation = f"Certified with warnings. The dataset has moderate data quality issues (trust score: {score}%). Minor completeness or business rule contradictions detected."
        else:
            status = "rejected"
            explanation = f"Dataset rejected. Critical quality constraints violated (trust score: {score}%). Contains severe schema, integrity, or completeness failures."

        return Certification(
            status=status,
            overall_score=score,
            level=quality_score.level,
            certified_at=datetime.utcnow().isoformat() + "Z",
            auditor_name="AIDataEngineer",
            explanation=explanation
        )

    @staticmethod
    def build_trusted_dataset(
        dataset_id: str,
        df: pd.DataFrame,
        quality_report: QualityReport,
        certification: Certification,
        cleaning_log: List[Any],
        audit_trail: List[Any],
        column_dictionary: Dict[str, Dict[str, Any]]
    ) -> TrustedDataset:
        """
        Packages data metrics and structures into a TrustedDataset model.
        """
        preview_df = df.head(5).fillna("")
        preview = []
        for _, row in preview_df.iterrows():
            preview.append({str(k): v for k, v in row.items()})

        # Inject preview and metadata into the trusted dataset
        return TrustedDataset(
            dataset_id=dataset_id,
            row_count=len(df),
            column_count=len(df.columns),
            columns=list(df.columns),
            column_dictionary=column_dictionary,
            quality_report=quality_report,
            certification=certification,
            cleaning_log=cleaning_log,
            audit_trail=audit_trail
        )
