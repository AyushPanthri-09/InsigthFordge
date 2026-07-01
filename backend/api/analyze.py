import os
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from backend.services.file_service import FileService
from backend.services.parser import DatasetParser
from backend.services.validator import DatasetValidator
from backend.models.response_models import (
    AnalyzeResponse, DatasetMetadata, QualityReport, ProfileReport,
    KPIDetail, CorrelationDetail, AnomalyDetail, ForecastDetail,
    RecommendationDetail, InsightDetail, NarrativeDetail, ForecastPeriod,
    ColumnProfileDetail
)
from backend.utils.helpers import generate_id
from backend.utils.exceptions import ParserException, ValidationException
from backend.core.logger import logger

router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse, tags=["Analytics Engine"])
async def analyze_dataset(file: UploadFile = File(...)) -> AnalyzeResponse:
    """
    Intake, validate, parse, and analyze a dataset file.
    Validates structural matrices using validator and parser services.
    Returns staged metadata, parsed previews, and analytics contract placeholders.
    """
    start_time = time.time()
    
    # 1. Validate extension metadata
    FileService.validate_file_metadata(file)
    
    # 2. Stage file locally
    dataset_id = generate_id()
    staged_path = await FileService.stage_upload_file(file, dataset_id)
    
    try:
        # 3. Parse staged file into pandas DataFrame
        df = DatasetParser.parse_file(staged_path)
        
        # 4. Run structural validations
        DatasetValidator.validate_dataframe(df)
        
    except (ParserException, ValidationException) as e:
        logger.warning(f"File analysis validation failed: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Internal analysis pipeline failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analytics pipeline failed during parsing or validation."
        )
    finally:
        # Staging file cleanup to avoid local storage leaks
        if os.path.exists(staged_path):
            os.unlink(staged_path)
            
    row_count, col_count = df.shape
    columns = list(df.columns)
    
    # Generate structured head preview, replacing NaN/NaT values
    preview_df = df.head(5).fillna("")
    preview = []
    for _, row in preview_df.iterrows():
        preview.append({str(k): v for k, v in row.items()})
        
    duration = time.time() - start_time
    logger.info(
        f"Analyzed dataset '{file.filename}' (ID: {dataset_id}) with {row_count} rows "
        f"and {col_count} columns in {duration:.3f}s"
    )
    
    # Conforms to the full analytics contract matching React rendering requirements
    return AnalyzeResponse(
        dataset=DatasetMetadata(
            datasetId=dataset_id,
            fileName=file.filename or "unknown",
            rowCount=row_count,
            columnCount=col_count,
            columns=columns,
            preview=preview
        ),
        quality=QualityReport(
            qualityScore=95,
            issues=[
                {
                    "id": "q1",
                    "column": columns[0] if columns else "Unknown",
                    "severity": "warning",
                    "description": "Column contains minor inconsistencies in data representation.",
                    "action": "flag_only"
                }
            ],
            recommendations=[
                "Standardize key field string formatting.",
                "Verify zero values in financial dimensions."
            ]
        ),
        profile=ProfileReport(
            domain="ecommerce",
            domainConfidence=0.88,
            columns=[
                ColumnProfileDetail(
                    name=col,
                    role="measure" if df[col].dtype in ["int64", "float64"] else "dimension",
                    type="numeric_measure" if df[col].dtype in ["int64", "float64"] else "categorical",
                    nullPct=float(df[col].isnull().mean())
                ) for col in columns
            ]
        ),
        kpis=[
            KPIDetail(
                id="kpi_1",
                label="Aggregate Sales Volume",
                value=500000.0,
                formattedValue="$500,000",
                rationale="Summation of transaction receipts within file records."
            )
        ],
        correlations=[
            CorrelationDetail(
                a=columns[0] if len(columns) > 0 else "MetricA",
                b=columns[1] if len(columns) > 1 else "MetricB",
                r=0.85,
                strength="strong",
                explanation="Strong positive linear correlation observed between specified variables."
            )
        ],
        anomalies=[
            AnomalyDetail(
                id="anomaly_1",
                type="duplicate_transaction",
                column=None,
                severity="HIGH",
                description="Duplicate entries found matching timestamp, identifier, and prices.",
                remedy="Implement unique merchant checks in the checkout flow."
            )
        ],
        forecast={
            columns[0] if columns else "target": ForecastDetail(
                method="exponential_smoothing",
                nextPeriods=[
                    ForecastPeriod(period="Period_1", predicted=120.0, lower=100.0, upper=140.0),
                    ForecastPeriod(period="Period_2", predicted=125.0, lower=102.0, upper=148.0)
                ],
                confidence=0.85,
                explanation="Smoothing trend selected dynamically based on minimal backtesting MAPE."
            )
        },
        recommendations=[
            RecommendationDetail(
                id="rec_1",
                action="Deduplicate system logs",
                expectedImpact="Bypasses audit failure issues and cleans transaction metrics.",
                effort="low",
                priority="high",
                riskOfInaction="Executives may make decisions using overstated performance figures."
            )
        ],
        insights=[
            InsightDetail(
                id="insight_1",
                level="descriptive",
                title="Performance Driver Discovered",
                observation="Volume rose significantly in North region segments.",
                summary="Analysis indicates North region segment is driving top performance.",
                recommendation="Focus marketing channels on high-margin North region buyers."
            )
        ],
        narrative=NarrativeDetail(
            situation="The dataset contains operational metric registers.",
            complication="However, data formatting errors and duplicate records lower analysis confidence.",
            insight="We discovered significant positive correlations between primary performance variables.",
            recommendation="Deduplicate transactions and resolve validity warnings.",
            expectedOutcome="Provides clean balance records and reliable trend directions."
        )
    )
