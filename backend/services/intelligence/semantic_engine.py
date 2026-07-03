import pandas as pd
import uuid
from typing import Dict, List, Any, Tuple
from datetime import datetime

from backend.core.logger import logger
from backend.services.intelligence.contracts import (
    SemanticResult,
    DatasetMetadata,
    ColumnMetadata,
    BusinessDomain,
    Metric,
    Dimension,
    BusinessEntity,
)
from backend.services.intelligence.config import DOMAIN_RULES
from backend.services.intelligence.ontology import OntologyManager
from backend.services.intelligence.confidence_engine import ConfidenceEngine
from backend.services.intelligence.evidence import EvidenceFactory
from backend.services.intelligence.schema_understanding import SchemaUnderstandingEngine
from backend.services.intelligence.entity_detector import EntityDetector
from backend.services.intelligence.metric_discovery import MetricDiscoverer
from backend.services.intelligence.dimension_discovery import DimensionDiscoverer
from backend.services.intelligence.grain_detector import GrainDetector
from backend.services.intelligence.reasoning_graph import ReasoningGraph
from backend.services.intelligence.memory import SharedProjectMemory
from backend.services.intelligence.utils import execution_timer

class UniversalSemanticEngine:
    """
    Orchestration engine that performs semantic understanding of raw datasets.
    Infers business domain, columns classification, metrics/dimensions,
    entities, row grain, relationships, and populates project memory.
    """

    @staticmethod
    @execution_timer("UniversalSemanticEngine.analyze")
    def analyze(df: pd.DataFrame, dataset_id: str = None) -> SemanticResult:
        """
        Analyzes a pandas DataFrame and returns a comprehensive SemanticResult.
        """
        # Ensure a valid dataset_id is present
        if not dataset_id:
            dataset_id = str(uuid.uuid4())

        row_count, col_count = df.shape
        logger.info(f"Starting semantic analysis for dataset ID: {dataset_id} ({row_count} rows, {col_count} columns)")

        # 1. Column Classification
        columns_metadata = UniversalSemanticEngine._classify_columns(df)

        # 2. Schema Understanding
        schema_info = SchemaUnderstandingEngine.analyze_schema(df)

        # 3. Domain Detection
        domains = UniversalSemanticEngine._detect_domains(df)

        # 4. Entity Detection
        entities = EntityDetector.detect_entities(df, columns_metadata)

        # 5. Metric and Dimension Discovery
        metrics = MetricDiscoverer.discover_metrics(df, columns_metadata)
        dimensions = DimensionDiscoverer.discover_dimensions(df, columns_metadata)

        # 6. Grain Detection
        grain, grain_confidence = GrainDetector.detect_grain(
            df=df,
            primary_keys=schema_info["primary_keys"],
            candidate_keys=schema_info["candidate_keys"],
            entities=entities,
            columns_metadata=columns_metadata
        )

        # Build DatasetMetadata
        dataset_metadata = DatasetMetadata(
            row_count=row_count,
            col_count=col_count,
            grain=grain,
            grain_confidence=grain_confidence,
            primary_keys=schema_info["primary_keys"],
            candidate_keys=schema_info["candidate_keys"],
            foreign_keys=schema_info["foreign_keys"],
            relationships=schema_info["relationships"],
            hierarchies=schema_info["hierarchies"],
            unique_constraints=schema_info["unique_constraints"],
            duplicate_ratio=schema_info["duplicate_ratio"],
            functional_dependencies=schema_info["functional_dependencies"]
        )

        # Compile final SemanticResult
        result = SemanticResult(
            dataset_metadata=dataset_metadata,
            columns=columns_metadata,
            domains=domains,
            metrics=metrics,
            dimensions=dimensions,
            entities=entities,
            memory_ref_id=dataset_id
        )

        # 7. Store in Shared Memory
        SharedProjectMemory().set_semantic_result(dataset_id, result)
        
        # Populate custom metadata in memory
        SharedProjectMemory().set_metadata(dataset_id, "analyzed_at", datetime.utcnow().isoformat() + "Z")
        SharedProjectMemory().set_metadata(dataset_id, "primary_domain", domains[0].domain if domains else "Generic")

        logger.info(f"Semantic analysis completed successfully for dataset ID: {dataset_id}")
        return result

    @staticmethod
    def _classify_columns(df: pd.DataFrame) -> Dict[str, ColumnMetadata]:
        """
        Classifies each column in the DataFrame into types and business roles.
        """
        columns_metadata = {}
        row_count = len(df)
        
        for col in df.columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            null_pct = null_count / row_count if row_count > 0 else 0.0
            nunique = series.nunique()
            
            # Basic type detection
            original_type = str(series.dtype)
            
            # Map canonical concept
            concept = OntologyManager.resolve_concept(str(col))
            normalized_name = OntologyManager.normalize_name(str(col))
            description = OntologyManager.get_description_for_column(str(col), concept)

            # Determine Column Type & Business Role
            col_type = "categorical"
            business_role = "dimension"
            possible_alternatives = []
            score = 0.60
            reasoning_steps = ["Identified default type/role mapping."]

            if pd.api.types.is_datetime64_any_dtype(series) or isinstance(series.dtype, pd.DatetimeTZDtype):
                col_type = "temporal"
                business_role = "dimension"
                score = 0.90
                reasoning_steps = ["System date/datetime data type detected."]
                possible_alternatives = ["key"]
            elif pd.api.types.is_numeric_dtype(series):
                # Is it an identifier?
                if nunique == row_count and pd.api.types.is_integer_dtype(series):
                    col_type = "identifier"
                    business_role = "key"
                    score = 0.90
                    reasoning_steps = ["Integer type with 100% uniqueness."]
                    possible_alternatives = ["measure"]
                elif nunique <= 2 and null_pct < 0.2:
                    # Likely boolean/flag
                    col_type = "boolean"
                    business_role = "status"
                    score = 0.80
                    reasoning_steps = ["Numeric column containing binary (0/1) states."]
                    possible_alternatives = ["dimension"]
                elif nunique / row_count < 0.05 and nunique < 15:
                    col_type = "categorical"
                    business_role = "dimension"
                    score = 0.70
                    reasoning_steps = ["Low cardinality numeric values typical of categoric coding."]
                    possible_alternatives = ["measure", "code"]
                else:
                    col_type = "numeric"
                    business_role = "measure"
                    score = 0.75
                    reasoning_steps = ["High cardinality continuous numeric scale."]
                    
                    # Fine tune if name implies specific measure roles
                    col_lower = str(col).lower()
                    if "pct" in col_lower or "rate" in col_lower or "ratio" in col_lower:
                        business_role = "percentage"
                        score = 0.85
                        reasoning_steps.append("Name pattern matches rate/percentage.")
                    elif any(c in col_lower for c in ["amt", "price", "revenue", "cost", "spend"]):
                        col_type = "currency"
                        score = 0.85
                        reasoning_steps.append("Name matches financial monetary concept.")
                    possible_alternatives = ["dimension"]
            else:
                # String / object / boolean object type
                # Check if categorical values are boolean indicators
                non_null_clean = {str(x).strip().lower() for x in series.dropna()}
                boolean_indicators = {"yes", "no", "y", "n", "true", "false", "1", "0", "active", "inactive", "enabled", "disabled"}
                if non_null_clean and non_null_clean.issubset(boolean_indicators):
                    col_type = "boolean"
                    business_role = "status"
                    score = 0.90
                    reasoning_steps = ["Categorical values match boolean indicators."]
                    possible_alternatives = ["dimension"]
                else:
                    # Try parsing as datetime for temporal verification
                    try:
                        non_null_series = series.dropna()
                        if len(non_null_series) > 0 and pd.to_datetime(non_null_series.head(10), format='mixed', errors="coerce").notnull().all():
                            col_type = "temporal"
                            business_role = "dimension"
                            score = 0.80
                            reasoning_steps = ["Strings parsed successfully as temporal timestamps."]
                            possible_alternatives = ["dimension"]
                    except Exception:
                        pass

                # If still not classified as temporal or boolean
                if col_type not in ["temporal", "boolean"]:
                    # Check unique identifiers
                    if nunique == row_count:
                        col_type = "identifier"
                        business_role = "key"
                        score = 0.85
                        reasoning_steps = ["Text series with 100% uniqueness."]
                        possible_alternatives = ["dimension"]
                    else:
                        col_type = "categorical"
                        business_role = "dimension"
                        
                        col_lower = str(col).lower()
                        # Location mapping
                        if any(l in col_lower for l in ["country", "state", "city", "region", "zip", "address"]):
                            business_role = "location"
                            col_type = "geolocation"
                            score = 0.80
                            reasoning_steps = ["Geographic naming pattern matching location roles."]
                        # Code mapping
                        elif col_lower.endswith("code") or col_lower.endswith("cd"):
                            business_role = "code"
                            score = 0.80
                            reasoning_steps = ["Name ends with code suffix."]
                            possible_alternatives = ["dimension"]
                        # Status mapping
                        elif any(s in col_lower for s in ["status", "state", "phase", "stage"]):
                            business_role = "status"
                            score = 0.80
                            reasoning_steps = ["Name indicates state/status phase tracker."]
                            possible_alternatives = ["dimension"]
                        else:
                            possible_alternatives = ["code", "key"]

            # Boost confidence score if naming maps to canonical concept in ontology
            if concept != "generic":
                score = min(1.0, score + 0.15)
                reasoning_steps.append(f"Canonical ontology concept match: '{concept}'.")

            # Penalize confidence if there is high null ratio
            if null_pct > 0.4:
                score = max(0.2, score - 0.20)
                reasoning_steps.append(f"High missing values penalty: {null_pct:.1%}.")

            # Assemble Evidence
            evidence = EvidenceFactory.create_evidence(
                source="Profile",
                description=f"Classified column '{col}' as business role '{business_role}' using profile features.",
                confidence=score,
                supporting_columns=[str(col)],
                supporting_statistics={
                    "original_type": original_type,
                    "uniqueness_pct": nunique / row_count if row_count > 0 else 0.0,
                    "null_pct": null_pct,
                    "canonical_concept": concept
                }
            )

            confidence = ConfidenceEngine.compute_confidence(
                score=score,
                reasoning="; ".join(reasoning_steps),
                evidence=[evidence]
            )

            columns_metadata[str(col)] = ColumnMetadata(
                original_name=str(col),
                detected_name=normalized_name,
                detected_meaning=description,
                column_type=col_type,
                business_role=business_role,
                confidence=confidence,
                possible_alternatives=possible_alternatives
            )

        return columns_metadata

    @staticmethod
    def _detect_domains(df: pd.DataFrame) -> List[BusinessDomain]:
        """
        Infers the business domain of the dataset by evaluating column vocabulary.
        """
        domain_scores = []
        col_names_lower = [str(c).lower() for c in df.columns]
        
        # Evaluate matches for each domain rule
        for domain, rules in DOMAIN_RULES.items():
            keywords = rules["keywords"]
            min_matches = rules.get("min_matches", 1)
            
            # Count how many keywords appear as substrings in column names
            matched_keywords = []
            for kw in keywords:
                for col in col_names_lower:
                    if kw in col:
                        matched_keywords.append(kw)
                        break
                        
            matches = len(matched_keywords)
            
            if matches >= min_matches:
                # Compute score: base score of 0.4 + matches boost
                score = 0.4 + min(0.5, matches * 0.1)
                
                # Check for ID columns matches (e.g. 'patient_id' inside Healthcare gives a boost)
                for col in col_names_lower:
                    if col.endswith("_id") or col.endswith("id"):
                        prefix = col.split("_")[0]
                        if prefix in keywords:
                            score = min(1.0, score + 0.1)
                            
                evidence = EvidenceFactory.create_evidence(
                    source="Heuristic",
                    description=f"Matched columns to domain keywords: {matched_keywords}.",
                    confidence=score,
                    supporting_statistics={
                        "matched_keywords": matched_keywords,
                        "matches_count": matches
                    }
                )
                
                confidence = ConfidenceEngine.compute_confidence(
                    score=score,
                    reasoning=f"Found {matches} matching keyword markers in column vocabulary.",
                    evidence=[evidence]
                )
                
                domain_scores.append(BusinessDomain(
                    domain=domain,
                    confidence=confidence
                ))

        # Sort by confidence score descending
        domain_scores.sort(key=lambda x: x.confidence.score, reverse=True)
        
        # Fallback to Generic if no domains met rules
        if not domain_scores:
            evidence = EvidenceFactory.create_evidence(
                source="Heuristic",
                description="No specific domain keywords matched the columns.",
                confidence=0.5
            )
            confidence = ConfidenceEngine.compute_confidence(
                score=0.5,
                reasoning="Generic fallback since no column patterns matched specialized domain vocabularies.",
                evidence=[evidence]
            )
            domain_scores.append(BusinessDomain(
                domain="Generic",
                confidence=confidence
            ))
            
        return domain_scores
