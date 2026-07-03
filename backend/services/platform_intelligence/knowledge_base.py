from backend.services.platform_intelligence.contracts import KnowledgeCatalog, ConfidenceBreakdown

class KnowledgeBaseEngine:
    """
    Houses the local knowledge catalogs, rule definitions, and business glossary parameters.
    """

    @staticmethod
    def get_catalog(dq_conf: float) -> KnowledgeCatalog:
        """
        Structures the glossary glossary and active parameters.
        """
        rules = [
            "Rule-1: Overall recommendation confidence must be >= 60% for validation approval.",
            "Rule-2: Data Quality Score must remain >= 40% to run strategic scenario simulation models.",
            "Rule-3: Actions milestones roadmap graph must represent a cycle-free Direct Acyclic Graph."
        ]

        glossary = {
            "revenue_val": "Gross transaction earnings compiled across transaction cycles.",
            "discount_pct": "Percentage rebate deduction applied on products categories.",
            "sales_val": "Cumulative unit count transaction metrics.",
            "data_quality_score": "Certified metric calculated by auditing duplicates, formats, and integrity bounds."
        }

        conf = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=1.0,
            statistical_confidence=1.0,
            business_confidence=1.0,
            overall_confidence=dq_conf
        )

        return KnowledgeCatalog(
            evidence_ids=[],
            confidence_breakdown=conf,
            reasoning_path="Constructed local Knowledge and Glossary Catalog.",
            defined_rules=rules,
            metadata_catalog={"engine_version": "v1.8.0", "deployment": "offline-local"},
            business_glossary=glossary
        )
