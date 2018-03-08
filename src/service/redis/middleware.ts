'use strict';

import { ConfigTopics } from '../../config/events';
import { Inject } from 'typescript-ioc';
import { Database } from '../../database';
import { MiddlewareService } from '../middleware';

export class RedisMiddlewareService implements MiddlewareService {
    private static MIDDLEWARE_PREFIX = '{config}:middleware';
    private static ADMIN_API = 'ADMIN_API';

    @Inject private database: Database;

    async list(middleware: string, filter?: string): Promise<Array<string>> {
        let result: string[] = await this.database.redisClient.smembers(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}`);
        result = result.filter((middlwareName: string) => {
            if (filter && !middlwareName.includes(filter)) {
                return false;
            }
            return true;
        });

        return result;
    }

    async add(middleware: string, name: string, content: Buffer): Promise<string> {
        await this.save(middleware, name, content);
        return name;
    }

    async remove(middleware: string, name: string): Promise<void> {
        await this.database.redisClient.multi()
            .srem(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}`, name)
            .del(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}:${name}`)
            .publish(ConfigTopics.CONFIG_UPDATED, JSON.stringify({ id: RedisMiddlewareService.ADMIN_API }))
            .exec();
    }

    async save(middleware: string, name: string, content: Buffer): Promise<void> {
        await this.database.redisClient.multi()
            .sadd(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}`, name)
            .set(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}:${name}`, content)
            .publish(ConfigTopics.CONFIG_UPDATED, JSON.stringify({ id: RedisMiddlewareService.ADMIN_API }))
            .exec();
    }

    read(middleware: string, name: string): Promise<Buffer> {
        return this.database.redisClient.get(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}:${name}`);
    }
}