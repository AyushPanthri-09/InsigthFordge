from backend.services.intelligence.reasoning_graph import ReasoningGraph
from backend.services.data_analyst.contracts import AnalystResult

class AnalystReasoningEngine:
    """
    Translates Pydantic analytical results into explainable node and edge assertions
    within the global project ReasoningGraph.
    """

    @staticmethod
    def map_results_to_graph(result: AnalystResult, graph: ReasoningGraph) -> None:
        """
        Populates the ReasoningGraph with nodes and linkages representing the
        analyst's conclusions.
        """
        # 1. Map KPI results
        for kpi in result.kpis:
            kpi_id = f"graph_kpi_{kpi.kpi_name.lower().replace(' ', '_')}"
            graph.add_node(
                node_id=kpi_id,
                label=kpi.kpi_name,
                node_type="BusinessKPI",
                description=f"Calculated value: {kpi.current_value:.2f}"
            )

        # 2. Map Statistical Tests
        for stat in result.statistical_tests:
            stat_id = f"graph_stat_{stat.method_name.lower()}"
            graph.add_node(
                node_id=stat_id,
                label=f"Stat Test ({stat.method_name})",
                node_type="StatisticalTest",
                description=f"Stat: {stat.test_statistic:.3f}, p-value: {stat.p_value:.4f}. Significant: {stat.is_significant}"
            )

        # 3. Map Trends
        for trend in result.trends:
            trend_id = f"graph_trend_{trend.column.lower()}"
            graph.add_node(
                node_id=trend_id,
                label=f"Trend on {trend.column}",
                node_type="TrendVector",
                description=f"Direction: {trend.direction}. Seasonality: {trend.seasonality_detected}"
            )

        # 4. Map Anomalies
        for anom in result.anomalies:
            anom_id = f"graph_anom_{anom.anomaly_id}"
            graph.add_node(
                node_id=anom_id,
                label=f"Anomaly on {anom.column}",
                node_type="DataAnomaly",
                description=f"Value: {anom.value:.2f} classified as {anom.classification}."
            )
            # Link anomaly to KPI
            kpi_ref_id = f"graph_kpi_{anom.column.lower().replace(' ', '_')}"
            graph.add_edge(anom_id, kpi_ref_id, "affects")

        # 5. Map Insights
        for insight in result.insights:
            ins_id = f"graph_insight_{insight.insight_id}"
            graph.add_node(
                node_id=ins_id,
                label="Business Insight",
                node_type="BusinessInsight",
                description=insight.finding
            )
            # Link insight to statistical tests
            for stat in result.statistical_tests:
                if stat.is_significant:
                    stat_id = f"graph_stat_{stat.method_name.lower()}"
                    graph.add_edge(stat_id, ins_id, "validates")

        # 6. Map Analyst Questions
        for q in result.questions:
            q_id = f"graph_question_{q.question_id}"
            graph.add_node(
                node_id=q_id,
                label="Analyst Question",
                node_type="AnalystQuestion",
                description=q.question_text
            )
