import { Injectable } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerRequest } from "@nestjs/throttler";

const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, throttler } = requestProps;

    const request = context.switchToHttp().getRequest<{ method: string }>();
    const method = request.method?.toUpperCase();
    const isWriteMethod = WRITE_METHODS.includes(method);

    if (throttler.name === "read" && isWriteMethod) return true;
    if (throttler.name === "write" && !isWriteMethod) return true;

    return super.handleRequest(requestProps);
  }
}
