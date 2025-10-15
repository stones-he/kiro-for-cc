import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager } from '../utils/configManager';
import { ModuleType } from '../types/modularDesign';

/**
 * DesignModuleCodeLensProvider
 *
 * 为设计模块文件提供 CodeLens 链接，使用户可以快速导航到：
 * - 相关的其他设计模块
 * - requirements.md 文件
 *
 * CodeLens 会显示在文件顶部，提供便捷的导航功能。
 */
export class DesignModuleCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;
    private configManager: ConfigManager;

    constructor() {
        this.configManager = ConfigManager.getInstance();
        this.configManager.loadSettings();

        // 监听配置变化，刷新 CodeLens
        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    /**
     * 提供 CodeLens 列表
     */
    public provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        const specDir = this.configManager.getPath('specs');
        const normalizedSpecDir = specDir.replace(/\\/g, '/');
        const normalizedFileName = document.fileName.replace(/\\/g, '/');

        const specDirSegment = `/${normalizedSpecDir}/`;

        // 检查文件是否为设计模块文件 (design-*.md)
        if (!normalizedFileName.includes(specDirSegment) ||
            !this.isDesignModuleFile(normalizedFileName)) {
            return [];
        }

        // 检查模块化设计功能是否启用
        const settings = this.configManager.getSettings();
        if (!settings?.features?.modularDesign?.enabled) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];

        // 在文件顶部（第一行）添加 CodeLens
        const topRange = new vscode.Range(0, 0, 0, 0);

        // 获取当前模块类型和 spec 名称
        const moduleInfo = this.parseModuleInfo(normalizedFileName, normalizedSpecDir);
        if (!moduleInfo) {
            return [];
        }

        const { specName, currentModuleType } = moduleInfo;

        // 1. 添加导航到 requirements.md 的链接
        codeLenses.push(this.createRequirementsCodeLens(topRange, specName));

        // 2. 添加导航到相关模块的链接
        const relatedModules = this.getRelatedModules(currentModuleType);
        for (const relatedModule of relatedModules) {
            codeLenses.push(this.createModuleCodeLens(topRange, specName, relatedModule));
        }

        return codeLenses;
    }

    /**
     * 解析 CodeLens（可选）
     */
    public resolveCodeLens(
        codeLens: vscode.CodeLens,
        token: vscode.CancellationToken
    ): vscode.CodeLens {
        return codeLens;
    }

    /**
     * 检查文件名是否匹配设计模块文件模式
     */
    private isDesignModuleFile(normalizedFileName: string): boolean {
        // 匹配 design-*.md 模式
        const designModulePattern = /design-[a-z-]+\.md$/;
        return designModulePattern.test(normalizedFileName);
    }

    /**
     * 从文件路径中解析模块信息
     */
    private parseModuleInfo(
        normalizedFileName: string,
        normalizedSpecDir: string
    ): { specName: string; currentModuleType: ModuleType } | null {
        // 提取 spec 名称和模块类型
        // 路径格式: .../specs/{specName}/design-{moduleType}.md
        const specDirSegment = `/${normalizedSpecDir}/`;
        const afterSpecDir = normalizedFileName.split(specDirSegment)[1];
        if (!afterSpecDir) {
            return null;
        }

        const parts = afterSpecDir.split('/');
        if (parts.length < 2) {
            return null;
        }

        const specName = parts[0];
        const fileName = parts[1];

        // 从文件名提取模块类型: design-{moduleType}.md
        const match = fileName.match(/^design-(.+)\.md$/);
        if (!match) {
            return null;
        }

        const moduleTypeStr = match[1];

        // 验证是否为有效的模块类型
        const validModuleTypes = Object.values(ModuleType);
        if (!validModuleTypes.includes(moduleTypeStr as ModuleType)) {
            return null;
        }

        return {
            specName,
            currentModuleType: moduleTypeStr as ModuleType
        };
    }

    /**
     * 创建导航到 requirements.md 的 CodeLens
     */
    private createRequirementsCodeLens(
        range: vscode.Range,
        specName: string
    ): vscode.CodeLens {
        return new vscode.CodeLens(range, {
            title: "📄 Requirements",
            tooltip: "Open requirements document",
            command: "kfc.spec.navigate.requirements",
            arguments: [specName]
        });
    }

    /**
     * 创建导航到其他模块的 CodeLens
     */
    private createModuleCodeLens(
        range: vscode.Range,
        specName: string,
        moduleType: ModuleType
    ): vscode.CodeLens {
        const moduleLabels = this.getModuleLabels();
        const label = moduleLabels[moduleType] || moduleType;

        return new vscode.CodeLens(range, {
            title: `🔗 ${label}`,
            tooltip: `Open ${label} module`,
            command: "kfc.spec.navigate.designModule",
            arguments: [specName, moduleType]
        });
    }

    /**
     * 获取与指定模块相关的其他模块
     *
     * 基于模块间的常见依赖关系返回相关模块列表。
     */
    private getRelatedModules(currentModule: ModuleType): ModuleType[] {
        const relatedModulesMap: Record<ModuleType, ModuleType[]> = {
            [ModuleType.Frontend]: [
                ModuleType.ServerApi,      // 前端通常调用 API
                ModuleType.Testing          // 前端需要测试
            ],
            [ModuleType.Mobile]: [
                ModuleType.ServerApi,      // 移动端通常调用 API
                ModuleType.Testing          // 移动端需要测试
            ],
            [ModuleType.ServerApi]: [
                ModuleType.Frontend,        // API 服务前端
                ModuleType.Mobile,          // API 服务移动端
                ModuleType.ServerLogic,     // API 使用业务逻辑
                ModuleType.ServerDatabase,  // API 访问数据库
                ModuleType.Testing          // API 需要测试
            ],
            [ModuleType.ServerLogic]: [
                ModuleType.ServerApi,       // 逻辑被 API 调用
                ModuleType.ServerDatabase,  // 逻辑访问数据库
                ModuleType.Testing          // 逻辑需要测试
            ],
            [ModuleType.ServerDatabase]: [
                ModuleType.ServerApi,       // 数据库被 API 访问
                ModuleType.ServerLogic,     // 数据库被逻辑层访问
                ModuleType.Testing          // 数据库需要测试
            ],
            [ModuleType.Testing]: [
                ModuleType.Frontend,        // 测试前端
                ModuleType.Mobile,          // 测试移动端
                ModuleType.ServerApi,       // 测试 API
                ModuleType.ServerLogic,     // 测试业务逻辑
                ModuleType.ServerDatabase   // 测试数据库
            ]
        };

        return relatedModulesMap[currentModule] || [];
    }

    /**
     * 获取模块类型的显示标签
     */
    private getModuleLabels(): Record<ModuleType, string> {
        return {
            [ModuleType.Frontend]: '前端设计',
            [ModuleType.Mobile]: '移动端设计',
            [ModuleType.ServerApi]: '服务端 API',
            [ModuleType.ServerLogic]: '服务端逻辑',
            [ModuleType.ServerDatabase]: '数据库设计',
            [ModuleType.Testing]: '测试设计'
        };
    }
}
