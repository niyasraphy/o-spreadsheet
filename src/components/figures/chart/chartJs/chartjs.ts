import { Component, onMounted, onPatched, useRef } from "@odoo/owl";
import type { Chart, ChartConfiguration } from "chart.js";
import { deepEquals } from "../../../../helpers";
import { Figure, SpreadsheetChildEnv } from "../../../../types";
import { ChartJSRuntime } from "../../../../types/chart/chart";
import { GaugeChartConfiguration, GaugeChartOptions } from "../../../../types/chart/gauge_chart";

interface Props {
  figure: Figure;
}

export class ChartJsComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartJsComponent";

  private canvas = useRef("graphContainer");
  private chart?: Chart;

  get background(): string {
    return this.chartRuntime.background;
  }

  get canvasStyle() {
    return `background-color: ${this.background}`;
  }

  get chartRuntime(): ChartJSRuntime {
    const runtime = this.env.model.getters.getChartRuntime(this.props.figure.id);
    if (!("chartJsConfig" in runtime)) {
      throw new Error("Unsupported chart runtime");
    }
    return runtime;
  }

  setup() {
    onMounted(() => {
      const runtime = this.chartRuntime;
      this.createChart(runtime.chartJsConfig);
    });

    let previousRuntime = this.chartRuntime;
    onPatched(() => {
      const chartRuntime = this.chartRuntime;
      if (deepEquals(previousRuntime, chartRuntime)) {
        return;
      }
      this.updateChartJs(chartRuntime);
      previousRuntime = chartRuntime;
    });
  }

  private createChart(chartData: ChartConfiguration | GaugeChartConfiguration) {
    const canvas = this.canvas.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    // @ts-ignore
    this.chart = new window.Chart(ctx, chartData as ChartConfiguration);
  }

  private updateChartJs(chartRuntime: ChartJSRuntime) {
    const chartData = chartRuntime.chartJsConfig;
    if (chartData.data && chartData.data.datasets) {
      this.chart!.data = chartData.data;
      if (chartData.options?.plugins?.title) {
        this.chart!.config.options!.plugins!.title = chartData.options.plugins.title;
      }
      if (chartData.options && "valueLabel" in chartData.options) {
        if (chartData.options?.valueLabel) {
          (this.chart!.config.options! as GaugeChartOptions).valueLabel =
            chartData.options.valueLabel;
        }
      }
    } else {
      this.chart!.data.datasets = [];
    }
    this.chart!.config.options!.plugins!.tooltip = chartData.options!.plugins!.tooltip;
    this.chart!.config.options!.plugins!.legend = chartData.options!.plugins!.legend;
    this.chart!.config.options!.scales = chartData.options?.scales;
    // ?
    this.chart!.update("active");
  }
}

ChartJsComponent.props = {
  figure: Object,
};
