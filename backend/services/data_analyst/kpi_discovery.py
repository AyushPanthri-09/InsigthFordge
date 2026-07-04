import pandas as pd
from typing import List, Dict, Any, Tuple
from backend.services.data_analyst.contracts import KPIDefinition, KPIResult, ConfidenceBreakdown
from backend.services.data_engineer.contracts import TrustedDataset

class KPIDiscoveryEngine:
    """
    Infers the business domain of a dataset and automatically discovers,
    defines, and calculates domain-specific Key Performance Indicators (KPIs).
    """

    @staticmethod
    def discover_and_compute_kpis(
        trusted_dataset: TrustedDataset,
        df: pd.DataFrame,
        base_confidence: Dict[str, Any]
    ) -> Tuple[List[KPIDefinition], List[KPIResult]]:
        """
        Infers the dataset domain, dynamically discovers KPIs, evaluates values,
        and sets up their evidence chains.
        """
        kpi_definitions = []
        kpi_results = []
        
        # 1. Infer Business Domain
        domain = KPIDiscoveryEngine._infer_domain(trusted_dataset)
        dq_conf = base_confidence.get("data_quality_confidence", 1.0)
        col_limitations = base_confidence.get("column_limitations", {})

        # 2. Determine and calculate KPIs by domain
        if domain == "Retail":
            kpi_definitions, kpi_results = KPIDiscoveryEngine._build_retail_kpis(
                df, trusted_dataset, dq_conf, col_limitations
            )
        elif domain == "HR":
            kpi_definitions, kpi_results = KPIDiscoveryEngine._build_hr_kpis(
                df, trusted_dataset, dq_conf, col_limitations
            )
        elif domain == "Healthcare":
            kpi_definitions, kpi_results = KPIDiscoveryEngine._build_healthcare_kpis(
                df, trusted_dataset, dq_conf, col_limitations
            )
        else: # Default/Manufacturing
            kpi_definitions, kpi_results = KPIDiscoveryEngine._build_manufacturing_kpis(
                df, trusted_dataset, dq_conf, col_limitations
            )

        return kpi_definitions, kpi_results

    @staticmethod
    def _infer_domain(trusted_dataset: TrustedDataset) -> str:
        """Heuristically infers the dataset domain from column names and dictionary."""
        col_names = [col.lower() for col in trusted_dataset.column_dictionary.keys()]
        
        # Check Healthcare
        if any(any(term in col for col in col_names) for term in ["patient", "readmission", "stay", "diagnosis", "hospital"]):
            return "Healthcare"
        
        # Check HR
        if any(any(term in col for col in col_names) for term in ["employee", "salary", "attrition", "tenure", "hr"]):
            return "HR"

        # Check Manufacturing
        if any(any(term in col for col in col_names) for term in ["machine", "defect", "yield", "downtime", "sensor"]):
            return "Manufacturing"

        # Default is Retail/Sales
        return "Retail"

    @staticmethod
    def _build_retail_kpis(
        df: pd.DataFrame,
        trusted_dataset: TrustedDataset,
        dq_conf: float,
        col_limitations: Dict[str, List[str]]
    ) -> Tuple[List[KPIDefinition], List[KPIResult]]:
        defs = []
        res = []
        
        # Find numeric revenue/price/amount column
        revenue_col = None
        rev_sem_conf = 1.0
        for col, meta in trusted_dataset.column_dictionary.items():
            if meta["business_role"] == "measure" and meta["column_type"] in ["numeric", "currency"]:
                if any(term in col.lower() for term in ["revenue", "sales", "price", "amount", "revenue_val"]):
                    revenue_col = col
                    break
        
        # 1. Total Revenue KPI
        if revenue_col:
            sem_conf = 0.90 # high confidence heuristic
            if sem_conf >= 0.65: # check threshold
                ev_id = f"ev_kpi_total_revenue_{revenue_col}"
                limits = col_limitations.get(revenue_col, [])
                
                conf = ConfidenceBreakdown(
                    data_quality_confidence=dq_conf,
                    semantic_confidence=sem_conf,
                    statistical_confidence=1.0,
                    business_confidence=1.0,
                    overall_confidence=dq_conf * sem_conf
                )

                defs.append(KPIDefinition(
                    evidence_ids=[ev_id],
                    confidence_breakdown=conf,
                    limitations=limits,
                    reasoning_path=f"Total Revenue discovered mapping financial measures of '{revenue_col}'",
                    name="Total Revenue",
                    definition="The aggregate monetary value generated from sales operations.",
                    formula="SUM(Revenue)",
                    business_meaning="Core financial performance indicator representing gross business scale."
                ))

                total_rev = float(df[revenue_col].sum())
                res.append(KPIResult(
                    evidence_ids=[ev_id],
                    confidence_breakdown=conf,
                    limitations=limits,
                    reasoning_path=f"Calculated sum on column '{revenue_col}'",
                    kpi_name="Total Revenue",
                    current_value=total_rev,
                    historical_values=[float(x) for x in df[revenue_col].head(10).tolist()],
                    dimensions_breakdown={}
                ))

        # 2. Total Orders (Record Count)
        ev_id_ord = "ev_kpi_total_orders"
        conf_ord = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.95,
            statistical_confidence=1.0,
            business_confidence=1.0,
            overall_confidence=dq_conf * 0.95
        )

        defs.append(KPIDefinition(
            evidence_ids=[ev_id_ord],
            confidence_breakdown=conf_ord,
            reasoning_path="Discovered orders/transaction count based on row frequency count.",
            name="Total Orders",
            definition="The overall count of distinct orders or transactions.",
            formula="COUNT(Rows)",
            business_meaning="Tracks transaction volumes and business activity throughput."
        ))

        res.append(KPIResult(
            evidence_ids=[ev_id_ord],
            confidence_breakdown=conf_ord,
            reasoning_path="Computed record count on cleaned DataFrame.",
            kpi_name="Total Orders",
            current_value=float(len(df)),
            historical_values=[],
            dimensions_breakdown={}
        ))

        return defs, res

    @staticmethod
    def _build_hr_kpis(
        df: pd.DataFrame,
        trusted_dataset: TrustedDataset,
        dq_conf: float,
        col_limitations: Dict[str, List[str]]
    ) -> Tuple[List[KPIDefinition], List[KPIResult]]:
        defs = []
        res = []
        
        salary_col = None
        for col in trusted_dataset.column_dictionary.keys():
            if any(term in col.lower() for term in ["salary", "pay", "compensation"]):
                salary_col = col
                break
                
        if salary_col:
            sem_conf = 0.90
            ev_id = f"ev_kpi_avg_salary_{salary_col}"
            limits = col_limitations.get(salary_col, [])
            
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=sem_conf,
                statistical_confidence=1.0,
                business_confidence=1.0,
                overall_confidence=dq_conf * sem_conf
            )

            defs.append(KPIDefinition(
                evidence_ids=[ev_id],
                confidence_breakdown=conf,
                limitations=limits,
                reasoning_path=f"Average Salary discovered using numerical column '{salary_col}'",
                name="Average Salary",
                definition="The arithmetic mean of compensation values among employees.",
                formula="MEAN(Salary)",
                business_meaning="Represents core business overhead and market pricing benchmarks."
            ))

            avg_sal = float(df[salary_col].mean())
            res.append(KPIResult(
                evidence_ids=[ev_id],
                confidence_breakdown=conf,
                limitations=limits,
                reasoning_path=f"Calculated average value on '{salary_col}'",
                kpi_name="Average Salary",
                current_value=avg_sal,
                historical_values=[],
                dimensions_breakdown={}
            ))
            
        # Attrition Rate or Headcount default
        ev_id_hc = "ev_kpi_headcount"
        conf_hc = ConfidenceBreakdown(
            data_quality_confidence=dq_conf,
            semantic_confidence=0.95,
            statistical_confidence=1.0,
            business_confidence=1.0,
            overall_confidence=dq_conf * 0.95
        )
        defs.append(KPIDefinition(
            evidence_ids=[ev_id_hc],
            confidence_breakdown=conf_hc,
            reasoning_path="Headcount tracking derived from unique record count.",
            name="Headcount",
            definition="The size of the active workforce.",
            formula="COUNT(Employees)",
            business_meaning="Evaluates staffing size and workforce capacity."
        ))
        res.append(KPIResult(
            evidence_ids=[ev_id_hc],
            confidence_breakdown=conf_hc,
            reasoning_path="Computed record count on HR registry data.",
            kpi_name="Headcount",
            current_value=float(len(df)),
            historical_values=[],
            dimensions_breakdown={}
        ))
        
        return defs, res

    @staticmethod
    def _build_healthcare_kpis(
        df: pd.DataFrame,
        trusted_dataset: TrustedDataset,
        dq_conf: float,
        col_limitations: Dict[str, List[str]]
    ) -> Tuple[List[KPIDefinition], List[KPIResult]]:
        defs = []
        res = []
        
        stay_col = None
        for col in df.columns:
            if any(term in col.lower() for term in ["stay", "los", "length_of_stay", "duration"]):
                stay_col = col
                break
                
        if stay_col:
            sem_conf = 0.85
            ev_id = f"ev_kpi_avg_stay_{stay_col}"
            limits = col_limitations.get(stay_col, [])
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=sem_conf,
                statistical_confidence=1.0,
                business_confidence=1.0,
                overall_confidence=dq_conf * sem_conf
            )
            defs.append(KPIDefinition(
                evidence_ids=[ev_id],
                confidence_breakdown=conf,
                limitations=limits,
                reasoning_path=f"Average stay duration discovered using metric '{stay_col}'",
                name="Average Length of Stay",
                definition="The mean duration patients spend in the inpatient setting.",
                formula="MEAN(StayDuration)",
                business_meaning="Measures clinical efficiency, resource utilization, and care delivery speed."
            ))
            avg_stay = float(df[stay_col].mean())
            res.append(KPIResult(
                evidence_ids=[ev_id],
                confidence_breakdown=conf,
                limitations=limits,
                reasoning_path=f"Calculated average value on '{stay_col}'",
                kpi_name="Average Length of Stay",
                current_value=avg_stay,
                historical_values=[],
                dimensions_breakdown={}
            ))
            
        return defs, res

    @staticmethod
    def _build_manufacturing_kpis(
        df: pd.DataFrame,
        trusted_dataset: TrustedDataset,
        dq_conf: float,
        col_limitations: Dict[str, List[str]]
    ) -> Tuple[List[KPIDefinition], List[KPIResult]]:
        defs = []
        res = []
        
        defect_col = None
        for col in df.columns:
            if any(term in col.lower() for term in ["defect", "error", "fault", "scrap"]):
                defect_col = col
                break
                
        if defect_col:
            sem_conf = 0.90
            ev_id = f"ev_kpi_defect_rate_{defect_col}"
            limits = col_limitations.get(defect_col, [])
            conf = ConfidenceBreakdown(
                data_quality_confidence=dq_conf,
                semantic_confidence=sem_conf,
                statistical_confidence=1.0,
                business_confidence=1.0,
                overall_confidence=dq_conf * sem_conf
            )
            defs.append(KPIDefinition(
                evidence_ids=[ev_id],
                confidence_breakdown=conf,
                limitations=limits,
                reasoning_path=f"Defect rate discovered mapping binary failures on '{defect_col}'",
                name="Defect Rate",
                definition="The proportion of produced items carrying quality defects.",
                formula="MEAN(Defects)",
                business_meaning="Tracks production quality control and machinery calibration health."
            ))
            
            # Compute defect mean
            defect_vals = df[defect_col]
            if defect_vals.dtype == "bool":
                defect_rate = float(defect_vals.mean())
            else:
                defect_rate = float(pd.to_numeric(defect_vals, errors="coerce").fillna(0).mean())
                
            res.append(KPIResult(
                evidence_ids=[ev_id],
                confidence_breakdown=conf,
                limitations=limits,
                reasoning_path=f"Calculated mean defect ratio on '{defect_col}'",
                kpi_name="Defect Rate",
                current_value=defect_rate,
                historical_values=[],
                dimensions_breakdown={}
            ))
            
        return defs, res
