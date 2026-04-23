import { Module } from "@nestjs/common";
import { makeCounterProvider, makeHistogramProvider } from "@willsoto/nestjs-prometheus";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";

@Module({
  imports: [
    PrometheusModule.register({
      global: true,
      defaultMetrics: { enabled: true },
      path: "/prometheus",
    }),
  ],
  providers: [
    makeCounterProvider({
      name: "http_requests_total",
      help: "HTTP Requests Total",
      labelNames: ["method", "path", "status"],
    }),
    makeHistogramProvider({
      name: "http_request_duration_seconds",
      help: "HTTP Request Duration (seconds)",
      labelNames: ["method", "path", "status"],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    }),
  ],
  exports: ["PROM_METRIC_HTTP_REQUESTS_TOTAL", "PROM_METRIC_HTTP_REQUEST_DURATION_SECONDS"],
})
export class MetricsModule {}
