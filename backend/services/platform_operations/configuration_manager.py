from backend.services.platform_operations.contracts import ConfigurationProfile

class ConfigurationManager:
    """
    Centralizes and validates platform timeout rules, retry limits, and cache configurations.
    """

    @staticmethod
    def get_profile() -> ConfigurationProfile:
        """Returns the centralized ConfigurationProfile."""
        retries = {
            "max_retries": 3,
            "backoff_multiplier": 2.0,
            "retry_delay_seconds": 0.50
        }

        timeouts = {
            "Semantic": 30.0,
            "Data Engineer": 60.0,
            "Data Analyst": 90.0,
            "Business Analyst": 60.0,
            "Strategy Advisor": 60.0,
            "Executive Communicator": 60.0
        }

        limits = {
            "max_dataset_rows": 1000000,
            "max_cpu_percent": 90.0,
            "max_ram_percent": 90.0
        }

        return ConfigurationProfile(
            retry_policy=retries,
            timeout_policy=timeouts,
            resource_limits=limits
        )
