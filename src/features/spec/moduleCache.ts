import * as vscode from 'vscode';
import * as path from 'path';
import { ModuleType, WorkflowState, ModuleInfo, CachedModuleInfo } from '../../types/modularDesign';
import { ConfigManager } from '../../utils/configManager';

/**
 * ModuleCache - 模块缓存管理类
 *
 * 职责：
 * - 缓存模块列表和状态信息
 * - 减少文件系统操作
 * - 提供快速的模块信息查询
 *
 * 性能优化：
 * - 使用内存缓存避免重复的文件系统扫描
 * - 实现缓存过期机制（默认 5 分钟 TTL）
 * - 支持手动刷新和失效操作
 */
export class ModuleCache {
    private cache: Map<string, CachedModuleInfo>;
    private readonly CACHE_TTL: number;

    /**
     * 构造函数
     *
     * @param outputChannel - VSCode 输出通道，用于日志记录
     * @param cacheTTL - 缓存过期时间（毫秒），默认 5 分钟
     */
    constructor(
        private outputChannel: vscode.OutputChannel,
        cacheTTL: number = 5 * 60 * 1000
    ) {
        this.cache = new Map();
        this.CACHE_TTL = cacheTTL;
        this.outputChannel.appendLine('[ModuleCache] Initialized with TTL: ' + this.CACHE_TTL + 'ms');
    }

    /**
     * 获取缓存的模块信息
     *
     * @param specName - Spec 名称
     * @returns 缓存的模块信息，如果缓存不存在或已过期则返回 null
     */
    async get(specName: string): Promise<CachedModuleInfo | null> {
        const cached = this.cache.get(specName);

        if (!cached) {
            this.outputChannel.appendLine(`[ModuleCache] Cache miss for ${specName}`);
            return null;
        }

        // 检查缓存是否过期
        const age = Date.now() - cached.lastUpdated.getTime();
        if (age > this.CACHE_TTL) {
            this.outputChannel.appendLine(
                `[ModuleCache] Cache expired for ${specName} (age: ${age}ms, TTL: ${this.CACHE_TTL}ms)`
            );
            this.cache.delete(specName);
            return null;
        }

        this.outputChannel.appendLine(`[ModuleCache] Cache hit for ${specName}`);
        return cached;
    }

    /**
     * 设置缓存的模块信息
     *
     * @param specName - Spec 名称
     * @param info - 要缓存的模块信息
     */
    async set(specName: string, info: CachedModuleInfo): Promise<void> {
        this.cache.set(specName, {
            ...info,
            lastUpdated: new Date()
        });
        this.outputChannel.appendLine(
            `[ModuleCache] Cached ${info.modules.length} modules for ${specName}`
        );
    }

    /**
     * 刷新指定 spec 的缓存
     *
     * 从文件系统重新扫描模块信息并更新缓存。
     *
     * @param specName - Spec 名称
     * @returns 更新后的缓存信息
     */
    async refresh(specName: string): Promise<CachedModuleInfo> {
        this.outputChannel.appendLine(`[ModuleCache] Refreshing cache for ${specName}`);

        try {
            // 从文件系统读取实际状态
            const modules = await this.scanModulesFromFileSystem(specName);
            const hasLegacyDesign = await this.checkLegacyDesign(specName);

            const info: CachedModuleInfo = {
                modules,
                lastUpdated: new Date(),
                hasLegacyDesign
            };

            await this.set(specName, info);
            return info;
        } catch (error) {
            this.outputChannel.appendLine(
                `[ModuleCache] Failed to refresh cache for ${specName}: ${error}`
            );
            throw error;
        }
    }

    /**
     * 清除缓存
     *
     * @param specName - Spec 名称（可选），如果指定则只清除该 spec 的缓存，否则清除所有缓存
     */
    clear(specName?: string): void {
        if (specName) {
            this.cache.delete(specName);
            this.outputChannel.appendLine(`[ModuleCache] Cleared cache for ${specName}`);
        } else {
            this.cache.clear();
            this.outputChannel.appendLine('[ModuleCache] Cleared all cache');
        }
    }

    /**
     * 使指定 spec 的缓存失效
     *
     * 与 clear() 功能相同，但语义更明确表示缓存失效。
     *
     * @param specName - Spec 名称
     */
    invalidate(specName: string): void {
        this.clear(specName);
    }

    /**
     * 从文件系统扫描模块文件
     *
     * 遍历所有预定义的模块类型，检查对应的文件是否存在，
     * 并收集文件元数据（大小、修改时间等）。
     *
     * @param specName - Spec 名称
     * @returns 模块信息数组
     */
    private async scanModulesFromFileSystem(specName: string): Promise<ModuleInfo[]> {
        const configManager = ConfigManager.getInstance();
        const specBasePath = configManager.getPath('specs');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            this.outputChannel.appendLine('[ModuleCache] No workspace folder found');
            return [];
        }

        const specPath = path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            specName
        );

        const moduleInfos: ModuleInfo[] = [];

        // 遍历所有预定义的模块类型
        for (const moduleType of Object.values(ModuleType)) {
            const fileName = `design-${moduleType}.md`;
            const filePath = path.join(specPath, fileName);

            let exists = false;
            let lastModified: Date | undefined;
            let fileSize: number | undefined;

            try {
                const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
                exists = true;
                lastModified = new Date(stat.mtime);
                fileSize = stat.size;

                this.outputChannel.appendLine(
                    `[ModuleCache] Found module ${moduleType} for ${specName} (size: ${fileSize} bytes)`
                );
            } catch {
                // 文件不存在
                this.outputChannel.appendLine(
                    `[ModuleCache] Module ${moduleType} not found for ${specName}`
                );
            }

            moduleInfos.push({
                type: moduleType as ModuleType,
                fileName,
                exists,
                workflowState: WorkflowState.NotGenerated,  // 将从元数据文件读取实际状态
                lastModified,
                fileSize
            });
        }

        return moduleInfos;
    }

    /**
     * 检查是否存在旧版 design.md 文件
     *
     * @param specName - Spec 名称
     * @returns 如果存在旧版文件则返回 true，否则返回 false
     */
    private async checkLegacyDesign(specName: string): Promise<boolean> {
        const configManager = ConfigManager.getInstance();
        const specBasePath = configManager.getPath('specs');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            return false;
        }

        const legacyPath = path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            specName,
            'design.md'
        );

        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(legacyPath));
            this.outputChannel.appendLine(
                `[ModuleCache] Legacy design.md found for ${specName}`
            );
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 获取缓存统计信息
     *
     * 用于调试和监控。
     *
     * @returns 缓存统计对象
     */
    getStats(): {
        size: number;
        specs: string[];
        ttl: number;
    } {
        return {
            size: this.cache.size,
            specs: Array.from(this.cache.keys()),
            ttl: this.CACHE_TTL
        };
    }
}
