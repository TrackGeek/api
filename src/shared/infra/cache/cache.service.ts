import { Injectable } from "@nestjs/common";
import { InjectRedis } from "@nestjs-redis/client";
import type { RedisClientType } from "redis";

export interface CacheKeys {
  [key: string]: {
    prefix: (...args: any[]) => string;
    expiration: number;
  };
}

@Injectable()
export class CacheService {
  constructor(
    @InjectRedis()
    private readonly redis: RedisClientType,
  ) {}

  async set<T>(key: string, data: T, exp: number = 180): Promise<void> {
    await this.redis.set(key, JSON.stringify(data), { EX: exp });
  }

  async get<T>(key: string): Promise<T | null> {
    await this.redis.ping();

    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as T;
  }

  async increment(key: string, ttl?: number): Promise<number> {
    const value = await this.redis.incr(key);

    if (ttl && value === 1) {
      await this.redis.expire(key, ttl);
    }

    return value;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);

    return result === 1;
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
