import uuid
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple

from backend.core.logger import logger
from backend.services.intelligence.semantic_engine import UniversalSemanticEngine
from backend.services.intelligence.reasoning_graph import ReasoningGraph
from backend.services.intelligence.contracts import Evidence, Confidence

from backend.services.data_engineer.contracts import (
    TrustedDataset,
    QualityReport,
    QualityScore,
    Certification,
    ValidationIssue,
    CleaningDecision,
    CleaningAction,
    AuditEntry
)
from backend.services.data_engineer.validator import DataEngineerValidator
from backend.services.data_engineer.missing_value_intelligence import MissingValueIntelligence
from backend.services.data_engineer.outlier_intelligence import OutlierIntelligence
from backend.services.data_engineer.duplicate_intelligence import DuplicateIntelligence
from backend.services.data_engineer.schema_validation import SchemaValidationEngine
from backend.services.data_engineer.business_rule_discovery import BusinessRuleDiscovery
from backend.services.data_engineer.cleaner import DataEngineerCleaner
from backend.services.data_engineer.quality_scoring import QualityScoringEngine
from backend.services.data_engineer.certification import CertificationEngine
from backend.services.data_engineer.audit import AuditTrail
from backend.services.data_engineer.constraint_learning import ConstraintLearner
from backend.services.data_engineer.drift_detection import DriftDetector

class CertifiedDatasetEnvelope:
    """
    Wrapper holding both the serializable Pydantic TrustedDataset metadata
    and the live Pandas DataFrame.
    """
    def __init__(self, metadata: TrustedDataset, dataframe: pd.DataFrame):
        self.metadata = metadata
        self.dataframe = dataframe

    def to_validation_report(self) -> Dict[str, Any]:
        """
        Translates quality report issues into a format compatible with pre-existing validation reports.
        """
        issues_list = []
        for issue in self.metadata.quality_report.issues:
            issues_list.append({
                "id": issue.id,
                "column": issue.column,
                "severity": issue.severity,
                "description": issue.description,
                "action": issue.action
            })
            
        return {
            "status": self.metadata.certification.status,
            "severity": "critical" if self.metadata.certification.status == "rejected" else "medium" if self.metadata.certification.status == "warning" else "low",
            "issues": issues_list,
            "recommendations": self.metadata.quality_report.recommendations
        }

    def to_cleaning_log(self) -> List[Dict[str, Any]]:
        """
        Translates data engineer cleaning actions into pre-existing cleaner log format.
        """
        log_list = []
        for action in self.metadata.cleaning_log:
            log_list.append({
                "action": action.action_type,
                "description": action.description,
                "column": action.column,
                "count": action.rows_affected
            })
        return log_list


class AIDataEngineer:
    """
    Professional reasoning engine certifying dataset trustworthiness, validating
    semantic interpretations, applying lossless normalizations, and deferring destructive actions.
    """

    @staticmethod
    def certify_and_clean(df: pd.DataFrame, dataset_id: str = None) -> CertifiedDatasetEnvelope:
        """
        Orchestrates semantic validation, validation profiling, rule inference, cleaning, and certification.
        """
        if not dataset_id:
            dataset_id = str(uuid.uuid4())

        logger.info(f"[AIDataEngineer] Starting certification for dataset ID: {dataset_id}")
        
        # Initialize audit trail and reasoning graph
        audit_trail = AuditTrail()
        reasoning_graph = ReasoningGraph()
        
        # 1. Intake and parse with Phase 1 Universal Semantic Engine
        semantic_result = UniversalSemanticEngine.analyze(df, dataset_id=dataset_id)
        columns_metadata = semantic_result.columns.copy()
        
        # 2. Professional Validation Layer (Verify Phase 1 Semantics)
        columns_metadata = AIDataEngineer._validate_semantic_layer(df, columns_metadata, reasoning_graph)

        # 3. Structural Validation Checks
        structural_issues = DataEngineerValidator.validate_dataframe(df)
        
        # 4. Business Rule Discovery & Validation
        discovered_rules, rule_issues = BusinessRuleDiscovery.discover_and_validate(df, columns_metadata)
        ConstraintLearner.learn_constraints(dataset_id, discovered_rules)
        
        # 5. Schema Validation Checks (using metadata from Phase 1)
        schema_issues = SchemaValidationEngine.validate_schema(
            df=df,
            primary_keys=semantic_result.dataset_metadata.primary_keys,
            hierarchies=semantic_result.dataset_metadata.hierarchies,
            functional_dependencies=semantic_result.dataset_metadata.functional_dependencies
        )
        
        # Combine all issues
        all_issues = []
        all_issues.extend(structural_issues)
        all_issues.extend(rule_issues)
        all_issues.extend(schema_issues)

        # 6. Drift Detection (optional check against historic baseline if cached)
        drift_issues = DriftDetector.detect_drift(df, dataset_id)
        all_issues.extend(drift_issues)
        
        # Cache current stats for future baseline comparisons
        DriftDetector.cache_column_summaries(df, dataset_id)

        # 7. Potentially Destructive Recommendations (Deferred Decisions)
        # Missing values (imputations)
        missing_decisions = MissingValueIntelligence.analyze_missingness(df, columns_metadata)
        
        # Outliers (clippings/deletions)
        outlier_decisions = OutlierIntelligence.analyze_outliers(df)
        
        # Duplicates (row drops / spelling merges)
        duplicate_decisions = DuplicateIntelligence.analyze_duplicates(
            df=df,
            primary_keys=semantic_result.dataset_metadata.primary_keys,
            columns_metadata=columns_metadata
        )

        all_decisions = []
        all_decisions.extend(missing_decisions)
        all_decisions.extend(outlier_decisions)
        all_decisions.extend(duplicate_decisions)

        # 8. Apply Deterministic, Lossless Transformations Only
        cleaned_df, cleaning_actions = DataEngineerCleaner.clean_dataset(df, columns_metadata, audit_trail)

        # Calculate duplicate ratio for scoring
        row_count = len(df)
        dup_count = int(df.duplicated().sum())
        duplicate_ratio = dup_count / row_count if row_count > 0 else 0.0

        # 9. Compute quality scores on the cleaned dataset
        quality_score = QualityScoringEngine.compute_quality_score(cleaned_df, all_issues, duplicate_ratio)

        # 10. Generate dataset certification card
        certification = CertificationEngine.generate_certification(quality_score)

        # Prepare Recommendations strings from deferred decisions
        recommendations = []
        for decision in all_decisions:
            recommendations.append(f"[{decision.action_type.upper()} in '{decision.column or 'dataset'}'] {decision.rationale} (Confidence: {decision.confidence:.2%}, Risk: {decision.risk})")
            # Populate reasoning graph with cleaning decisions
            reasoning_graph.add_node(
                node_id=decision.decision_id,
                label=decision.action_type.title(),
                node_type="DeferredDecision",
                description=decision.rationale
            )
            reasoning_graph.add_node(
                node_id=decision.issue_id,
                label=decision.action_type.title() + " Trigger",
                node_type="IssueTrigger",
                description=f"Validation trigger for column: {decision.column}."
            )
            reasoning_graph.add_edge(decision.issue_id, decision.decision_id, "triggers")

        # Compile QualityReport
        quality_report = QualityReport(
            dataset_id=dataset_id,
            quality_score=quality_score,
            issues=all_issues,
            cleaning_decisions=all_decisions,
            recommendations=recommendations
        )

        # Compile Column Dictionary
        column_dictionary = {}
        for col in df.columns:
            meta = columns_metadata.get(col)
            if meta:
                column_dictionary[col] = {
                    "original_name": col,
                    "detected_name": meta.detected_name,
                    "business_role": meta.business_role,
                    "column_type": meta.column_type,
                    "meaning": meta.detected_meaning
                }

        # Build TrustedDataset Pydantic model
        trusted_metadata = CertificationEngine.build_trusted_dataset(
            dataset_id=dataset_id,
            df=cleaned_df,
            quality_report=quality_report,
            certification=certification,
            cleaning_log=cleaning_actions,
            audit_trail=audit_trail.get_trail(),
            column_dictionary=column_dictionary
        )

        logger.info(f"[AIDataEngineer] Certification finished. Status: {certification.status}. Trust score: {quality_score.trust_score}")
        
        return CertifiedDatasetEnvelope(metadata=trusted_metadata, dataframe=cleaned_df)

    @staticmethod
    def _validate_semantic_layer(df: pd.DataFrame, columns_metadata: Dict[str, Any], reasoning_graph: ReasoningGraph) -> Dict[str, Any]:
        """
        Professional Validation Layer.
        Audits predictions made by the Semantic Engine. If evidence contradicts,
        it downgrades the confidence score, logs the contradiction, and revises type/role.
        """
        validated_metadata = columns_metadata.copy()

        for col, meta in validated_metadata.items():
            series = df[col]
            non_null = series.dropna()
            
            # Extract statistics
            nunique = series.nunique()
            null_count = series.isnull().sum()
            
            # Default audit checks
            score = meta.confidence.score
            level = meta.confidence.level
            reasoning_steps = [meta.confidence.reasoning]
            validation_status = "valid"
            contradiction_flag = False

            # Check 1: Revenue or financial measures must be numeric
            if meta.business_role == "measure" and meta.column_type in ["numeric", "currency"]:
                # Check if it contains mostly non-numeric values
                is_numeric = np.issubdtype(series.dtype, np.number)
                if not is_numeric:
                    contradiction_flag = True
                    score = max(0.1, score - 0.5)
                    reasoning_steps.append("Contradiction: Classified as numeric/currency measure but values are non-numeric strings.")
                    # Revise classification
                    meta.business_role = "dimension"
                    meta.column_type = "categorical"
                    
                # Check 2: Check for negative values in revenue specifically
                elif "rev" in col.lower() or "sales" in col.lower():
                    neg_count = (non_null < 0).sum()
                    if neg_count > len(non_null) * 0.1: # if more than 10% are negative
                        contradiction_flag = True
                        score = max(0.3, score - 0.3)
                        reasoning_steps.append(f"Contradiction: Revenue column contains {neg_count} negative entries, which is atypical.")

            # Check 3: Unique keys cannot contain duplicate values
            elif meta.business_role == "key":
                if nunique < len(df) and null_count == 0:
                    contradiction_flag = True
                    score = max(0.2, score - 0.4)
                    reasoning_steps.append("Contradiction: Classified as primary/candidate key but column values contain duplicates.")
                    # Revise classification
                    meta.business_role = "dimension"
                    meta.column_type = "categorical"

            # Check 4: Dimensions should not be continuous high cardinality floats
            elif meta.business_role == "dimension" and meta.column_type == "categorical":
                if np.issubdtype(series.dtype, np.floating) and nunique > len(df) * 0.9:
                    contradiction_flag = True
                    score = max(0.3, score - 0.3)
                    reasoning_steps.append("Contradiction: Classified as categorical dimension but contains continuous float values.")
                    # Revise classification
                    meta.business_role = "measure"
                    meta.column_type = "numeric"

            # Record contradiction in reasoning graph if present
            if contradiction_flag:
                validation_status = "warning"
                
                # Downgrade levels
                if score >= 0.8:
                    level = "HIGH"
                elif score >= 0.5:
                    level = "MEDIUM"
                else:
                    level = "LOW"
                    
                meta.confidence.score = score
                meta.confidence.level = level
                meta.confidence.reasoning = "; ".join(reasoning_steps)
                meta.confidence.validation_status = validation_status

                # Add to reasoning graph
                node_id = f"contradiction_{col}"
                reasoning_graph.add_node(
                    node_id=node_id,
                    label="Semantic Contradiction",
                    node_type="Contradiction",
                    description=f"Evidence contradicted semantic predictions for column '{col}': {reasoning_steps[-1]}"
                )
                reasoning_graph.add_node(
                    node_id=f"col_sem_{col}",
                    label=f"Semantics for {col}",
                    node_type="ColumnSemantics",
                    description=f"Semantic role: {meta.business_role}, type: {meta.column_type}."
                )
                reasoning_graph.add_edge(node_id, f"col_sem_{col}", "refutes")

        return validated_metadata
