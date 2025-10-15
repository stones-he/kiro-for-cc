import * as vscode from 'vscode';
import * as path from 'path';
import { ModuleCache } from './moduleCache';
import { ConfigManager } from '../../utils/configManager';

/**
 * ModuleFileWatcher - 文件系统监听器
 *
 * 职责：
 * - 监听设计模块文件的创建、修改、删除事件
 * - 当文件变化时自动刷新缓存和 TreeView
 * - 实现防抖机制避免频繁刷新
 * - 支持启用/禁用监听
 *
 * 使用场景：
 * - 用户在外部编辑器修改设计模块文件
 * - 其他进程创建或删除模块文件
 * - Git 操作导致的文件变化
 */
export class ModuleFileWatcher {
    private watcher: vscode.FileSystemWatcher | null = null;
    private refreshTimeout: NodeJS.Timeout | undefined;
    private readonly DEBOUNCE_DELAY = 1000; // 1秒防抖延迟
    private isEnabled: boolean = false;
    private affectedSpecs: Set<string> = new Set();

    /**
     * 构造函数
     *
     * @param moduleCache - 模块缓存实例，用于在文件变化时刷新缓存
     * @param outputChannel - VSCode 输出通道，用于日志记录
     * @param refreshCallback - 刷新回调函数，通常用于刷新 TreeView
     */
    constructor(
        private moduleCache: ModuleCache,
        private outputChannel: vscode.OutputChannel,
        private refreshCallback?: () => void
    ) {
        this.outputChannel.appendLine('[ModuleFileWatcher] Initialized');
    }

    /**
     * 启动文件监听器
     *
     * 创建文件系统监听器并注册事件处理函数。
     * 监听所有 design-*.md 文件的变化。
     *
     * @param context - VSCode 扩展上下文，用于注册 disposables
     */
    start(context: vscode.ExtensionContext): void {
        if (this.isEnabled) {
            this.outputChannel.appendLine('[ModuleFileWatcher] Already running');
            return;
        }

        const configManager = ConfigManager.getInstance();
        const specBasePath = configManager.getPath('specs');

        // 创建文件监听器，监听所有设计模块文件
        // 模式: **/{specBasePath}/*/design-*.md
        const pattern = `**/${specBasePath}/*/design-*.md`;
        this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

        this.outputChannel.appendLine(`[ModuleFileWatcher] Watching pattern: ${pattern}`);

        // 注册事件处理函数
        this.watcher.onDidCreate((uri) => this.handleFileEvent('create', uri));
        this.watcher.onDidChange((uri) => this.handleFileEvent('change', uri));
        this.watcher.onDidDelete((uri) => this.handleFileEvent('delete', uri));

        // 将监听器添加到 context subscriptions 中，以便自动清理
        context.subscriptions.push(this.watcher);

        this.isEnabled = true;
        this.outputChannel.appendLine('[ModuleFileWatcher] Started successfully');
    }

    /**
     * 停止文件监听器
     *
     * 释放资源并清理防抖定时器。
     */
    stop(): void {
        if (!this.isEnabled) {
            return;
        }

        // 清除防抖定时器
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = undefined;
        }

        // 释放监听器
        if (this.watcher) {
            this.watcher.dispose();
            this.watcher = null;
        }

        this.isEnabled = false;
        this.affectedSpecs.clear();
        this.outputChannel.appendLine('[ModuleFileWatcher] Stopped');
    }

    /**
     * 检查监听器是否正在运行
     *
     * @returns 如果监听器已启动则返回 true
     */
    isRunning(): boolean {
        return this.isEnabled;
    }

    /**
     * 处理文件事件
     *
     * 当设计模块文件发生变化时调用。
     * 提取 spec 名称并标记为受影响，然后触发防抖刷新。
     *
     * @param eventType - 事件类型（create, change, delete）
     * @param uri - 文件 URI
     */
    private handleFileEvent(eventType: string, uri: vscode.Uri): void {
        try {
            const filePath = uri.fsPath;
            this.outputChannel.appendLine(
                `[ModuleFileWatcher] File ${eventType}: ${filePath}`
            );

            // 提取 spec 名称
            const specName = this.extractSpecName(filePath);
            if (!specName) {
                this.outputChannel.appendLine(
                    '[ModuleFileWatcher] Could not extract spec name, ignoring event'
                );
                return;
            }

            this.outputChannel.appendLine(
                `[ModuleFileWatcher] Spec affected: ${specName}`
            );

            // 将受影响的 spec 添加到集合中
            this.affectedSpecs.add(specName);

            // 触发防抖刷新
            this.scheduleRefresh();
        } catch (error) {
            this.outputChannel.appendLine(
                `[ModuleFileWatcher] Error handling file event: ${error}`
            );
        }
    }

    /**
     * 从文件路径中提取 spec 名称
     *
     * 例如: /path/to/.claude/specs/my-feature/design-frontend.md
     * 返回: my-feature
     *
     * @param filePath - 文件路径
     * @returns spec 名称，如果无法提取则返回 null
     */
    private extractSpecName(filePath: string): string | null {
        try {
            const configManager = ConfigManager.getInstance();
            const specBasePath = configManager.getPath('specs');

            // 标准化路径分隔符
            const normalizedPath = filePath.replace(/\\/g, '/');
            const normalizedBasePath = specBasePath.replace(/\\/g, '/');

            // 查找 spec 基础路径在文件路径中的位置
            const basePathIndex = normalizedPath.indexOf(normalizedBasePath);
            if (basePathIndex === -1) {
                return null;
            }

            // 提取 spec 基础路径之后的部分
            const afterBasePath = normalizedPath.substring(
                basePathIndex + normalizedBasePath.length
            );

            // 移除前导斜杠
            const trimmedPath = afterBasePath.replace(/^\/+/, '');

            // 提取第一个路径段（spec 名称）
            const segments = trimmedPath.split('/');
            if (segments.length < 2) {
                return null;
            }

            const specName = segments[0];
            this.outputChannel.appendLine(
                `[ModuleFileWatcher] Extracted spec name: ${specName} from path: ${filePath}`
            );

            return specName;
        } catch (error) {
            this.outputChannel.appendLine(
                `[ModuleFileWatcher] Error extracting spec name: ${error}`
            );
            return null;
        }
    }

    /**
     * 安排防抖刷新
     *
     * 清除现有的定时器并创建新的定时器。
     * 在防抖延迟后执行实际的刷新操作。
     */
    private scheduleRefresh(): void {
        // 清除现有的定时器
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        // 创建新的定时器
        this.refreshTimeout = setTimeout(() => {
            this.performRefresh();
        }, this.DEBOUNCE_DELAY);

        this.outputChannel.appendLine(
            `[ModuleFileWatcher] Refresh scheduled (${this.DEBOUNCE_DELAY}ms debounce)`
        );
    }

    /**
     * 执行实际的刷新操作
     *
     * 刷新所有受影响的 spec 的缓存，然后调用刷新回调。
     */
    private async performRefresh(): Promise<void> {
        try {
            if (this.affectedSpecs.size === 0) {
                this.outputChannel.appendLine(
                    '[ModuleFileWatcher] No specs to refresh'
                );
                return;
            }

            this.outputChannel.appendLine(
                `[ModuleFileWatcher] Refreshing ${this.affectedSpecs.size} spec(s): ${Array.from(this.affectedSpecs).join(', ')}`
            );

            // 刷新所有受影响的 spec 的缓存
            for (const specName of this.affectedSpecs) {
                try {
                    await this.moduleCache.refresh(specName);
                    this.outputChannel.appendLine(
                        `[ModuleFileWatcher] Cache refreshed for: ${specName}`
                    );
                } catch (error) {
                    this.outputChannel.appendLine(
                        `[ModuleFileWatcher] Failed to refresh cache for ${specName}: ${error}`
                    );
                }
            }

            // 清空受影响的 spec 集合
            this.affectedSpecs.clear();

            // 调用刷新回调（通常用于刷新 TreeView）
            if (this.refreshCallback) {
                this.refreshCallback();
                this.outputChannel.appendLine(
                    '[ModuleFileWatcher] Refresh callback invoked'
                );
            }
        } catch (error) {
            this.outputChannel.appendLine(
                `[ModuleFileWatcher] Error during refresh: ${error}`
            );
        } finally {
            this.refreshTimeout = undefined;
        }
    }

    /**
     * 设置刷新回调函数
     *
     * @param callback - 刷新回调函数
     */
    setRefreshCallback(callback: () => void): void {
        this.refreshCallback = callback;
        this.outputChannel.appendLine('[ModuleFileWatcher] Refresh callback updated');
    }

    /**
     * 手动触发刷新
     *
     * 绕过防抖机制，立即执行刷新操作。
     */
    async triggerRefresh(): Promise<void> {
        this.outputChannel.appendLine('[ModuleFileWatcher] Manual refresh triggered');

        // 清除防抖定时器
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = undefined;
        }

        // 立即执行刷新
        await this.performRefresh();
    }

    /**
     * 获取监听器统计信息
     *
     * 用于调试和监控。
     *
     * @returns 监听器统计对象
     */
    getStats(): {
        isEnabled: boolean;
        affectedSpecsCount: number;
        affectedSpecs: string[];
        hasPendingRefresh: boolean;
    } {
        return {
            isEnabled: this.isEnabled,
            affectedSpecsCount: this.affectedSpecs.size,
            affectedSpecs: Array.from(this.affectedSpecs),
            hasPendingRefresh: this.refreshTimeout !== undefined
        };
    }

    /**
     * 释放资源
     *
     * 清理所有资源，包括监听器和定时器。
     */
    dispose(): void {
        this.stop();
        this.outputChannel.appendLine('[ModuleFileWatcher] Disposed');
    }
}
