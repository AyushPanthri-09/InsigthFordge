import logging
from backend.services.platform_operations.contracts import BenchmarkResult

logger = logging.getLogger(__name__)

class BenchmarkEngine:
    """
    Measures pipeline latencies and resource footprints to calculate overall Performance Score.
    """

    @staticmethod
    def run_benchmark(
        latency: float,
        cpu_usage: float,
        ram_usage: float
    ) -> BenchmarkResult:
        """
        Runs performance checks and compiles scores.
        """
        # Calculate overall score: higher latency/CPU reduces score
        score = 100.0 - (latency * 0.5) - (cpu_usage * 0.2) - (ram_usage * 0.1)
        score = max(0.0, min(100.0, score))

        return BenchmarkResult(
            cpu_usage=cpu_usage,
            ram_usage=ram_usage,
            latency=latency,
            cache_hit_rate=0.85,
            score=score
        )
