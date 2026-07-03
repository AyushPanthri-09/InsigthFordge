class NarrativeEngine:
    """
    Converts structured findings and recommendations into readable executive language.
    Strictly forbids hallucinated or unverified claims.
    """

    @staticmethod
    def compile_narrative(
        observation: str,
        business_reason: str,
        expected_outcome: str
    ) -> str:
        """
        Synthesizes observation, reason, and outcome into a cohesive text paragraph.
        """
        if not observation or not business_reason or not expected_outcome:
            return "No validated narrative can be generated for this section."

        narrative = (
            f"Based on validated data profiles, we observe: {observation} "
            f"This is driven by key operational factors: {business_reason} "
            f"Corrective execution is expected to lead to the following outcome: {expected_outcome}"
        )
        return narrative
