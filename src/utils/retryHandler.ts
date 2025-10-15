/**
 * RetryHandler - 重试机制处理类
 *
 * 提供带有指数退避策略的重试机制，用于处理可能暂时失败的操作。
 * 主要用于网络请求、文件系统操作等可能因临时问题而失败的场景。
 *
 * 特性：
 * - 支持最多 3 次重试
 * - 指数退避策略（1秒、2秒、4秒）
 * - 可配置的重试条件
 * - 详细的错误信息
 */

/**
 * 重试配置选项
 */
export interface RetryOptions {
    /** 最大重试次数（默认: 3） */
    maxRetries?: number;

    /** 初始延迟时间，单位毫秒（默认: 1000） */
    initialDelay?: number;

    /** 是否启用指数退避（默认: true） */
    exponentialBackoff?: boolean;

    /** 自定义重试条件判断函数（可选） */
    shouldRetry?: (error: Error, attempt: number) => boolean;

    /** 重试前的回调函数（可选） */
    onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * RetryHandler 类
 *
 * 提供重试机制的工具类，支持指数退避和自定义重试条件。
 */
export class RetryHandler {
    /** 默认最大重试次数 */
    private readonly DEFAULT_MAX_RETRIES = 3;

    /** 默认初始重试延迟（毫秒） */
    private readonly DEFAULT_RETRY_DELAY = 1000;

    /**
     * 构造函数
     */
    constructor() {}

    /**
     * 执行带重试的操作
     *
     * @param operation 要执行的异步操作
     * @param context 操作上下文描述（用于错误消息）
     * @param options 重试选项
     * @returns 操作结果
     * @throws 当所有重试都失败后抛出错误
     *
     * @example
     * ```typescript
     * const retryHandler = new RetryHandler();
     * const result = await retryHandler.withRetry(
     *     () => fetchDataFromAPI(),
     *     'Fetching data from API',
     *     { maxRetries: 3, initialDelay: 1000 }
     * );
     * ```
     */
    async withRetry<T>(
        operation: () => Promise<T>,
        context: string,
        options: RetryOptions = {}
    ): Promise<T> {
        const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
        const initialDelay = options.initialDelay ?? this.DEFAULT_RETRY_DELAY;
        const exponentialBackoff = options.exponentialBackoff ?? true;

        let lastError: Error | null = null;
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                // 第一次尝试或重试
                return await operation();
            } catch (error) {
                lastError = error as Error;
                attempt++;

                // 检查是否应该重试
                const shouldRetry = this.shouldRetryOperation(
                    lastError,
                    attempt,
                    maxRetries,
                    options.shouldRetry
                );

                if (!shouldRetry) {
                    // 不应该重试，直接抛出错误
                    break;
                }

                // 计算延迟时间
                const delay = exponentialBackoff
                    ? this.calculateExponentialDelay(initialDelay, attempt)
                    : initialDelay;

                // 调用重试回调
                if (options.onRetry) {
                    options.onRetry(lastError, attempt, delay);
                }

                // 等待后重试
                await this.sleep(delay);
            }
        }

        // 所有重试都失败，抛出错误
        throw new Error(
            `${context} failed after ${attempt} attempts: ${lastError?.message}`
        );
    }

    /**
     * 判断是否应该重试操作
     *
     * @param error 发生的错误
     * @param attempt 当前尝试次数
     * @param maxRetries 最大重试次数
     * @param customShouldRetry 自定义重试判断函数
     * @returns 是否应该重试
     */
    private shouldRetryOperation(
        error: Error,
        attempt: number,
        maxRetries: number,
        customShouldRetry?: (error: Error, attempt: number) => boolean
    ): boolean {
        // 如果已达到最大重试次数，不再重试
        if (attempt > maxRetries) {
            return false;
        }

        // 如果提供了自定义重试判断函数，使用它
        if (customShouldRetry) {
            return customShouldRetry(error, attempt);
        }

        // 默认重试逻辑：检查错误类型是否可重试
        return this.isRetryableError(error);
    }

    /**
     * 判断错误是否可重试
     *
     * 检查错误类型和消息，判断是否为临时性错误。
     *
     * @param error 错误对象
     * @returns 错误是否可重试
     */
    private isRetryableError(error: Error): boolean {
        const message = error.message.toLowerCase();

        // 网络相关错误（通常可重试）
        if (
            message.includes('timeout') ||
            message.includes('network') ||
            message.includes('econnrefused') ||
            message.includes('econnreset') ||
            message.includes('etimedout')
        ) {
            return true;
        }

        // 临时性错误
        if (
            message.includes('temporary') ||
            message.includes('unavailable') ||
            message.includes('busy')
        ) {
            return true;
        }

        // 速率限制错误
        if (
            message.includes('rate limit') ||
            message.includes('too many requests')
        ) {
            return true;
        }

        // 默认不重试
        return false;
    }

    /**
     * 计算指数退避延迟时间
     *
     * 使用指数退避策略计算延迟时间。
     * 公式：initialDelay * (2 ^ (attempt - 1))
     *
     * @param initialDelay 初始延迟时间（毫秒）
     * @param attempt 当前尝试次数（从 1 开始）
     * @returns 计算后的延迟时间（毫秒）
     *
     * @example
     * ```typescript
     * calculateExponentialDelay(1000, 1) // 返回 1000 (1秒)
     * calculateExponentialDelay(1000, 2) // 返回 2000 (2秒)
     * calculateExponentialDelay(1000, 3) // 返回 4000 (4秒)
     * ```
     */
    private calculateExponentialDelay(initialDelay: number, attempt: number): number {
        return initialDelay * Math.pow(2, attempt - 1);
    }

    /**
     * 睡眠指定时间
     *
     * @param ms 睡眠时间（毫秒）
     * @returns Promise，在指定时间后 resolve
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 批量执行带重试的操作
     *
     * 对多个操作同时应用重试机制，返回所有操作的结果。
     * 即使某些操作失败，其他操作仍会继续执行。
     *
     * @param operations 操作列表
     * @param context 操作上下文描述
     * @param options 重试选项
     * @returns 包含成功和失败结果的对象
     *
     * @example
     * ```typescript
     * const retryHandler = new RetryHandler();
     * const result = await retryHandler.withRetryBatch(
     *     [
     *         () => fetchDataFromAPI1(),
     *         () => fetchDataFromAPI2(),
     *         () => fetchDataFromAPI3()
     *     ],
     *     'Batch fetching data',
     *     { maxRetries: 2 }
     * );
     * console.log(`Success: ${result.succeeded.length}, Failed: ${result.failed.length}`);
     * ```
     */
    async withRetryBatch<T>(
        operations: Array<() => Promise<T>>,
        context: string,
        options: RetryOptions = {}
    ): Promise<{
        succeeded: T[];
        failed: Array<{ index: number; error: Error }>;
    }> {
        const results = await Promise.allSettled(
            operations.map((operation, index) =>
                this.withRetry(operation, `${context} [${index}]`, options)
            )
        );

        const succeeded: T[] = [];
        const failed: Array<{ index: number; error: Error }> = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                succeeded.push(result.value);
            } else {
                failed.push({
                    index,
                    error: result.reason
                });
            }
        });

        return { succeeded, failed };
    }

    /**
     * 执行带重试和超时控制的操作
     *
     * @param operation 要执行的异步操作
     * @param context 操作上下文描述
     * @param timeoutMs 超时时间（毫秒）
     * @param options 重试选项
     * @returns 操作结果
     * @throws 当操作超时或所有重试都失败后抛出错误
     *
     * @example
     * ```typescript
     * const retryHandler = new RetryHandler();
     * const result = await retryHandler.withRetryAndTimeout(
     *     () => longRunningOperation(),
     *     'Long running operation',
     *     5000, // 5秒超时
     *     { maxRetries: 2 }
     * );
     * ```
     */
    async withRetryAndTimeout<T>(
        operation: () => Promise<T>,
        context: string,
        timeoutMs: number,
        options: RetryOptions = {}
    ): Promise<T> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });

        return this.withRetry(
            () => Promise.race([operation(), timeoutPromise]),
            context,
            options
        );
    }
}
