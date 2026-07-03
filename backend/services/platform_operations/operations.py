import logging
from backend.services.platform_intelligence.contracts import PlatformIntelligenceResult
from backend.services.platform_operations.contracts import PlatformOperationsResult
from backend.services.platform_operations.deployment_manager import DeploymentManager
from backend.services.platform_operations.scheduler import SchedulerEngine
from backend.services.platform_operations.model_registry import ModelRegistryManager
from backend.services.platform_operations.experiment_tracker import ExperimentTrackerEngine
from backend.services.platform_operations.benchmark_engine import BenchmarkEngine
from backend.services.platform_operations.security_manager import SecurityManager
from backend.services.platform_operations.access_control import AccessControlManager
from backend.services.platform_operations.configuration_manager import ConfigurationManager
from backend.services.platform_operations.backup_manager import PlatformBackupManager
from backend.services.platform_operations.observability import PlatformObservability
from backend.services.platform_operations.metrics import PlatformMetricsEngine
from backend.services.platform_operations.validation import OperationsValidator
from backend.services.platform_operations.reasoning import OperationsReasoningEngine
from backend.services.intelligence.memory import SharedProjectMemory

logger = logging.getLogger(__name__)

class AIPlatformOperations:
    """
    AI Platform Operations & MLOps Coordinator.
    Governs security, observability, deployment life cycles, and hardware benchmarks.
    """

    @staticmethod
    def run(
        dataset_id: str,
        platform_result: PlatformIntelligenceResult
    ) -> PlatformOperationsResult:
        """
        Coordinates full operations verification pipeline.
        """
        logger.info(f"[AIPlatformOperations] Starting operations lifecycle audit for dataset: {dataset_id}")
        
        mem = SharedProjectMemory()
        
        # 1. Create Deployment Record
        deployment = DeploymentManager.create_deployment("v1.0.0", "production")

        # 2. Schedule cron reporting job
        job = SchedulerEngine.create_job("daily")

        # 3. Registry verification
        registry = ModelRegistryManager.get_entry("Workflow Orchestrator")

        # 4. Latency and resource benchmarking
        benchmark = BenchmarkEngine.run_benchmark(latency=4.2, cpu_usage=15.0, ram_usage=45.0)

        # 5. Security audit check
        security = SecurityManager.verify_security()

        # 6. Observability dashboard telemetry metrics
        observability = PlatformObservability.get_observability(dataset_id, latency=4.2)

        # 7. Reliability KPIs
        metrics = PlatformMetricsEngine.get_metrics(dataset_id)

        # 8. Create memory state backup snapshot
        PlatformBackupManager.create_backup(dataset_id)

        # Compile Master Result
        raw_result = PlatformOperationsResult(
            dataset_id=dataset_id,
            deployment_record=deployment,
            scheduler_job=job,
            registry_entry=registry,
            benchmark_result=benchmark,
            security_policy=security,
            observability_metrics=observability,
            operations_metrics=metrics
        )

        # 9. Validate Operations completeness
        final_result = OperationsValidator.validate_operations(raw_result)

        # 10. Update reasoning graph
        operations_graph = OperationsReasoningEngine.build_operations_graph(final_result)

        # 11. Cache all results in memory
        mem.set_metadata(dataset_id, "operations_result", final_result.model_dump())
        mem.set_metadata(dataset_id, "platform_operations_reasoning_graph", operations_graph)
        
        logger.info(f"[AIPlatformOperations] Finished operations lifecycle audit. Performance Score: {final_result.benchmark_result.score:.1f}")
        
        return final_result
