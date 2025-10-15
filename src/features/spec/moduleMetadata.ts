import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import {
    ModuleMetadataFile,
    ModuleMetadata,
    ModuleType,
    WorkflowState
} from '../../types/modularDesign';
import { ConfigManager } from '../../utils/configManager';

/**
 * ModuleMetadata 类
 *
 * 管理设计模块的元数据持久化，包括工作流状态、生成时间、批准信息等。
 * 元数据存储在 .module-metadata.json 文件中。
 *
 * 主要功能：
 * - 读取和保存元数据文件
 * - 更新单个模块的状态
 * - 获取模块状态
 * - 检查是否可以进入任务阶段
 * - 计算文件校验和
 *
 * @example
 * ```typescript
 * const metadata = new ModuleMetadata('my-feature', outputChannel);
 * await metadata.load();
 * await metadata.updateModuleState(ModuleType.Frontend, WorkflowState.Approved, { approvedBy: 'user' });
 * const canProgress = await metadata.canProgressToTasks();
 * ```
 */
export class ModuleMetadataManager {
    /** 元数据文件名 */
    private static readonly METADATA_FILE_NAME = '.module-metadata.json';

    /** 元数据文件当前版本 */
    private static readonly CURRENT_VERSION = '1.0';

    /** 缓存的元数据 */
    private metadata: ModuleMetadataFile | null = null;

    /** spec 名称 */
    private specName: string;

    /** 输出通道 */
    private outputChannel: vscode.OutputChannel;

    /** 配置管理器 */
    private configManager: ConfigManager;

    /**
     * 构造函数
     *
     * @param specName spec 名称
     * @param outputChannel 输出通道，用于日志记录
     */
    constructor(specName: string, outputChannel: vscode.OutputChannel) {
        this.specName = specName;
        this.outputChannel = outputChannel;
        this.configManager = ConfigManager.getInstance();
    }

    /**
     * 读取元数据文件
     *
     * 从文件系统读取 .module-metadata.json 文件。
     * 如果文件不存在，返回默认的空元数据结构。
     * 如果文件版本不匹配，会自动迁移到当前版本。
     *
     * @returns 元数据对象
     * @throws 当文件格式无效时抛出错误
     *
     * @example
     * ```typescript
     * const metadata = await metadataManager.load();
     * console.log(metadata.modules);
     * ```
     */
    async load(): Promise<ModuleMetadataFile> {
        const metadataPath = await this.getMetadataFilePath();

        try {
            const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(metadataPath));
            const parsed = JSON.parse(Buffer.from(fileContent).toString());

            // 验证文件格式
            if (!this.isValidMetadata(parsed)) {
                throw new Error('Invalid metadata file format');
            }

            // 检查版本并迁移（如果需要）
            const migrated = await this.migrateIfNeeded(parsed);
            this.metadata = migrated;

            this.outputChannel.appendLine(
                `[ModuleMetadata] Loaded metadata for spec: ${this.specName}`
            );

            return this.metadata;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                // 文件不存在，返回默认元数据
                this.outputChannel.appendLine(
                    `[ModuleMetadata] No metadata file found for spec: ${this.specName}, using defaults`
                );
                this.metadata = this.getDefaultMetadata();
                return this.metadata;
            }

            // 其他错误，重新抛出
            this.outputChannel.appendLine(
                `[ModuleMetadata] Error loading metadata for spec ${this.specName}: ${error}`
            );
            throw error;
        }
    }

    /**
     * 保存元数据文件
     *
     * 将当前元数据保存到文件系统。
     * 如果元数据尚未加载，会先尝试加载。
     *
     * @returns Promise
     * @throws 当文件写入失败时抛出错误
     *
     * @example
     * ```typescript
     * await metadataManager.updateModuleState(ModuleType.Frontend, WorkflowState.Approved);
     * await metadataManager.save();
     * ```
     */
    async save(): Promise<void> {
        // 如果元数据未加载，先加载
        if (!this.metadata) {
            await this.load();
        }

        const metadataPath = await this.getMetadataFilePath();

        // 确保目录存在
        const specDir = path.dirname(metadataPath);
        try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(specDir));
        } catch (error) {
            // 目录可能已存在，忽略错误
        }

        // 保存文件
        const content = JSON.stringify(this.metadata, null, 2);
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(metadataPath),
            Buffer.from(content)
        );

        this.outputChannel.appendLine(
            `[ModuleMetadata] Saved metadata for spec: ${this.specName}`
        );
    }

    /**
     * 更新单个模块的状态
     *
     * 更新指定模块的工作流状态和相关元数据。
     * 更新后会自动重新计算 canProgressToTasks 标志。
     *
     * @param moduleType 模块类型
     * @param state 新的工作流状态
     * @param options 可选的额外信息
     * @param options.approvedBy 批准者（当状态为 Approved 时）
     * @param options.checksum 文件校验和（可选）
     * @returns Promise
     *
     * @example
     * ```typescript
     * await metadataManager.updateModuleState(
     *     ModuleType.Frontend,
     *     WorkflowState.Approved,
     *     { approvedBy: 'user@example.com' }
     * );
     * ```
     */
    async updateModuleState(
        moduleType: ModuleType,
        state: WorkflowState,
        options?: {
            approvedBy?: string;
            checksum?: string;
        }
    ): Promise<void> {
        // 确保元数据已加载
        if (!this.metadata) {
            await this.load();
        }

        const moduleTypeStr = moduleType.toString();

        // 获取或创建模块元数据
        if (!this.metadata!.modules[moduleTypeStr]) {
            this.metadata!.modules[moduleTypeStr] = {
                workflowState: WorkflowState.NotGenerated
            };
        }

        const moduleMetadata = this.metadata!.modules[moduleTypeStr];

        // 更新状态
        moduleMetadata.workflowState = state;

        // 根据状态更新其他字段
        if (state === WorkflowState.PendingReview && !moduleMetadata.generatedAt) {
            moduleMetadata.generatedAt = new Date().toISOString();
        }

        if (state === WorkflowState.Approved) {
            moduleMetadata.approvedAt = new Date().toISOString();
            if (options?.approvedBy) {
                moduleMetadata.approvedBy = options.approvedBy;
            }
        }

        if (options?.checksum) {
            moduleMetadata.checksum = options.checksum;
        }

        // 重新计算是否可以进入任务阶段
        this.metadata!.canProgressToTasks = this.calculateCanProgressToTasks();

        this.outputChannel.appendLine(
            `[ModuleMetadata] Updated module ${moduleType} state to ${state} for spec: ${this.specName}`
        );

        // 自动保存
        await this.save();
    }

    /**
     * 获取单个模块的状态
     *
     * @param moduleType 模块类型
     * @returns 模块的工作流状态
     *
     * @example
     * ```typescript
     * const state = await metadataManager.getModuleState(ModuleType.Frontend);
     * if (state === WorkflowState.Approved) {
     *     console.log('Frontend module is approved');
     * }
     * ```
     */
    async getModuleState(moduleType: ModuleType): Promise<WorkflowState> {
        // 确保元数据已加载
        if (!this.metadata) {
            await this.load();
        }

        const moduleTypeStr = moduleType.toString();
        const moduleMetadata = this.metadata!.modules[moduleTypeStr];

        return moduleMetadata?.workflowState ?? WorkflowState.NotGenerated;
    }

    /**
     * 获取单个模块的完整元数据
     *
     * @param moduleType 模块类型
     * @returns 模块的完整元数据，如果不存在返回 null
     *
     * @example
     * ```typescript
     * const metadata = await metadataManager.getModuleMetadata(ModuleType.Frontend);
     * if (metadata?.approvedAt) {
     *     console.log(`Approved at: ${metadata.approvedAt}`);
     * }
     * ```
     */
    async getModuleMetadata(moduleType: ModuleType): Promise<ModuleMetadata | null> {
        // 确保元数据已加载
        if (!this.metadata) {
            await this.load();
        }

        const moduleTypeStr = moduleType.toString();
        return this.metadata!.modules[moduleTypeStr] ?? null;
    }

    /**
     * 检查是否可以进入任务阶段
     *
     * 检查所有必需的模块是否都已批准。
     * 必需模块的定义：所有已生成的模块（状态不为 NotGenerated）
     *
     * @returns 是否可以进入任务阶段
     *
     * @example
     * ```typescript
     * const canProgress = await metadataManager.canProgressToTasks();
     * if (canProgress) {
     *     vscode.window.showInformationMessage('所有设计模块已批准，可以生成任务！');
     * }
     * ```
     */
    async canProgressToTasks(): Promise<boolean> {
        // 确保元数据已加载
        if (!this.metadata) {
            await this.load();
        }

        return this.metadata!.canProgressToTasks;
    }

    /**
     * 计算文件的校验和
     *
     * 使用 SHA-256 算法计算文件内容的校验和。
     * 用于检测文件内容的外部修改。
     *
     * @param filePath 文件路径
     * @returns 文件的 SHA-256 校验和（十六进制字符串）
     * @throws 当文件读取失败时抛出错误
     *
     * @example
     * ```typescript
     * const checksum = await metadataManager.calculateFileChecksum(
     *     '/path/to/design-frontend.md'
     * );
     * console.log(`Checksum: ${checksum}`);
     * ```
     */
    async calculateFileChecksum(filePath: string): Promise<string> {
        try {
            const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
            const hash = crypto.createHash('sha256');
            hash.update(fileContent);
            return hash.digest('hex');
        } catch (error) {
            this.outputChannel.appendLine(
                `[ModuleMetadata] Error calculating checksum for ${filePath}: ${error}`
            );
            throw error;
        }
    }

    /**
     * 更新模块的校验和
     *
     * 计算指定模块文件的校验和并更新到元数据中。
     *
     * @param moduleType 模块类型
     * @returns Promise
     *
     * @example
     * ```typescript
     * await metadataManager.updateModuleChecksum(ModuleType.Frontend);
     * ```
     */
    async updateModuleChecksum(moduleType: ModuleType): Promise<void> {
        const filePath = await this.getModuleFilePath(moduleType);

        try {
            const checksum = await this.calculateFileChecksum(filePath);
            await this.updateModuleState(moduleType, await this.getModuleState(moduleType), {
                checksum
            });
        } catch (error) {
            // 文件可能不存在，忽略错误
            this.outputChannel.appendLine(
                `[ModuleMetadata] Could not update checksum for ${moduleType}: ${error}`
            );
        }
    }

    /**
     * 检查模块文件是否被外部修改
     *
     * 比较当前文件的校验和与元数据中保存的校验和。
     *
     * @param moduleType 模块类型
     * @returns 如果文件被修改返回 true，否则返回 false
     *
     * @example
     * ```typescript
     * const isModified = await metadataManager.isModuleModified(ModuleType.Frontend);
     * if (isModified) {
     *     vscode.window.showWarningMessage('前端设计模块已被外部修改');
     * }
     * ```
     */
    async isModuleModified(moduleType: ModuleType): Promise<boolean> {
        const moduleMetadata = await this.getModuleMetadata(moduleType);

        if (!moduleMetadata || !moduleMetadata.checksum) {
            // 没有校验和记录，无法判断
            return false;
        }

        try {
            const filePath = await this.getModuleFilePath(moduleType);
            const currentChecksum = await this.calculateFileChecksum(filePath);
            return currentChecksum !== moduleMetadata.checksum;
        } catch (error) {
            // 文件可能不存在
            return false;
        }
    }

    /**
     * 删除模块的元数据
     *
     * 从元数据中删除指定模块的信息。
     *
     * @param moduleType 模块类型
     * @returns Promise
     *
     * @example
     * ```typescript
     * await metadataManager.deleteModuleMetadata(ModuleType.Frontend);
     * ```
     */
    async deleteModuleMetadata(moduleType: ModuleType): Promise<void> {
        // 确保元数据已加载
        if (!this.metadata) {
            await this.load();
        }

        const moduleTypeStr = moduleType.toString();
        delete this.metadata!.modules[moduleTypeStr];

        // 重新计算是否可以进入任务阶段
        this.metadata!.canProgressToTasks = this.calculateCanProgressToTasks();

        this.outputChannel.appendLine(
            `[ModuleMetadata] Deleted metadata for module ${moduleType} in spec: ${this.specName}`
        );

        // 自动保存
        await this.save();
    }

    /**
     * 重置所有模块的元数据
     *
     * 清除所有模块的元数据，恢复到默认状态。
     *
     * @returns Promise
     *
     * @example
     * ```typescript
     * await metadataManager.reset();
     * ```
     */
    async reset(): Promise<void> {
        this.metadata = this.getDefaultMetadata();
        await this.save();

        this.outputChannel.appendLine(
            `[ModuleMetadata] Reset metadata for spec: ${this.specName}`
        );
    }

    /**
     * 获取元数据文件路径
     *
     * @returns 元数据文件的完整路径
     * @private
     */
    private async getMetadataFilePath(): Promise<string> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const specBasePath = this.configManager.getPath('specs');
        return path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            this.specName,
            ModuleMetadataManager.METADATA_FILE_NAME
        );
    }

    /**
     * 获取模块文件路径
     *
     * @param moduleType 模块类型
     * @returns 模块文件的完整路径
     * @private
     */
    private async getModuleFilePath(moduleType: ModuleType): Promise<string> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const specBasePath = this.configManager.getPath('specs');
        const fileName = `design-${moduleType}.md`;

        return path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            this.specName,
            fileName
        );
    }

    /**
     * 获取默认的元数据结构
     *
     * @returns 默认元数据对象
     * @private
     */
    private getDefaultMetadata(): ModuleMetadataFile {
        return {
            version: ModuleMetadataManager.CURRENT_VERSION,
            modules: {},
            canProgressToTasks: false
        };
    }

    /**
     * 验证元数据文件格式是否有效
     *
     * @param data 解析后的 JSON 数据
     * @returns 是否有效
     * @private
     */
    private isValidMetadata(data: any): boolean {
        return (
            data &&
            typeof data === 'object' &&
            typeof data.version === 'string' &&
            typeof data.modules === 'object' &&
            typeof data.canProgressToTasks === 'boolean'
        );
    }

    /**
     * 如果需要，迁移元数据到当前版本
     *
     * @param data 元数据对象
     * @returns 迁移后的元数据对象
     * @private
     */
    private async migrateIfNeeded(data: ModuleMetadataFile): Promise<ModuleMetadataFile> {
        if (data.version === ModuleMetadataManager.CURRENT_VERSION) {
            return data;
        }

        // 未来可以在这里添加版本迁移逻辑
        this.outputChannel.appendLine(
            `[ModuleMetadata] Migrating metadata from version ${data.version} to ${ModuleMetadataManager.CURRENT_VERSION}`
        );

        // 简单地更新版本号
        data.version = ModuleMetadataManager.CURRENT_VERSION;
        return data;
    }

    /**
     * 计算是否可以进入任务阶段
     *
     * 规则：所有已生成的模块（状态不为 NotGenerated）都必须处于 Approved 状态。
     *
     * @returns 是否可以进入任务阶段
     * @private
     */
    private calculateCanProgressToTasks(): boolean {
        if (!this.metadata) {
            return false;
        }

        const modules = Object.values(this.metadata.modules);

        // 如果没有任何模块被生成，不能进入任务阶段
        if (modules.length === 0) {
            return false;
        }

        // 检查所有已生成的模块是否都已批准
        for (const moduleMetadata of modules) {
            if (moduleMetadata.workflowState === WorkflowState.NotGenerated) {
                // 跳过未生成的模块
                continue;
            }

            if (moduleMetadata.workflowState !== WorkflowState.Approved) {
                // 有未批准的已生成模块，不能进入任务阶段
                return false;
            }
        }

        // 所有已生成的模块都已批准
        return true;
    }
}
