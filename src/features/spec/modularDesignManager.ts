/**
 * ModularDesignManager - 模块化设计核心管理类
 *
 * 这是模块化设计功能的主入口和协调中心，负责：
 * - 协调所有模块化设计相关组件的工作
 * - 管理设计模块的完整生命周期（生成、更新、删除）
 * - 处理向后兼容逻辑（旧版 design.md）
 * - 管理模块工作流状态
 * - 提供模块 CRUD 操作
 *
 * 核心职责：
 * 1. 生成管理：调用 ModuleDetector 和 ModuleGenerator 生成模块
 * 2. 缓存管理：使用 ModuleCache 优化性能
 * 3. 迁移管理：使用 LegacyMigrator 处理旧版设计
 * 4. 状态管理：使用 ModuleMetadataManager 管理工作流
 * 5. 错误处理：使用 ErrorHandler 提供统一的错误处理
 *
 * @example
 * ```typescript
 * const manager = new ModularDesignManager(claudeProvider, outputChannel);
 *
 * // 生成所有设计模块
 * const result = await manager.generateDesignModules('my-feature');
 *
 * // 检查是否可以进入任务阶段
 * const canProgress = await manager.canProgressToTasks('my-feature');
 * ```
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
    ModuleType,
    WorkflowState,
    ModuleInfo,
    GenerateOptions,
    GenerationResult,
    MigrationResult
} from '../../types/modularDesign';
import { ClaudeCodeProvider } from '../../providers/claudeCodeProvider';
import { ConfigManager } from '../../utils/configManager';
import { ErrorHandler } from '../../utils/errorHandler';
import { ModuleCache } from './moduleCache';
import { ModuleDetector } from './moduleDetector';
import { ModuleGenerator } from './moduleGenerator';
import { LegacyMigrator } from './legacyMigrator';
import { ModuleMetadataManager } from './moduleMetadata';
import { ParallelExecutor, Task } from '../../utils/parallelExecutor';

/**
 * ModularDesignManager 接口
 *
 * 定义模块化设计管理器的公共 API
 */
export interface IModularDesignManager {
    // 核心功能
    generateDesignModules(specName: string, options?: GenerateOptions): Promise<GenerationResult>;
    generateSpecificModule(specName: string, moduleType: ModuleType): Promise<void>;

    // 文件操作
    getModuleList(specName: string): Promise<ModuleInfo[]>;
    getModuleContent(specName: string, moduleType: ModuleType): Promise<string>;
    updateModule(specName: string, moduleType: ModuleType, content: string): Promise<void>;
    deleteModule(specName: string, moduleType: ModuleType): Promise<void>;

    // 向后兼容
    isLegacyDesign(specName: string): Promise<boolean>;
    migrateLegacyDesign(specName: string): Promise<MigrationResult>;

    // 工作流状态
    getModuleWorkflowState(specName: string, moduleType: ModuleType): Promise<WorkflowState>;
    updateModuleWorkflowState(specName: string, moduleType: ModuleType, state: WorkflowState): Promise<void>;
    canProgressToTasks(specName: string): Promise<boolean>;
}

/**
 * ModularDesignManager 类
 *
 * 模块化设计的核心管理类，协调所有子组件的工作
 */
export class ModularDesignManager implements IModularDesignManager {
    private moduleCache: ModuleCache;
    private moduleDetector: ModuleDetector;
    private moduleGenerator: ModuleGenerator;
    private legacyMigrator: LegacyMigrator;
    private errorHandler: ErrorHandler;
    private configManager: ConfigManager;
    private parallelExecutor: ParallelExecutor;

    /**
     * 构造函数
     *
     * @param claudeProvider Claude Code 提供者，用于 AI 生成
     * @param outputChannel VSCode 输出通道，用于日志记录
     */
    constructor(
        private claudeProvider: ClaudeCodeProvider,
        private outputChannel: vscode.OutputChannel
    ) {
        this.configManager = ConfigManager.getInstance();

        // 初始化所有子组件
        this.moduleCache = new ModuleCache(outputChannel);
        this.moduleDetector = new ModuleDetector(outputChannel);
        this.moduleGenerator = new ModuleGenerator(claudeProvider, outputChannel);
        this.legacyMigrator = new LegacyMigrator(outputChannel);
        this.errorHandler = new ErrorHandler(outputChannel);
        this.parallelExecutor = new ParallelExecutor(outputChannel);

        this.outputChannel.appendLine('[ModularDesignManager] Initialized');
    }

    /**
     * 生成设计模块
     *
     * 这是生成模块的主入口方法。它会：
     * 1. 读取需求文档
     * 2. 检测适用的模块类型（如果未指定）
     * 3. 过滤已存在的模块（除非强制重新生成）
     * 4. 生成模块（支持并行或串行）
     * 5. 更新模块状态和缓存
     *
     * @param specName Spec 名称
     * @param options 生成选项
     * @returns 生成结果，包含成功、失败和跳过的模块
     *
     * @example
     * ```typescript
     * // 生成所有适用模块
     * const result = await manager.generateDesignModules('my-feature');
     *
     * // 只生成特定模块
     * const result = await manager.generateDesignModules('my-feature', {
     *     moduleTypes: [ModuleType.Frontend, ModuleType.Testing]
     * });
     *
     * // 强制重新生成已存在的模块
     * const result = await manager.generateDesignModules('my-feature', {
     *     forceRegenerate: true
     * });
     * ```
     */
    async generateDesignModules(
        specName: string,
        options: GenerateOptions = {}
    ): Promise<GenerationResult> {
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('='.repeat(80));
        this.outputChannel.appendLine(
            `[ModularDesignManager] Starting design module generation for spec: ${specName}`
        );
        this.outputChannel.appendLine('='.repeat(80));

        const result: GenerationResult = {
            success: true,
            generatedModules: [],
            failedModules: [],
            skippedModules: []
        };

        try {
            // 1. 读取 requirements.md
            this.outputChannel.appendLine(
                '[ModularDesignManager] Step 1: Reading requirements document'
            );
            const requirements = await this.readRequirements(specName);

            // 2. 检测适用的模块
            this.outputChannel.appendLine(
                '[ModularDesignManager] Step 2: Detecting applicable modules'
            );
            let applicableModules: ModuleType[];

            if (options.moduleTypes && options.moduleTypes.length > 0) {
                // 使用用户指定的模块类型
                applicableModules = options.moduleTypes;
                this.outputChannel.appendLine(
                    `[ModularDesignManager] Using user-specified modules: ${applicableModules.join(', ')}`
                );
            } else {
                // 自动检测适用的模块
                applicableModules = await this.moduleDetector.detectApplicableModules(
                    requirements
                );
                this.outputChannel.appendLine(
                    `[ModularDesignManager] Auto-detected modules: ${applicableModules.join(', ')}`
                );
            }

            // 3. 过滤已存在的模块（除非强制重新生成）
            this.outputChannel.appendLine(
                '[ModularDesignManager] Step 3: Filtering existing modules'
            );

            let modulesToGenerate: ModuleType[] = applicableModules;

            if (!options.forceRegenerate) {
                const existingModules = await this.getExistingModules(specName);
                modulesToGenerate = applicableModules.filter(
                    type => !existingModules.includes(type)
                );

                const skippedCount = applicableModules.length - modulesToGenerate.length;
                if (skippedCount > 0) {
                    this.outputChannel.appendLine(
                        `[ModularDesignManager] Skipping ${skippedCount} existing modules`
                    );
                    result.skippedModules = applicableModules.filter(
                        type => !modulesToGenerate.includes(type)
                    );
                }
            }

            if (modulesToGenerate.length === 0) {
                this.outputChannel.appendLine(
                    '[ModularDesignManager] No modules to generate'
                );
                return result;
            }

            // 4. 生成模块
            this.outputChannel.appendLine(
                `[ModularDesignManager] Step 4: Generating ${modulesToGenerate.length} modules`
            );

            const parallel = options.parallel !== false; // 默认并行生成
            this.outputChannel.appendLine(
                `[ModularDesignManager] Generation mode: ${parallel ? 'parallel' : 'serial'}`
            );

            if (parallel) {
                // 使用 ParallelExecutor 并行生成
                const tasks: Task<void>[] = modulesToGenerate.map((moduleType, index) => ({
                    id: `generate-${moduleType}`,
                    execute: () => this.generateModuleWithMetadata(specName, moduleType, requirements),
                    priority: index, // 按顺序设置优先级
                    metadata: { moduleType, specName }
                }));

                const executionResult = await this.parallelExecutor.execute(tasks, {
                    maxConcurrency: 4, // 最大并发数
                    stopOnFirstError: false, // 不在首次失败时停止
                    onProgress: (completed, total, currentTask) => {
                        this.outputChannel.appendLine(
                            `[ModularDesignManager] Progress: ${completed}/${total} tasks completed (current: ${currentTask})`
                        );
                    },
                    onTaskStart: (taskId) => {
                        this.outputChannel.appendLine(
                            `[ModularDesignManager] Starting task: ${taskId}`
                        );
                    },
                    onTaskComplete: (taskResult) => {
                        if (taskResult.status === 'success') {
                            this.outputChannel.appendLine(
                                `[ModularDesignManager] Task completed: ${taskResult.taskId} in ${taskResult.duration}ms`
                            );
                        } else if (taskResult.status === 'failed') {
                            this.outputChannel.appendLine(
                                `[ModularDesignManager] Task failed: ${taskResult.taskId} - ${taskResult.error?.message}`
                            );
                        }
                    }
                });

                // 处理执行结果
                executionResult.results.forEach((taskResult) => {
                    const moduleType = modulesToGenerate.find(
                        type => `generate-${type}` === taskResult.taskId
                    );

                    if (!moduleType) {
                        return;
                    }

                    if (taskResult.status === 'success') {
                        result.generatedModules.push(moduleType);
                    } else if (taskResult.status === 'failed') {
                        result.failedModules.push({
                            type: moduleType,
                            error: taskResult.error?.message || 'Unknown error'
                        });
                        result.success = false;
                    }
                });

                // 记录性能统计
                this.outputChannel.appendLine('');
                this.outputChannel.appendLine('[ModularDesignManager] Parallel Execution Statistics:');
                this.outputChannel.appendLine(`  - Total tasks: ${executionResult.stats.totalTasks}`);
                this.outputChannel.appendLine(`  - Success: ${executionResult.stats.successCount}`);
                this.outputChannel.appendLine(`  - Failed: ${executionResult.stats.failedCount}`);
                this.outputChannel.appendLine(`  - Skipped: ${executionResult.stats.skippedCount}`);
                this.outputChannel.appendLine(`  - Total duration: ${executionResult.stats.totalDuration}ms`);
                this.outputChannel.appendLine(`  - Average task duration: ${executionResult.stats.averageDuration.toFixed(2)}ms`);
                this.outputChannel.appendLine(`  - Max task duration: ${executionResult.stats.maxDuration}ms`);
                this.outputChannel.appendLine(`  - Min task duration: ${executionResult.stats.minDuration}ms`);
            } else {
                // 串行生成
                for (const type of modulesToGenerate) {
                    try {
                        await this.generateModuleWithMetadata(specName, type, requirements);
                        result.generatedModules.push(type);
                    } catch (error) {
                        result.failedModules.push({
                            type,
                            error: (error as Error).message
                        });
                        result.success = false;
                    }
                }
            }

            // 5. 刷新缓存
            this.outputChannel.appendLine(
                '[ModularDesignManager] Step 5: Refreshing cache'
            );
            await this.moduleCache.refresh(specName);

            // 记录结果
            this.outputChannel.appendLine('');
            this.outputChannel.appendLine('[ModularDesignManager] Generation completed:');
            this.outputChannel.appendLine(`  - Success: ${result.generatedModules.length}`);
            this.outputChannel.appendLine(`  - Failed: ${result.failedModules.length}`);
            this.outputChannel.appendLine(`  - Skipped: ${result.skippedModules.length}`);
            this.outputChannel.appendLine('='.repeat(80));

            return result;

        } catch (error) {
            this.outputChannel.appendLine(
                `[ModularDesignManager] Generation failed: ${error}`
            );

            await this.errorHandler.handleError(error as Error, {
                operation: 'Generate design modules',
                specName
            });

            result.success = false;
            throw error;
        }
    }

    /**
     * 生成特定的单个模块
     *
     * 生成指定类型的单个模块，不执行自动检测。
     *
     * @param specName Spec 名称
     * @param moduleType 要生成的模块类型
     * @returns Promise，在生成完成后 resolve
     *
     * @example
     * ```typescript
     * await manager.generateSpecificModule('my-feature', ModuleType.Frontend);
     * ```
     */
    async generateSpecificModule(
        specName: string,
        moduleType: ModuleType
    ): Promise<void> {
        this.outputChannel.appendLine(
            `[ModularDesignManager] Generating specific module: ${moduleType} for spec: ${specName}`
        );

        try {
            const requirements = await this.readRequirements(specName);
            await this.generateModuleWithMetadata(specName, moduleType, requirements);

            // 刷新缓存
            await this.moduleCache.refresh(specName);

            this.outputChannel.appendLine(
                `[ModularDesignManager] Module ${moduleType} generated successfully`
            );
        } catch (error) {
            await this.errorHandler.handleError(error as Error, {
                operation: 'Generate specific module',
                specName,
                moduleType
            });

            throw error;
        }
    }

    /**
     * 获取模块列表
     *
     * 返回指定 spec 的所有模块信息，包括文件状态和工作流状态。
     *
     * @param specName Spec 名称
     * @returns 模块信息数组
     *
     * @example
     * ```typescript
     * const modules = await manager.getModuleList('my-feature');
     * modules.forEach(module => {
     *     console.log(`${module.type}: ${module.workflowState}`);
     * });
     * ```
     */
    async getModuleList(specName: string): Promise<ModuleInfo[]> {
        this.outputChannel.appendLine(
            `[ModularDesignManager] Getting module list for spec: ${specName}`
        );

        try {
            // 尝试从缓存获取
            let cachedInfo = await this.moduleCache.get(specName);

            if (!cachedInfo) {
                // 缓存未命中，刷新缓存
                this.outputChannel.appendLine(
                    '[ModularDesignManager] Cache miss, refreshing...'
                );
                cachedInfo = await this.moduleCache.refresh(specName);
            }

            // 加载元数据以获取工作流状态
            const metadata = new ModuleMetadataManager(specName, this.outputChannel);
            await metadata.load();

            // 更新模块信息中的工作流状态
            const modules = await Promise.all(
                cachedInfo.modules.map(async (moduleInfo) => {
                    const state = await metadata.getModuleState(moduleInfo.type);
                    return {
                        ...moduleInfo,
                        workflowState: state
                    };
                })
            );

            this.outputChannel.appendLine(
                `[ModularDesignManager] Found ${modules.length} modules`
            );

            return modules;
        } catch (error) {
            await this.errorHandler.handleError(error as Error, {
                operation: 'Get module list',
                specName
            });

            throw error;
        }
    }

    /**
     * 获取模块内容
     *
     * 读取指定模块的文件内容。
     *
     * @param specName Spec 名称
     * @param moduleType 模块类型
     * @returns 模块文件内容
     * @throws 当文件不存在或读取失败时抛出错误
     *
     * @example
     * ```typescript
     * const content = await manager.getModuleContent('my-feature', ModuleType.Frontend);
     * console.log(content);
     * ```
     */
    async getModuleContent(
        specName: string,
        moduleType: ModuleType
    ): Promise<string> {
        this.outputChannel.appendLine(
            `[ModularDesignManager] Reading module content: ${moduleType} for spec: ${specName}`
        );

        try {
            const filePath = await this.getModuleFilePath(specName, moduleType);
            const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
            return Buffer.from(content).toString('utf-8');
        } catch (error) {
            await this.errorHandler.handleError(error as Error, {
                operation: 'Get module content',
                specName,
                moduleType
            });

            throw error;
        }
    }

    /**
     * 更新模块内容
     *
     * 写入新的模块内容到文件。
     *
     * @param specName Spec 名称
     * @param moduleType 模块类型
     * @param content 新的模块内容
     * @returns Promise，在写入完成后 resolve
     *
     * @example
     * ```typescript
     * await manager.updateModule('my-feature', ModuleType.Frontend, newContent);
     * ```
     */
    async updateModule(
        specName: string,
        moduleType: ModuleType,
        content: string
    ): Promise<void> {
        this.outputChannel.appendLine(
            `[ModularDesignManager] Updating module: ${moduleType} for spec: ${specName}`
        );

        try {
            const filePath = await this.getModuleFilePath(specName, moduleType);

            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(filePath),
                Buffer.from(content)
            );

            // 更新校验和
            const metadata = new ModuleMetadataManager(specName, this.outputChannel);
            await metadata.load();
            await metadata.updateModuleChecksum(moduleType);

            // 刷新缓存
            await this.moduleCache.refresh(specName);

            this.outputChannel.appendLine(
                `[ModularDesignManager] Module ${moduleType} updated successfully`
            );
        } catch (error) {
            await this.errorHandler.handleError(error as Error, {
                operation: 'Update module',
                specName,
                moduleType
            });

            throw error;
        }
    }

    /**
     * 删除模块
     *
     * 删除模块文件和相关元数据。
     *
     * @param specName Spec 名称
     * @param moduleType 模块类型
     * @returns Promise，在删除完成后 resolve
     *
     * @example
     * ```typescript
     * await manager.deleteModule('my-feature', ModuleType.Frontend);
     * ```
     */
    async deleteModule(
        specName: string,
        moduleType: ModuleType
    ): Promise<void> {
        this.outputChannel.appendLine(
            `[ModularDesignManager] Deleting module: ${moduleType} for spec: ${specName}`
        );

        try {
            const filePath = await this.getModuleFilePath(specName, moduleType);

            // 删除文件
            try {
                await vscode.workspace.fs.delete(vscode.Uri.file(filePath));
            } catch (error) {
                // 文件可能不存在，忽略错误
                this.outputChannel.appendLine(
                    `[ModularDesignManager] File not found, skipping deletion: ${filePath}`
                );
            }

            // 删除元数据
            const metadata = new ModuleMetadataManager(specName, this.outputChannel);
            await metadata.load();
            await metadata.deleteModuleMetadata(moduleType);

            // 刷新缓存
            await this.moduleCache.refresh(specName);

            this.outputChannel.appendLine(
                `[ModularDesignManager] Module ${moduleType} deleted successfully`
            );
        } catch (error) {
            await this.errorHandler.handleError(error as Error, {
                operation: 'Delete module',
                specName,
                moduleType
            });

            throw error;
        }
    }

    /**
     * 检查是否为旧版设计
     *
     * 检测指定 spec 是否使用旧版单一 design.md 文件。
     *
     * @param specName Spec 名称
     * @returns 如果存在旧版设计文件返回 true
     *
     * @example
     * ```typescript
     * const isLegacy = await manager.isLegacyDesign('my-feature');
     * if (isLegacy) {
     *     console.log('This spec uses legacy design format');
     * }
     * ```
     */
    async isLegacyDesign(specName: string): Promise<boolean> {
        try {
            return await this.legacyMigrator.detectLegacyDesign(specName);
        } catch (error) {
            this.outputChannel.appendLine(
                `[ModularDesignManager] Error checking legacy design: ${error}`
            );
            return false;
        }
    }

    /**
     * 迁移旧版设计
     *
     * 将旧版 design.md 文件迁移到模块化结构。
     * 这包括：
     * 1. 分析旧文档内容
     * 2. 提取章节并映射到模块
     * 3. 创建模块文件
     * 4. 备份旧文件
     * 5. 创建元数据文件
     *
     * @param specName Spec 名称
     * @returns 迁移结果
     *
     * @example
     * ```typescript
     * const result = await manager.migrateLegacyDesign('my-feature');
     * if (result.success) {
     *     console.log(`Migrated ${result.migratedModules.length} modules`);
     * }
     * ```
     */
    async migrateLegacyDesign(specName: string): Promise<MigrationResult> {
        this.outputChannel.appendLine(
            `[ModularDesignManager] Starting legacy design migration for spec: ${specName}`
        );

        try {
            // 读取旧版 design.md 内容
            const legacyPath = await this.getLegacyDesignPath(specName);
            const content = await vscode.workspace.fs.readFile(vscode.Uri.file(legacyPath));
            const legacyContent = Buffer.from(content).toString('utf-8');

            // 分析内容
            const analysis = this.legacyMigrator.analyzeLegacyContent(legacyContent);

            // 执行迁移
            const result = await this.legacyMigrator.migrateToModules(specName, analysis);

            if (result.success) {
                // 备份旧文件
                await this.legacyMigrator.backupLegacyDesign(specName);

                // 为迁移的模块创建元数据
                const metadata = new ModuleMetadataManager(specName, this.outputChannel);
                await metadata.load();

                for (const moduleType of result.migratedModules) {
                    await metadata.updateModuleState(
                        moduleType,
                        WorkflowState.PendingReview
                    );
                }

                // 刷新缓存
                await this.moduleCache.refresh(specName);

                this.outputChannel.appendLine(
                    `[ModularDesignManager] Migration completed successfully`
                );
            }

            return result;
        } catch (error) {
            await this.errorHandler.handleError(error as Error, {
                operation: 'Migrate legacy design',
                specName
            });

            return {
                success: false,
                migratedModules: [],
                errors: [(error as Error).message]
            };
        }
    }

    /**
     * 获取模块工作流状态
     *
     * 查询指定模块的当前工作流状态。
     *
     * @param specName Spec 名称
     * @param moduleType 模块类型
     * @returns 模块的工作流状态
     *
     * @example
     * ```typescript
     * const state = await manager.getModuleWorkflowState('my-feature', ModuleType.Frontend);
     * console.log(`Frontend module state: ${state}`);
     * ```
     */
    async getModuleWorkflowState(
        specName: string,
        moduleType: ModuleType
    ): Promise<WorkflowState> {
        try {
            const metadata = new ModuleMetadataManager(specName, this.outputChannel);
            await metadata.load();
            return await metadata.getModuleState(moduleType);
        } catch (error) {
            this.outputChannel.appendLine(
                `[ModularDesignManager] Error getting module state: ${error}`
            );
            return WorkflowState.NotGenerated;
        }
    }

    /**
     * 更新模块工作流状态
     *
     * 更新指定模块的工作流状态（如：批准、拒绝）。
     *
     * @param specName Spec 名称
     * @param moduleType 模块类型
     * @param state 新的工作流状态
     * @returns Promise，在更新完成后 resolve
     *
     * @example
     * ```typescript
     * await manager.updateModuleWorkflowState(
     *     'my-feature',
     *     ModuleType.Frontend,
     *     WorkflowState.Approved
     * );
     * ```
     */
    async updateModuleWorkflowState(
        specName: string,
        moduleType: ModuleType,
        state: WorkflowState
    ): Promise<void> {
        this.outputChannel.appendLine(
            `[ModularDesignManager] Updating workflow state: ${moduleType} -> ${state} for spec: ${specName}`
        );

        try {
            const metadata = new ModuleMetadataManager(specName, this.outputChannel);
            await metadata.load();
            await metadata.updateModuleState(moduleType, state);

            // 刷新缓存以更新状态
            await this.moduleCache.refresh(specName);

            this.outputChannel.appendLine(
                `[ModularDesignManager] Workflow state updated successfully`
            );
        } catch (error) {
            await this.errorHandler.handleError(error as Error, {
                operation: 'Update module workflow state',
                specName,
                moduleType
            });

            throw error;
        }
    }

    /**
     * 检查是否可以进入任务阶段
     *
     * 检查所有必需的模块是否都已批准，从而判断是否可以生成任务文档。
     *
     * @param specName Spec 名称
     * @returns 如果可以进入任务阶段返回 true
     *
     * @example
     * ```typescript
     * const canProgress = await manager.canProgressToTasks('my-feature');
     * if (canProgress) {
     *     vscode.window.showInformationMessage('All modules approved! Ready to generate tasks.');
     * }
     * ```
     */
    async canProgressToTasks(specName: string): Promise<boolean> {
        try {
            const metadata = new ModuleMetadataManager(specName, this.outputChannel);
            await metadata.load();
            return await metadata.canProgressToTasks();
        } catch (error) {
            this.outputChannel.appendLine(
                `[ModularDesignManager] Error checking can progress to tasks: ${error}`
            );
            return false;
        }
    }

    // ========================================================================
    // 私有辅助方法
    // ========================================================================

    /**
     * 读取需求文档
     *
     * @param specName Spec 名称
     * @returns 需求文档内容
     * @throws 当文件不存在或读取失败时抛出错误
     * @private
     */
    private async readRequirements(specName: string): Promise<string> {
        const specBasePath = this.configManager.getPath('specs');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const reqPath = path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            specName,
            'requirements.md'
        );

        try {
            const content = await vscode.workspace.fs.readFile(vscode.Uri.file(reqPath));
            return Buffer.from(content).toString();
        } catch (error) {
            throw new Error(`Failed to read requirements.md: ${error}`);
        }
    }

    /**
     * 获取已存在的模块类型列表
     *
     * @param specName Spec 名称
     * @returns 已存在的模块类型数组
     * @private
     */
    private async getExistingModules(specName: string): Promise<ModuleType[]> {
        const moduleList = await this.getModuleList(specName);
        return moduleList.filter(m => m.exists).map(m => m.type);
    }

    /**
     * 生成模块并更新元数据
     *
     * 这是一个内部方法，将模块生成和元数据更新封装在一起。
     *
     * @param specName Spec 名称
     * @param moduleType 模块类型
     * @param requirements 需求文档内容
     * @returns Promise，在生成完成后 resolve
     * @private
     */
    private async generateModuleWithMetadata(
        specName: string,
        moduleType: ModuleType,
        requirements: string
    ): Promise<void> {
        // 生成模块
        await this.moduleGenerator.generateModule(specName, moduleType, requirements);

        // 更新元数据
        const metadata = new ModuleMetadataManager(specName, this.outputChannel);
        await metadata.load();
        await metadata.updateModuleState(moduleType, WorkflowState.PendingReview);

        // 计算并保存校验和
        await metadata.updateModuleChecksum(moduleType);
    }

    /**
     * 获取模块文件路径
     *
     * @param specName Spec 名称
     * @param moduleType 模块类型
     * @returns 模块文件的完整路径
     * @private
     */
    private async getModuleFilePath(
        specName: string,
        moduleType: ModuleType
    ): Promise<string> {
        const specBasePath = this.configManager.getPath('specs');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const fileName = `design-${moduleType}.md`;
        return path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            specName,
            fileName
        );
    }

    /**
     * 获取旧版 design.md 文件路径
     *
     * @param specName Spec 名称
     * @returns 旧版设计文件的完整路径
     * @private
     */
    private async getLegacyDesignPath(specName: string): Promise<string> {
        const specBasePath = this.configManager.getPath('specs');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        return path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            specName,
            'design.md'
        );
    }

    /**
     * 获取缓存统计信息
     *
     * 用于调试和监控。
     *
     * @returns 缓存统计对象
     *
     * @example
     * ```typescript
     * const stats = manager.getCacheStats();
     * console.log(`Cache size: ${stats.size}, TTL: ${stats.ttl}ms`);
     * ```
     */
    getCacheStats(): {
        size: number;
        specs: string[];
        ttl: number;
    } {
        return this.moduleCache.getStats();
    }

    /**
     * 清除指定 spec 的缓存
     *
     * @param specName Spec 名称（可选），如果未指定则清除所有缓存
     *
     * @example
     * ```typescript
     * manager.clearCache('my-feature'); // 清除特定 spec 的缓存
     * manager.clearCache(); // 清除所有缓存
     * ```
     */
    clearCache(specName?: string): void {
        this.moduleCache.clear(specName);
    }
}
