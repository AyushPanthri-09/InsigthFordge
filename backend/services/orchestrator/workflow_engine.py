import time
import logging
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional

from backend.services.orchestrator.contracts import (
    WorkflowContext,
    ExecutionStage,
    PipelineExecution,
    OrchestratorResult
)
from backend.services.orchestrator.execution_context import ExecutionContextManager
from backend.services.orchestrator.checkpoint_manager import CheckpointManager
from backend.services.orchestrator.retry_manager import RetryManager
from backend.services.orchestrator.progress_tracker import ProgressTracker
from backend.services.orchestrator.event_bus import EventBus
from backend.services.orchestrator.resource_manager import ResourceManager
from backend.services.orchestrator.health_monitor import HealthMonitor
from backend.services.orchestrator.reasoning import OrchestrationReasoningEngine
from backend.services.orchestrator.validation import OrchestratorValidator
from backend.services.intelligence.memory import SharedProjectMemory

logger = logging.getLogger(__name__)

class WorkflowEngine:
    """
    Executes stages in dependency sequence, handling retries, checkpoint resumes,
    and thread-safe progress updates.
    """

    @staticmethod
    def execute_workflow(
        dataset_id: str,
        df: pd.DataFrame
    ) -> OrchestratorResult:
        """
        Coordinates full 6-phase pipeline execution with safety fallbacks.
        """
        logger.info(f"[WorkflowEngine] Starting pipeline execution for dataset: {dataset_id}")
        
        # 1. Initialize EventBus, ProgressTracker and Context
        bus = EventBus()
        tracker = ProgressTracker(dataset_id)
        context = ExecutionContextManager.create_context(dataset_id)
        bus.publish("WorkflowStarted", context.model_dump(), dataset_id)

        # 2. Build Pipeline Stages
        stages = [
            ExecutionStage(stage_id="Semantic", name="Semantic Intelligence", dependencies=[]),
            ExecutionStage(stage_id="Data Engineer", name="AI Data Engineer", dependencies=["Semantic"]),
            ExecutionStage(stage_id="Data Analyst", name="AI Data Analyst", dependencies=["Data Engineer"]),
            ExecutionStage(stage_id="Business Analyst", name="AI Business Analyst", dependencies=["Data Analyst"]),
            ExecutionStage(stage_id="Strategy Advisor", name="AI Strategy Advisor", dependencies=["Business Analyst"]),
            ExecutionStage(stage_id="Executive Communicator", name="AI Executive Communicator", dependencies=["Strategy Advisor"])
        ]
        execution = PipelineExecution(workflow_id=context.workflow_id, stages=stages)

        # 3. Check for Checkpoint Resumes
        last_checkpoint = CheckpointManager.get_last_checkpoint(dataset_id)
        resume_stage = None
        if last_checkpoint:
            resume_stage = last_checkpoint.stage_id
            logger.info(f"[WorkflowEngine] Checkpoint found. Resuming pipeline from stage: {resume_stage}")
            bus.publish("CheckpointCreated", {"stage_id": resume_stage}, dataset_id)

        # Variables to carry forward across stages
        cleaned_df = df.copy()
        certified_env = None
        analyst_result = None
        business_result = None
        strategy_result = None
        executive_result = None

        # Helper to load state from checkpoint
        mem = SharedProjectMemory()
        if resume_stage:
            # Reconstruct variables from SharedProjectMemory / state checkpoints
            if resume_stage in ["Data Engineer", "Data Analyst", "Business Analyst", "Strategy Advisor", "Executive Communicator"]:
                # Load certified env metadata
                meta = mem.get_metadata(dataset_id, "trusted_dataset")
                if meta:
                    from backend.services.data_engineer import CertifiedDatasetEnvelope
                    certified_env = CertifiedDatasetEnvelope(dataframe=df, metadata=meta)
                    cleaned_df = df.copy()

            if resume_stage in ["Business Analyst", "Strategy Advisor", "Executive Communicator"]:
                analyst_dump = mem.get_metadata(dataset_id, "analyst_result")
                if analyst_dump:
                    from backend.services.data_analyst.contracts import AnalystResult
                    analyst_result = AnalystResult(**analyst_dump)

            if resume_stage in ["Strategy Advisor", "Executive Communicator"]:
                biz_dump = mem.get_metadata(dataset_id, "business_result")
                if biz_dump:
                    from backend.services.business_analyst.contracts import BusinessAnalystResult
                    business_result = BusinessAnalystResult(**biz_dump)

            if resume_stage == "Executive Communicator":
                strat_dump = mem.get_metadata(dataset_id, "strategy_result")
                if strat_dump:
                    from backend.services.strategy_advisor.contracts import StrategyAdvisorResult
                    strategy_result = StrategyAdvisorResult(**strat_dump)

        # Check resource constraints and throttle
        context.warnings.extend(ResourceManager.check_and_throttle(len(df)))

        # 4. Sequential DAG Loop Execution
        for i, stage in enumerate(stages):
            # If resuming, skip already completed phases
            if resume_stage:
                # If we are before the resume stage, skip execution
                completed_index = -1
                for idx, s in enumerate(stages):
                    if s.stage_id == resume_stage:
                        completed_index = idx
                        break
                if i < completed_index:
                    logger.info(f"[WorkflowEngine] Skipping completed stage: {stage.stage_id}")
                    stage.status = "skipped"
                    context.completed_stages.append(stage.stage_id)
                    continue

            stage.status = "running"
            stage.start_time = datetime.utcnow().isoformat() + "Z"
            tracker.update_progress(
                phase=stage.name,
                pct=float(i) / len(stages) * 100.0,
                module=stage.stage_id,
                est_time=max(1.0, (len(stages) - i) * 5.0),
                completed=context.completed_stages,
                warnings=context.warnings
            )
            bus.publish("StageStarted", stage.model_dump(), dataset_id)

            t0 = time.time()
            try:
                # Execute Stage Logic
                if stage.stage_id == "Semantic":
                    from backend.services.intelligence.semantic_engine import UniversalSemanticEngine
                    # Run semantic analysis
                    RetryManager.execute_with_retry(
                        lambda: UniversalSemanticEngine.analyze(df, dataset_id=dataset_id),
                        stage_name=stage.name
                    )
                    CheckpointManager.save_checkpoint(dataset_id, stage.stage_id, {"completed": True})

                elif stage.stage_id == "Data Engineer":
                    from backend.services.data_engineer.engineer import AIDataEngineer
                    certified_env = RetryManager.execute_with_retry(
                        lambda: AIDataEngineer.certify_and_clean(df, dataset_id=dataset_id),
                        stage_name=stage.name
                    )
                    cleaned_df = certified_env.dataframe
                    mem.set_metadata(dataset_id, "trusted_dataset", certified_env.metadata)
                    CheckpointManager.save_checkpoint(dataset_id, stage.stage_id, {"completed": True})

                elif stage.stage_id == "Data Analyst":
                    from backend.services.data_analyst.analyst import AIDataAnalyst
                    analyst_result = RetryManager.execute_with_retry(
                        lambda: AIDataAnalyst.analyze_trusted_dataset(certified_env.metadata, cleaned_df),
                        stage_name=stage.name
                    )
                    mem.set_metadata(dataset_id, "analyst_result", analyst_result.model_dump())
                    CheckpointManager.save_checkpoint(dataset_id, stage.stage_id, {"completed": True})

                elif stage.stage_id == "Business Analyst":
                    from backend.services.business_analyst.analyst import AIBusinessAnalyst
                    business_result = RetryManager.execute_with_retry(
                        lambda: AIBusinessAnalyst.analyze_business(
                            dataset_id=dataset_id,
                            trusted_dataset=certified_env.metadata,
                            analyst_result=analyst_result
                        ),
                        stage_name=stage.name
                    )
                    mem.set_metadata(dataset_id, "business_result", business_result.model_dump())
                    CheckpointManager.save_checkpoint(dataset_id, stage.stage_id, {"completed": True})

                elif stage.stage_id == "Strategy Advisor":
                    from backend.services.strategy_advisor.advisor import AIStrategyAdvisor
                    strategy_result = RetryManager.execute_with_retry(
                        lambda: AIStrategyAdvisor.generate_strategy(
                            dataset_id=dataset_id,
                            business_result=business_result
                        ),
                        stage_name=stage.name
                    )
                    mem.set_metadata(dataset_id, "strategy_result", strategy_result.model_dump())
                    CheckpointManager.save_checkpoint(dataset_id, stage.stage_id, {"completed": True})

                elif stage.stage_id == "Executive Communicator":
                    from backend.services.executive_communicator.communicator import AIExecutiveCommunicator
                    executive_result = RetryManager.execute_with_retry(
                        lambda: AIExecutiveCommunicator.generate_reports(
                            dataset_id=dataset_id,
                            trusted_dataset=certified_env.metadata,
                            analyst_result=analyst_result,
                            business_result=business_result,
                            strategy_result=strategy_result
                        ),
                        stage_name=stage.name
                    )
                    mem.set_metadata(dataset_id, "executive_result", executive_result.model_dump())
                    CheckpointManager.save_checkpoint(dataset_id, stage.stage_id, {"completed": True})

                stage.duration = time.time() - t0
                stage.status = "completed"
                stage.end_time = datetime.utcnow().isoformat() + "Z"
                context.completed_stages.append(stage.stage_id)
                context.timings[stage.stage_id] = stage.duration
                bus.publish("StageCompleted", stage.model_dump(), dataset_id)

            except Exception as e:
                # Stage Execution Failed
                stage.duration = time.time() - t0
                stage.status = "failed"
                stage.errors.append(str(e))
                context.failed_stage = stage.stage_id
                context.execution_status = "failed"
                context.errors.append(f"Stage '{stage.stage_id}' failed: {str(e)}")
                
                bus.publish("StageFailed", stage.model_dump(), dataset_id)
                bus.publish("WorkflowFailed", context.model_dump(), dataset_id)
                
                # Evaluate health and save contexts
                ExecutionContextManager.save_context(context)
                HealthMonitor.evaluate_health(dataset_id)
                
                raise e

        # 5. Workflow Execution Completed Successfully
        context.execution_status = "completed"
        tracker.update_progress(
            phase="Completed",
            pct=100.0,
            module="Orchestrator",
            est_time=0.0,
            completed=context.completed_stages,
            warnings=context.warnings
        )
        
        # Save contexts and health metrics
        ExecutionContextManager.save_context(context)
        HealthMonitor.evaluate_health(dataset_id)

        # Update Strategic Graph
        graph = OrchestrationReasoningEngine.build_orchestrator_graph(context)
        mem.set_metadata(dataset_id, "workflow_reasoning_graph", graph)

        # Run Validation layer
        OrchestratorValidator.validate_orchestrator(context, execution)

        bus.publish("WorkflowCompleted", context.model_dump(), dataset_id)

        # Retrieve validation results for clean mapping
        val_report = certified_env.to_validation_report() if certified_env else None
        cleaning_log = certified_env.to_cleaning_log() if certified_env else None

        # Profile/EDA fallbacks if not direct
        profile_report = mem.get_metadata(dataset_id, "profile_report")
        eda_report = mem.get_metadata(dataset_id, "eda_report")
        stats_results = mem.get_metadata(dataset_id, "stats_results") or []

        return OrchestratorResult(
            workflow_id=context.workflow_id,
            dataset_id=dataset_id,
            dataframe=cleaned_df,
            validation_report=val_report,
            cleaning_log=cleaning_log,
            profile_report=profile_report,
            eda_report=eda_report,
            stats_results=stats_results,
            analyst_result=analyst_result,
            business_result=business_result,
            strategy_result=strategy_result,
            executive_result=executive_result,
            status="completed",
            warnings=context.warnings,
            errors=context.errors
        )
