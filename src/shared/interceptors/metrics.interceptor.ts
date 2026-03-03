import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly counter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly histogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const path = req.route?.path ?? req.path;
          const status = String(res.statusCode);
          const duration = (Date.now() - startTime) / 1000;

          this.counter.inc({ method, path, status });
          this.histogram.observe({ method, path, status }, duration);
        },
        error: (err) => {
          const path = req.route?.path ?? req.path;
          const status = String(err.status ?? 500);
          const duration = (Date.now() - startTime) / 1000;

          this.counter.inc({ method, path, status });
          this.histogram.observe({ method, path, status }, duration);
        },
      }),
    );
  }
}