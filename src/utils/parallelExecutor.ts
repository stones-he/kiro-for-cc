/**
 * ParallelExecutor - 并行执行器
 *
 * 提供任务并行执行的能力，支持批次控制、进度报告和错误处理。
 * 主要用于并行生成多个设计模块，提高整体性能。
 *
 * 特性：
 * - 支持最大并发数控制，避免资源耗尽
 * - 批次执行机制，合理利用系统资源
 * - 进度报告回调，实时反馈执行状态
 * - 错误隔离，单个任务失败不影响其他任务
 * - 支持任务优先级和依赖关系
 */

import * as vscode from 'vscode';

/**
 * 任务定义
 */
export interface Task<T> {
    /** 任务标识符 */
    id: string;

    /** 任务执行函数 */
    execute: () => Promise<T>;

    /** 任务优先级（数字越小优先级越高，默认: 0） */
    priority?: number;

    /** 任务依赖的其他任务 ID 列表 */
    dependencies?: string[];

    /** 任务元数据（可选） */
    metadata?: Record<string, any>;
}

/**
 * 任务执行结果
 */
export interface TaskResult<T> {
    /** 任务 ID */
    taskId: string;

    /** 执行状态 */
    status: 'success' | 'failed' | 'skipped';

    /** 执行结果（成功时） */
    result?: T;

    /** 错误信息（失败时） */
    error?: Error;

    /** 执行开始时间 */
    startTime: Date;

    /** 执行结束时间 */
    endTime: Date;

    /** 执行耗时（毫秒） */
    duration: number;
}

/**
 * 并行执行选项
 */
export interface ParallelExecutionOptions {
    /** 最大并发数（默认: 4） */
    maxConcurrency?: number;

    /** 是否在首次失败时停止执行（默认: false） */
    stopOnFirstError?: boolean;

    /** 进度报告回调 */
    onProgress?: (completed: number, total: number, currentTask: string) => void;

    /** 任务开始回调 */
    onTaskStart?: (taskId: string) => void;

    /** 任务完成回调 */
    onTaskComplete?: <T>(result: TaskResult<T>) => void;

    /** 批次延迟时间（毫秒，默认: 0） */
    batchDelay?: number;
}

/**
 * 执行统计信息
 */
export interface ExecutionStats {
    /** 总任务数 */
    totalTasks: number;

    /** 成功任务数 */
    successCount: number;

    /** 失败任务数 */
    failedCount: number;

    /** 跳过任务数 */
    skippedCount: number;

    /** 总耗时（毫秒） */
    totalDuration: number;

    /** 平均耗时（毫秒） */
    averageDuration: number;

    /** 最大耗时（毫秒） */
    maxDuration: number;

    /** 最小耗时（毫秒） */
    minDuration: number;
}

/**
 * ParallelExecutor 类
 *
 * 提供任务并行执行能力的工具类。
 */
export class ParallelExecutor {
    /** 默认最大并发数 */
    private readonly DEFAULT_MAX_CONCURRENCY = 4;

    /** 输出通道 */
    private outputChannel?: vscode.OutputChannel;

    /**
     * 构造函数
     *
     * @param outputChannel 可选的输出通道，用于日志记录
     */
    constructor(outputChannel?: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * 并行执行任务列表
     *
     * @param tasks 任务列表
     * @param options 执行选项
     * @returns 执行结果列表和统计信息
     *
     * @example
     * ```typescript
     * const executor = new ParallelExecutor();
     * const tasks = [
     *     { id: 'task1', execute: () => generateModule('frontend') },
     *     { id: 'task2', execute: () => generateModule('backend') },
     *     { id: 'task3', execute: () => generateModule('database') }
     * ];
     *
     * const { results, stats } = await executor.execute(tasks, {
     *     maxConcurrency: 2,
     *     onProgress: (completed, total) => console.log(`${completed}/${total}`)
     * });
     * ```
     */
    async execute<T>(
        tasks: Task<T>[],
        options: ParallelExecutionOptions = {}
    ): Promise<{
        results: TaskResult<T>[];
        stats: ExecutionStats;
    }> {
        const startTime = Date.now();
        const maxConcurrency = options.maxConcurrency ?? this.DEFAULT_MAX_CONCURRENCY;

        this.log(`[ParallelExecutor] Starting execution of ${tasks.length} tasks with max concurrency ${maxConcurrency}`);

        // 解析任务依赖关系并排序
        const sortedTasks = this.sortTasksByPriorityAndDependencies(tasks);

        // 创建批次
        const batches = this.createBatches(sortedTasks, maxConcurrency);

        this.log(`[ParallelExecutor] Created ${batches.length} batches`);

        // 执行所有批次
        const results: TaskResult<T>[] = [];
        const completedTaskIds = new Set<string>();
        let shouldStop = false;

        for (let batchIndex = 0; batchIndex < batches.length && !shouldStop; batchIndex++) {
            const batch = batches[batchIndex];

            this.log(`[ParallelExecutor] Executing batch ${batchIndex + 1}/${batches.length} with ${batch.length} tasks`);

            // 过滤掉依赖未完成的任务
            const executableTasks = batch.filter(task =>
                this.areDependenciesSatisfied(task, completedTaskIds)
            );

            if (executableTasks.length < batch.length) {
                this.log(`[ParallelExecutor] ${batch.length - executableTasks.length} tasks skipped due to unmet dependencies`);
            }

            // 并行执行批次中的任务
            const batchResults = await this.executeBatch(
                executableTasks,
                options,
                results.length,
                tasks.length
            );

            results.push(...batchResults);

            // 记录已完成的任务
            for (const result of batchResults) {
                if (result.status === 'success') {
                    completedTaskIds.add(result.taskId);
                } else if (result.status === 'failed' && options.stopOnFirstError) {
                    shouldStop = true;
                    this.log(`[ParallelExecutor] Stopping execution due to task failure: ${result.taskId}`);
                    break;
                }
            }

            // 批次间延迟
            if (options.batchDelay && batchIndex < batches.length - 1 && !shouldStop) {
                await this.sleep(options.batchDelay);
            }
        }

        // 标记跳过的任务（依赖未满足的任务）
        const executedTaskIds = new Set(results.map(r => r.taskId));
        for (const task of tasks) {
            if (!executedTaskIds.has(task.id)) {
                results.push({
                    taskId: task.id,
                    status: 'skipped',
                    startTime: new Date(),
                    endTime: new Date(),
                    duration: 0
                });
            }
        }

        // 计算统计信息
        const stats = this.calculateStats(results, startTime);

        this.log(`[ParallelExecutor] Execution completed. Stats: ${JSON.stringify(stats)}`);

        return { results, stats };
    }

    /**
     * 执行单个批次的任务
     *
     * @param tasks 批次中的任务
     * @param options 执行选项
     * @param completedCount 已完成的任务数
     * @param totalCount 总任务数
     * @returns 批次执行结果
     */
    private async executeBatch<T>(
        tasks: Task<T>[],
        options: ParallelExecutionOptions,
        completedCount: number,
        totalCount: number
    ): Promise<TaskResult<T>[]> {
        const promises = tasks.map(task => this.executeTask(task, options));
        const results = await Promise.all(promises);

        // 更新进度
        if (options.onProgress) {
            const newCompletedCount = completedCount + results.length;
            const currentTask = results[results.length - 1]?.taskId || 'unknown';
            options.onProgress(newCompletedCount, totalCount, currentTask);
        }

        return results;
    }

    /**
     * 执行单个任务
     *
     * @param task 任务
     * @param options 执行选项
     * @returns 任务执行结果
     */
    private async executeTask<T>(
        task: Task<T>,
        options: ParallelExecutionOptions
    ): Promise<TaskResult<T>> {
        const startTime = new Date();

        // 触发任务开始回调
        if (options.onTaskStart) {
            options.onTaskStart(task.id);
        }

        this.log(`[ParallelExecutor] Starting task: ${task.id}`);

        try {
            const result = await task.execute();
            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();

            const taskResult: TaskResult<T> = {
                taskId: task.id,
                status: 'success',
                result,
                startTime,
                endTime,
                duration
            };

            this.log(`[ParallelExecutor] Task completed successfully: ${task.id} (${duration}ms)`);

            // 触发任务完成回调
            if (options.onTaskComplete) {
                options.onTaskComplete(taskResult);
            }

            return taskResult;
        } catch (error) {
            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();

            const taskResult: TaskResult<T> = {
                taskId: task.id,
                status: 'failed',
                error: error as Error,
                startTime,
                endTime,
                duration
            };

            this.log(`[ParallelExecutor] Task failed: ${task.id} - ${(error as Error).message}`);

            // 触发任务完成回调
            if (options.onTaskComplete) {
                options.onTaskComplete(taskResult);
            }

            return taskResult;
        }
    }

    /**
     * 创建任务批次
     *
     * 将任务列表分成多个批次，每个批次的大小不超过最大并发数。
     *
     * @param tasks 任务列表
     * @param batchSize 批次大小
     * @returns 批次列表
     */
    private createBatches<T>(tasks: Task<T>[], batchSize: number): Task<T>[][] {
        const batches: Task<T>[][] = [];

        for (let i = 0; i < tasks.length; i += batchSize) {
            batches.push(tasks.slice(i, i + batchSize));
        }

        return batches;
    }

    /**
     * 根据优先级和依赖关系排序任务
     *
     * @param tasks 任务列表
     * @returns 排序后的任务列表
     */
    private sortTasksByPriorityAndDependencies<T>(tasks: Task<T>[]): Task<T>[] {
        // 创建任务 ID 到任务的映射
        const taskMap = new Map<string, Task<T>>();
        tasks.forEach(task => taskMap.set(task.id, task));

        // 拓扑排序处理依赖关系
        const sorted: Task<T>[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const visit = (taskId: string): void => {
            if (visited.has(taskId)) {
                return;
            }

            if (visiting.has(taskId)) {
                // 检测到循环依赖
                this.log(`[ParallelExecutor] Warning: Circular dependency detected for task ${taskId}`);
                return;
            }

            const task = taskMap.get(taskId);
            if (!task) {
                return;
            }

            visiting.add(taskId);

            // 先访问依赖的任务
            if (task.dependencies) {
                for (const depId of task.dependencies) {
                    visit(depId);
                }
            }

            visiting.delete(taskId);
            visited.add(taskId);
            sorted.push(task);
        };

        // 访问所有任务
        for (const task of tasks) {
            visit(task.id);
        }

        // 在拓扑排序的基础上，按优先级排序
        sorted.sort((a, b) => {
            const priorityA = a.priority ?? 0;
            const priorityB = b.priority ?? 0;
            return priorityA - priorityB;
        });

        return sorted;
    }

    /**
     * 检查任务的依赖是否已满足
     *
     * @param task 任务
     * @param completedTaskIds 已完成的任务 ID 集合
     * @returns 依赖是否已满足
     */
    private areDependenciesSatisfied<T>(
        task: Task<T>,
        completedTaskIds: Set<string>
    ): boolean {
        if (!task.dependencies || task.dependencies.length === 0) {
            return true;
        }

        return task.dependencies.every(depId => completedTaskIds.has(depId));
    }

    /**
     * 计算执行统计信息
     *
     * @param results 任务执行结果列表
     * @param startTime 开始时间戳
     * @returns 统计信息
     */
    private calculateStats<T>(results: TaskResult<T>[], startTime: number): ExecutionStats {
        const totalTasks = results.length;
        const successCount = results.filter(r => r.status === 'success').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        const skippedCount = results.filter(r => r.status === 'skipped').length;

        const durations = results
            .filter(r => r.status !== 'skipped')
            .map(r => r.duration);

        const totalDuration = Date.now() - startTime;
        const averageDuration = durations.length > 0
            ? durations.reduce((sum, d) => sum + d, 0) / durations.length
            : 0;
        const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
        const minDuration = durations.length > 0 ? Math.min(...durations) : 0;

        return {
            totalTasks,
            successCount,
            failedCount,
            skippedCount,
            totalDuration,
            averageDuration,
            maxDuration,
            minDuration
        };
    }

    /**
     * 记录日志
     *
     * @param message 日志消息
     */
    private log(message: string): void {
        if (this.outputChannel) {
            this.outputChannel.appendLine(message);
        }
    }

    /**
     * 睡眠指定时间
     *
     * @param ms 睡眠时间（毫秒）
     * @returns Promise
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 执行简化版并行任务（无依赖关系）
     *
     * 这是一个简化的 API，适用于没有依赖关系的并行任务场景。
     *
     * @param operations 操作函数列表
     * @param options 执行选项
     * @returns 执行结果列表
     *
     * @example
     * ```typescript
     * const executor = new ParallelExecutor();
     * const results = await executor.executeSimple(
     *     [
     *         () => generateFrontendModule(),
     *         () => generateBackendModule(),
     *         () => generateDatabaseModule()
     *     ],
     *     { maxConcurrency: 2 }
     * );
     * ```
     */
    async executeSimple<T>(
        operations: Array<() => Promise<T>>,
        options: ParallelExecutionOptions = {}
    ): Promise<TaskResult<T>[]> {
        const tasks: Task<T>[] = operations.map((op, index) => ({
            id: `task-${index}`,
            execute: op
        }));

        const { results } = await this.execute(tasks, options);
        return results;
    }

    /**
     * 执行批次任务（手动控制批次）
     *
     * 按照指定的批次列表顺序执行任务，每个批次内并行执行。
     *
     * @param batches 批次列表，每个批次是一个操作函数列表
     * @param options 执行选项
     * @returns 所有批次的执行结果
     *
     * @example
     * ```typescript
     * const executor = new ParallelExecutor();
     * const results = await executor.executeInBatches(
     *     [
     *         [() => generateModule1(), () => generateModule2()], // 批次 1
     *         [() => generateModule3(), () => generateModule4()]  // 批次 2
     *     ],
     *     { batchDelay: 1000 }
     * );
     * ```
     */
    async executeInBatches<T>(
        batches: Array<Array<() => Promise<T>>>,
        options: ParallelExecutionOptions = {}
    ): Promise<TaskResult<T>[]> {
        const allTasks: Task<T>[] = [];
        const batchIds: string[] = [];

        // 将批次转换为带依赖关系的任务
        batches.forEach((batch, batchIndex) => {
            const batchId = `batch-${batchIndex}`;
            batchIds.push(batchId);

            batch.forEach((op, taskIndex) => {
                const taskId = `${batchId}-task-${taskIndex}`;
                const task: Task<T> = {
                    id: taskId,
                    execute: op,
                    dependencies: batchIndex > 0 ? [batchIds[batchIndex - 1]] : undefined
                };
                allTasks.push(task);
            });

            // 添加批次标记任务（用于依赖控制）
            allTasks.push({
                id: batchId,
                execute: async () => ({} as T), // 空操作
                dependencies: batch.map((_, i) => `${batchId}-task-${i}`)
            });
        });

        const { results } = await this.execute(allTasks, options);

        // 过滤掉批次标记任务
        return results.filter(r => !batchIds.includes(r.taskId));
    }
}
