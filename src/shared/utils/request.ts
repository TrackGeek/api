import type { HttpService } from '@nestjs/axios';
import { from, timer, lastValueFrom } from 'rxjs';
import { concatMap, delayWhen, toArray } from 'rxjs/operators';

export async function manyRequestWithDelay({
  urls,
  httpService,
  delayMs = 400,
}: {
  urls: string[];
  httpService: HttpService;
  delayMs?: number;
}) {
  return await lastValueFrom(
    from(urls).pipe(
      concatMap((url) =>
        httpService.get(url).pipe(
          delayWhen(() => timer(delayMs))
        )
      ),
      toArray()
    )
  );
}