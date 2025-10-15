import * as vscode from 'vscode';
import * as path from 'path';
import {
    ModuleType,
    ContentAnalysis,
    Section,
    MigrationResult
} from '../../types/modularDesign';
import { ConfigManager } from '../../utils/configManager';

/**
 * LegacyMigrator - 旧版设计文档迁移类
 *
 * 负责检测和迁移旧版单一 design.md 文件到新的模块化结构。
 * 主要功能：
 * - 检测旧版 design.md 文件的存在
 * - 分析旧文档内容，提取章节
 * - 智能映射章节到对应的设计模块
 * - 提供迁移向导 UI
 * - 执行迁移操作，创建模块文件
 */
export class LegacyMigrator {
    /**
     * 构造函数
     *
     * @param outputChannel VSCode 输出通道，用于记录日志
     */
    constructor(private outputChannel: vscode.OutputChannel) {}

    /**
     * 检测指定 spec 是否存在旧版 design.md 文件
     *
     * @param specName spec 名称
     * @returns 如果存在旧版设计文件返回 true，否则返回 false
     *
     * @example
     * ```typescript
     * const migrator = new LegacyMigrator(outputChannel);
     * const hasLegacy = await migrator.detectLegacyDesign('my-feature');
     * if (hasLegacy) {
     *     console.log('检测到旧版设计文档');
     * }
     * ```
     */
    async detectLegacyDesign(specName: string): Promise<boolean> {
        const configManager = ConfigManager.getInstance();
        const specBasePath = configManager.getPath('specs');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            this.outputChannel.appendLine(
                '[LegacyMigrator] No workspace folder found'
            );
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
                `[LegacyMigrator] Detected legacy design.md in ${specName}`
            );
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 分析旧版设计文档内容
     *
     * 提取文档中的所有章节，并智能推断每个章节应该映射到哪个模块类型。
     *
     * @param content 旧版设计文档的完整内容
     * @returns 内容分析结果，包含章节信息和建议的模块映射
     *
     * @example
     * ```typescript
     * const content = await readFile('design.md');
     * const analysis = migrator.analyzeLegacyContent(content);
     * console.log(`找到 ${analysis.sections.size} 个章节`);
     * ```
     */
    analyzeLegacyContent(content: string): ContentAnalysis {
        this.outputChannel.appendLine(
            '[LegacyMigrator] Analyzing legacy content'
        );

        const sections = this.extractSections(content);
        const suggestedModuleMapping = this.mapSectionsToModules(sections);

        this.outputChannel.appendLine(
            `[LegacyMigrator] Extracted ${sections.size} sections`
        );

        return {
            sections,
            suggestedModuleMapping
        };
    }

    /**
     * 从文档内容中提取所有章节
     *
     * 基于 Markdown 标题（## 或 ###）识别章节，提取章节标题、内容、位置等信息。
     *
     * @param content 文档内容
     * @returns 章节映射（章节标题 → 章节对象）
     */
    private extractSections(content: string): Map<string, Section> {
        const sections = new Map<string, Section>();
        const lines = content.split('\n');
        let currentSection: Section | null = null;
        let currentContent: string[] = [];

        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            // 检测标题 (## 或 ###)
            const headerMatch = line.match(/^(#{2,3})\s+(.+)$/);

            if (headerMatch) {
                // 保存上一个章节
                if (currentSection !== null) {
                    currentSection.content = currentContent.join('\n').trim();
                    currentSection.endLine = index - 1;
                    sections.set(currentSection.title, currentSection);
                }

                // 开始新章节
                const title = headerMatch[2].trim();
                const suggestedModule = this.guessModuleFromTitle(title);
                const confidence = this.calculateConfidence(title, suggestedModule);

                currentSection = {
                    title,
                    content: '',
                    startLine: index,
                    endLine: index,
                    suggestedModule,
                    confidence
                };
                currentContent = [];

                this.outputChannel.appendLine(
                    `[LegacyMigrator] Found section "${title}" → ${suggestedModule} (confidence: ${confidence.toFixed(2)})`
                );
            } else if (currentSection !== null) {
                // 收集当前章节的内容
                currentContent.push(line);
            }
        }

        // 保存最后一个章节
        if (currentSection !== null) {
            currentSection.content = currentContent.join('\n').trim();
            currentSection.endLine = lines.length - 1;
            sections.set(currentSection.title, currentSection);
        }

        return sections;
    }

    /**
     * 根据章节标题推断应该映射到的模块类型
     *
     * 使用关键词匹配来判断章节内容属于哪个模块。
     *
     * @param title 章节标题
     * @returns 建议的模块类型
     */
    private guessModuleFromTitle(title: string): ModuleType {
        const lowerTitle = title.toLowerCase();

        // 前端相关关键词
        if (
            lowerTitle.includes('frontend') ||
            lowerTitle.includes('前端') ||
            lowerTitle.includes('ui') ||
            lowerTitle.includes('user interface') ||
            lowerTitle.includes('component') ||
            lowerTitle.includes('组件') ||
            lowerTitle.includes('页面') ||
            lowerTitle.includes('page') ||
            lowerTitle.includes('view') ||
            lowerTitle.includes('视图') ||
            lowerTitle.includes('react') ||
            lowerTitle.includes('vue') ||
            lowerTitle.includes('angular')
        ) {
            return ModuleType.Frontend;
        }

        // 移动端相关关键词
        if (
            lowerTitle.includes('mobile') ||
            lowerTitle.includes('移动') ||
            lowerTitle.includes('ios') ||
            lowerTitle.includes('android') ||
            lowerTitle.includes('app') ||
            lowerTitle.includes('native') ||
            lowerTitle.includes('flutter') ||
            lowerTitle.includes('react native')
        ) {
            return ModuleType.Mobile;
        }

        // API 相关关键词
        if (
            lowerTitle.includes('api') ||
            lowerTitle.includes('接口') ||
            lowerTitle.includes('endpoint') ||
            lowerTitle.includes('rest') ||
            lowerTitle.includes('graphql') ||
            lowerTitle.includes('route') ||
            lowerTitle.includes('路由') ||
            lowerTitle.includes('controller') ||
            lowerTitle.includes('控制器')
        ) {
            return ModuleType.ServerApi;
        }

        // 数据库相关关键词
        if (
            lowerTitle.includes('database') ||
            lowerTitle.includes('数据库') ||
            lowerTitle.includes('model') ||
            lowerTitle.includes('模型') ||
            lowerTitle.includes('schema') ||
            lowerTitle.includes('模式') ||
            lowerTitle.includes('entity') ||
            lowerTitle.includes('实体') ||
            lowerTitle.includes('table') ||
            lowerTitle.includes('表') ||
            lowerTitle.includes('collection') ||
            lowerTitle.includes('sql') ||
            lowerTitle.includes('nosql')
        ) {
            return ModuleType.ServerDatabase;
        }

        // 测试相关关键词
        if (
            lowerTitle.includes('test') ||
            lowerTitle.includes('测试') ||
            lowerTitle.includes('testing') ||
            lowerTitle.includes('qa') ||
            lowerTitle.includes('quality') ||
            lowerTitle.includes('e2e') ||
            lowerTitle.includes('integration') ||
            lowerTitle.includes('unit')
        ) {
            return ModuleType.Testing;
        }

        // 默认为服务端逻辑
        // 适用于 "business logic", "service", "workflow" 等
        return ModuleType.ServerLogic;
    }

    /**
     * 计算章节映射到模块的置信度
     *
     * 基于关键词匹配强度计算置信度（0-1）。
     *
     * @param title 章节标题
     * @param suggestedModule 建议的模块类型
     * @returns 置信度（0-1 之间）
     */
    private calculateConfidence(title: string, suggestedModule: ModuleType): number {
        const lowerTitle = title.toLowerCase();

        // 定义每个模块的强关键词（高置信度）和弱关键词（中等置信度）
        const strongKeywords: Record<ModuleType, string[]> = {
            [ModuleType.Frontend]: ['frontend', '前端设计', 'ui design', 'component architecture'],
            [ModuleType.Mobile]: ['mobile', '移动端设计', 'ios', 'android', 'app design'],
            [ModuleType.ServerApi]: ['api design', 'api 设计', 'endpoint', 'rest api'],
            [ModuleType.ServerLogic]: ['business logic', '业务逻辑', 'service layer', 'workflow'],
            [ModuleType.ServerDatabase]: ['database design', '数据库设计', 'schema design', 'data model'],
            [ModuleType.Testing]: ['test design', '测试设计', 'testing strategy', 'test plan']
        };

        const weakKeywords: Record<ModuleType, string[]> = {
            [ModuleType.Frontend]: ['ui', 'page', 'view', 'react', 'vue'],
            [ModuleType.Mobile]: ['native', 'hybrid', 'flutter'],
            [ModuleType.ServerApi]: ['api', 'route', 'controller'],
            [ModuleType.ServerLogic]: ['service', 'logic', 'process'],
            [ModuleType.ServerDatabase]: ['database', 'model', 'entity', 'table'],
            [ModuleType.Testing]: ['test', 'qa', 'quality']
        };

        // 检查强关键词
        if (strongKeywords[suggestedModule].some(keyword => lowerTitle.includes(keyword))) {
            return 0.9;
        }

        // 检查弱关键词
        if (weakKeywords[suggestedModule].some(keyword => lowerTitle.includes(keyword))) {
            return 0.7;
        }

        // 如果是默认分配（没有明确关键词），置信度较低
        if (suggestedModule === ModuleType.ServerLogic) {
            return 0.5;
        }

        return 0.6;
    }

    /**
     * 将章节映射到模块
     *
     * 基于章节的建议模块类型，生成模块到章节的映射。
     *
     * @param sections 章节映射
     * @returns 模块到章节标题列表的映射
     */
    private mapSectionsToModules(
        sections: Map<string, Section>
    ): Map<ModuleType, string[]> {
        const mapping = new Map<ModuleType, string[]>();

        for (const [title, section] of sections) {
            const moduleType = section.suggestedModule;

            if (!mapping.has(moduleType)) {
                mapping.set(moduleType, []);
            }

            mapping.get(moduleType)!.push(title);
        }

        this.outputChannel.appendLine(
            '[LegacyMigrator] Module mapping:'
        );
        for (const [moduleType, titles] of mapping) {
            this.outputChannel.appendLine(
                `  ${moduleType}: ${titles.join(', ')}`
            );
        }

        return mapping;
    }

    /**
     * 显示迁移向导对话框
     *
     * 向用户展示迁移选项，询问是否要执行迁移。
     *
     * @param specName spec 名称
     * @returns 用户是否确认迁移（true=迁移，false=取消或稍后）
     *
     * @example
     * ```typescript
     * const shouldMigrate = await migrator.showMigrationWizard('my-feature');
     * if (shouldMigrate) {
     *     await migrator.migrateToModules(...);
     * }
     * ```
     */
    async showMigrationWizard(specName: string): Promise<boolean> {
        // 首先检查是否存在 .no-migrate 标记
        if (await this.hasNoMigrateMarker(specName)) {
            this.outputChannel.appendLine(
                `[LegacyMigrator] ${specName} has .no-migrate marker, skipping prompt`
            );
            return false;
        }

        const message = `检测到 "${specName}" 使用旧的设计文档格式 (design.md)。\n\n是否要迁移到新的模块化结构？这将把单一设计文档拆分为多个专门的模块文件。`;

        const choice = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            '迁移',
            '稍后',
            '不再提示'
        );

        this.outputChannel.appendLine(
            `[LegacyMigrator] User choice for ${specName}: ${choice || 'dismissed'}`
        );

        if (choice === '迁移') {
            return true;
        }

        if (choice === '不再提示') {
            // 在 spec 目录下创建 .no-migrate 标记文件
            await this.createNoMigrateMarker(specName);
            vscode.window.showInformationMessage(
                `已为 "${specName}" 创建不再提示标记。如需迁移，请手动删除 .no-migrate 文件。`
            );
        }

        return false;
    }

    /**
     * 检查是否存在 .no-migrate 标记文件
     *
     * @param specName spec 名称
     * @returns 如果存在标记返回 true，否则返回 false
     */
    private async hasNoMigrateMarker(specName: string): Promise<boolean> {
        const configManager = ConfigManager.getInstance();
        const specBasePath = configManager.getPath('specs');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            return false;
        }

        const markerPath = path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            specName,
            '.no-migrate'
        );

        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(markerPath));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 创建 .no-migrate 标记文件
     *
     * 在 spec 目录下创建一个空的 .no-migrate 文件，表示用户不希望迁移此 spec。
     *
     * @param specName spec 名称
     */
    private async createNoMigrateMarker(specName: string): Promise<void> {
        const configManager = ConfigManager.getInstance();
        const specBasePath = configManager.getPath('specs');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            this.outputChannel.appendLine(
                '[LegacyMigrator] Cannot create .no-migrate marker: no workspace folder'
            );
            return;
        }

        const markerPath = path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            specName,
            '.no-migrate'
        );

        try {
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(markerPath),
                Buffer.from('# This file marks that the user does not want to migrate this spec to modular design.\n')
            );

            this.outputChannel.appendLine(
                `[LegacyMigrator] Created .no-migrate marker for ${specName}`
            );
        } catch (error) {
            this.outputChannel.appendLine(
                `[LegacyMigrator] Failed to create .no-migrate marker: ${error}`
            );
        }
    }

    /**
     * 执行迁移操作
     *
     * 将分析结果转换为实际的模块文件，创建对应的设计模块文档。
     * 注意：此方法不会删除或重命名旧的 design.md 文件，这应该由调用方处理。
     *
     * @param specName spec 名称
     * @param analysis 内容分析结果
     * @returns 迁移结果
     *
     * @example
     * ```typescript
     * const content = await readDesignMd();
     * const analysis = migrator.analyzeLegacyContent(content);
     * const result = await migrator.migrateToModules('my-feature', analysis);
     * if (result.success) {
     *     console.log(`成功迁移 ${result.migratedModules.length} 个模块`);
     * }
     * ```
     */
    async migrateToModules(
        specName: string,
        analysis: ContentAnalysis
    ): Promise<MigrationResult> {
        this.outputChannel.appendLine(
            `[LegacyMigrator] Starting migration for ${specName}`
        );

        const result: MigrationResult = {
            success: true,
            migratedModules: [],
            errors: []
        };

        const configManager = ConfigManager.getInstance();
        const specBasePath = configManager.getPath('specs');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            result.success = false;
            result.errors = ['No workspace folder found'];
            return result;
        }

        const specPath = path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            specName
        );

        // 为每个模块创建文件
        for (const [moduleType, sectionTitles] of analysis.suggestedModuleMapping) {
            try {
                // 构建模块文件内容
                const moduleContent = this.buildModuleContent(
                    moduleType,
                    sectionTitles,
                    analysis.sections
                );

                // 写入模块文件
                const moduleFileName = `design-${moduleType}.md`;
                const modulePath = path.join(specPath, moduleFileName);

                await vscode.workspace.fs.writeFile(
                    vscode.Uri.file(modulePath),
                    Buffer.from(moduleContent)
                );

                result.migratedModules.push(moduleType);
                this.outputChannel.appendLine(
                    `[LegacyMigrator] Created ${moduleFileName} with ${sectionTitles.length} sections`
                );
            } catch (error) {
                const errorMessage = `Failed to create module ${moduleType}: ${error}`;
                result.errors = result.errors || [];
                result.errors.push(errorMessage);
                result.success = false;

                this.outputChannel.appendLine(
                    `[LegacyMigrator] Error: ${errorMessage}`
                );
            }
        }

        if (result.success) {
            this.outputChannel.appendLine(
                `[LegacyMigrator] Migration completed successfully for ${specName}`
            );
        } else {
            this.outputChannel.appendLine(
                `[LegacyMigrator] Migration completed with errors for ${specName}`
            );
        }

        return result;
    }

    /**
     * 构建模块文件内容
     *
     * 从原始章节中提取内容，组装成新的模块文件。
     *
     * @param moduleType 模块类型
     * @param sectionTitles 属于该模块的章节标题列表
     * @param allSections 所有章节的映射
     * @returns 模块文件的完整内容
     */
    private buildModuleContent(
        moduleType: ModuleType,
        sectionTitles: string[],
        allSections: Map<string, Section>
    ): string {
        const lines: string[] = [];

        // 添加文件头部
        lines.push(`# ${this.getModuleDisplayName(moduleType)}`);
        lines.push('');
        lines.push('> 此文档由旧版 design.md 迁移而来');
        lines.push('');

        // 添加每个章节的内容
        for (const sectionTitle of sectionTitles) {
            const section = allSections.get(sectionTitle);
            if (!section) {
                continue;
            }

            // 添加章节标题（保持原有的标题级别）
            lines.push(`## ${section.title}`);
            lines.push('');

            // 添加章节内容
            if (section.content.trim()) {
                lines.push(section.content);
                lines.push('');
            }
        }

        return lines.join('\n');
    }

    /**
     * 获取模块类型的显示名称
     *
     * @param moduleType 模块类型
     * @returns 中文显示名称
     */
    private getModuleDisplayName(moduleType: ModuleType): string {
        const displayNames: Record<ModuleType, string> = {
            [ModuleType.Frontend]: '前端设计',
            [ModuleType.Mobile]: '移动端设计',
            [ModuleType.ServerApi]: '服务端 API 设计',
            [ModuleType.ServerLogic]: '服务端逻辑设计',
            [ModuleType.ServerDatabase]: '数据库设计',
            [ModuleType.Testing]: '测试设计'
        };
        return displayNames[moduleType];
    }

    /**
     * 备份旧版 design.md 文件
     *
     * 将 design.md 重命名为 design.md.backup，保留原始内容作为备份。
     *
     * @param specName spec 名称
     * @returns 备份是否成功
     */
    async backupLegacyDesign(specName: string): Promise<boolean> {
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

        const backupPath = path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            specName,
            'design.md.backup'
        );

        try {
            // 检查旧文件是否存在
            await vscode.workspace.fs.stat(vscode.Uri.file(legacyPath));

            // 重命名为备份文件
            await vscode.workspace.fs.rename(
                vscode.Uri.file(legacyPath),
                vscode.Uri.file(backupPath),
                { overwrite: true }
            );

            this.outputChannel.appendLine(
                `[LegacyMigrator] Backed up design.md to design.md.backup for ${specName}`
            );

            return true;
        } catch (error) {
            this.outputChannel.appendLine(
                `[LegacyMigrator] Failed to backup design.md: ${error}`
            );
            return false;
        }
    }
}
