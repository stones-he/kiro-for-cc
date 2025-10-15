/**
 * CrossReferenceAnalyzer - 交叉引用分析类
 *
 * 负责分析设计模块之间的交叉引用关系，检测不一致性，并生成模块间的链接建议。
 * 主要功能：
 * - 提取模块间的引用（API 调用、数据模型、组件、服务引用）
 * - 检测模块间的不一致性（未定义的引用、类型不匹配等）
 * - 生成交叉链接建议
 *
 * 使用场景：
 * - 在生成模块后验证模块间的一致性
 * - 在用户修改模块时检测潜在问题
 * - 为 CodeLens 提供交叉链接信息
 */

import * as vscode from 'vscode';
import {
    ModuleType,
    Reference,
    ReferenceMap,
    Inconsistency,
    CrossLink,
    Location
} from '../../types/modularDesign';

/**
 * 引用模式定义
 *
 * 定义了各种类型引用的正则表达式模式，用于从模块内容中提取引用。
 */
interface ReferencePattern {
    /** 模式名称 */
    name: string;

    /** 正则表达式模式 */
    pattern: RegExp;

    /** 引用类型 */
    type: Reference['referenceType'];

    /** 目标模块类型 */
    targetModule: ModuleType;
}

/**
 * CrossReferenceAnalyzer 类
 *
 * 实现模块间的交叉引用分析功能。
 */
export class CrossReferenceAnalyzer {
    /** 引用模式列表 */
    private referencePatterns: ReferencePattern[];

    /**
     * 构造函数
     *
     * @param outputChannel 输出通道，用于日志记录
     */
    constructor(private outputChannel: vscode.OutputChannel) {
        this.referencePatterns = this.initializeReferencePatterns();
    }

    /**
     * 初始化引用模式
     *
     * 定义用于识别不同类型引用的正则表达式模式。
     *
     * @returns 引用模式列表
     */
    private initializeReferencePatterns(): ReferencePattern[] {
        return [
            // API 端点引用（前端 -> API）
            {
                name: 'API Endpoint Call',
                pattern: /(?:GET|POST|PUT|DELETE|PATCH)\s+[`'"](\/api\/[^`'"]+)[`'"]/gi,
                type: 'api-call',
                targetModule: ModuleType.ServerApi
            },
            {
                name: 'Fetch API Call',
                pattern: /fetch\s*\(\s*[`'"]([^`'"]+)[`'"]/gi,
                type: 'api-call',
                targetModule: ModuleType.ServerApi
            },
            {
                name: 'Axios Call',
                pattern: /axios\s*\.\s*(?:get|post|put|delete|patch)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi,
                type: 'api-call',
                targetModule: ModuleType.ServerApi
            },

            // 数据模型引用（API -> Database）
            {
                name: 'Database Model Reference',
                pattern: /(?:model|Model|entity|Entity):\s*[`'"]?(\w+)[`'"]?/gi,
                type: 'data-model',
                targetModule: ModuleType.ServerDatabase
            },
            {
                name: 'Schema Reference',
                pattern: /(?:schema|Schema):\s*[`'"]?(\w+)[`'"]?/gi,
                type: 'data-model',
                targetModule: ModuleType.ServerDatabase
            },

            // 组件引用（前端）
            {
                name: 'Component Import',
                pattern: /import\s+\{?\s*(\w+)\s*\}?\s+from\s+[`'"].*\/components\//gi,
                type: 'component',
                targetModule: ModuleType.Frontend
            },
            {
                name: 'Component Usage',
                pattern: /<(\w+Component)\s*\/?>/gi,
                type: 'component',
                targetModule: ModuleType.Frontend
            },

            // 服务引用（逻辑层）
            {
                name: 'Service Reference',
                pattern: /(?:service|Service):\s*[`'"]?(\w+)[`'"]?/gi,
                type: 'service',
                targetModule: ModuleType.ServerLogic
            },
            {
                name: 'Business Logic Reference',
                pattern: /(?:businessLogic|BusinessLogic):\s*[`'"]?(\w+)[`'"]?/gi,
                type: 'service',
                targetModule: ModuleType.ServerLogic
            },

            // 测试目标引用（测试 -> 其他模块）
            {
                name: 'Test Target',
                pattern: /(?:test|describe|it)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi,
                type: 'test-target',
                targetModule: ModuleType.Testing
            }
        ];
    }

    /**
     * 分析模块间的引用
     *
     * 扫描所有模块内容，提取模块间的引用关系。
     *
     * @param modules 模块内容映射（模块类型 -> 模块内容）
     * @returns 引用映射
     *
     * @example
     * ```typescript
     * const modules = new Map([
     *     [ModuleType.Frontend, frontendContent],
     *     [ModuleType.ServerApi, apiContent]
     * ]);
     * const referenceMap = analyzer.analyzeReferences(modules);
     * ```
     */
    analyzeReferences(modules: Map<ModuleType, string>): ReferenceMap {
        this.outputChannel.appendLine('[CrossReferenceAnalyzer] Starting reference analysis...');

        const referenceMap: ReferenceMap = {};

        // 遍历每个模块
        for (const [sourceModule, content] of modules.entries()) {
            this.outputChannel.appendLine(`[CrossReferenceAnalyzer] Analyzing module: ${sourceModule}`);

            referenceMap[sourceModule] = {};

            // 应用所有引用模式
            for (const pattern of this.referencePatterns) {
                const references = this.extractReferences(
                    sourceModule,
                    content,
                    pattern
                );

                // 按目标模块分组
                for (const reference of references) {
                    const targetModule = reference.targetModule;

                    if (!referenceMap[sourceModule][targetModule]) {
                        referenceMap[sourceModule][targetModule] = [];
                    }

                    referenceMap[sourceModule][targetModule].push(reference);
                }
            }

            // 统计引用数量
            const totalReferences = Object.values(referenceMap[sourceModule])
                .reduce((sum, refs) => sum + refs.length, 0);

            this.outputChannel.appendLine(
                `[CrossReferenceAnalyzer] Found ${totalReferences} references in ${sourceModule}`
            );
        }

        this.outputChannel.appendLine('[CrossReferenceAnalyzer] Reference analysis completed');

        return referenceMap;
    }

    /**
     * 从模块内容中提取引用
     *
     * 使用指定的模式从内容中提取所有匹配的引用。
     *
     * @param sourceModule 源模块类型
     * @param content 模块内容
     * @param pattern 引用模式
     * @returns 引用列表
     */
    private extractReferences(
        sourceModule: ModuleType,
        content: string,
        pattern: ReferencePattern
    ): Reference[] {
        const references: Reference[] = [];
        const lines = content.split('\n');

        // 重置正则表达式的 lastIndex
        pattern.pattern.lastIndex = 0;

        // 在内容中查找所有匹配
        let match: RegExpExecArray | null;
        let currentLine = 0;
        let currentLineStart = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineStart = currentLineStart;
            currentLineStart += line.length + 1; // +1 for newline

            // 重置模式并在当前行中查找
            const linePattern = new RegExp(pattern.pattern.source, pattern.pattern.flags);
            linePattern.lastIndex = 0;

            while ((match = linePattern.exec(line)) !== null) {
                // 提取引用文本
                const referenceText = match[1] || match[0];

                // 创建引用对象
                references.push({
                    sourceLocation: {
                        line: i + 1, // 行号从 1 开始
                        column: match.index + 1, // 列号从 1 开始
                        fileName: `design-${sourceModule}.md`
                    },
                    targetModule: pattern.targetModule,
                    referenceText: referenceText.trim(),
                    referenceType: pattern.type
                });
            }
        }

        return references;
    }

    /**
     * 检测模块间的不一致性
     *
     * 分析模块内容，检测可能存在的不一致性问题，例如：
     * - 引用了未定义的 API 端点
     * - 引用了不存在的数据模型
     * - 组件引用不匹配
     * - 服务引用缺失
     *
     * @param modules 模块内容映射（模块类型 -> 模块内容）
     * @returns 不一致性列表
     *
     * @example
     * ```typescript
     * const modules = new Map([
     *     [ModuleType.Frontend, frontendContent],
     *     [ModuleType.ServerApi, apiContent]
     * ]);
     * const inconsistencies = analyzer.detectInconsistencies(modules);
     * ```
     */
    detectInconsistencies(modules: Map<ModuleType, string>): Inconsistency[] {
        this.outputChannel.appendLine('[CrossReferenceAnalyzer] Starting inconsistency detection...');

        const inconsistencies: Inconsistency[] = [];

        // 首先分析引用
        const referenceMap = this.analyzeReferences(modules);

        // 检测 API 引用不一致
        inconsistencies.push(...this.detectApiInconsistencies(referenceMap, modules));

        // 检测数据模型不一致
        inconsistencies.push(...this.detectDataModelInconsistencies(referenceMap, modules));

        // 检测组件引用不一致
        inconsistencies.push(...this.detectComponentInconsistencies(referenceMap, modules));

        // 检测服务引用不一致
        inconsistencies.push(...this.detectServiceInconsistencies(referenceMap, modules));

        this.outputChannel.appendLine(
            `[CrossReferenceAnalyzer] Found ${inconsistencies.length} inconsistencies`
        );

        return inconsistencies;
    }

    /**
     * 检测 API 引用不一致
     *
     * 检查前端模块中引用的 API 端点是否在 API 模块中定义。
     *
     * @param referenceMap 引用映射
     * @param modules 模块内容映射
     * @returns API 相关的不一致性列表
     */
    private detectApiInconsistencies(
        referenceMap: ReferenceMap,
        modules: Map<ModuleType, string>
    ): Inconsistency[] {
        const inconsistencies: Inconsistency[] = [];

        // 检查前端模块的 API 引用
        if (referenceMap[ModuleType.Frontend]) {
            const apiRefs = referenceMap[ModuleType.Frontend][ModuleType.ServerApi] || [];
            const apiContent = modules.get(ModuleType.ServerApi) || '';

            for (const ref of apiRefs) {
                // 检查 API 端点是否在 API 模块中定义
                const isApiDefined = this.isApiEndpointDefined(ref.referenceText, apiContent);

                if (!isApiDefined) {
                    inconsistencies.push({
                        module1: ModuleType.Frontend,
                        module2: ModuleType.ServerApi,
                        description: `前端模块引用了未定义的 API 端点: ${ref.referenceText}`,
                        severity: 'error',
                        suggestion: `请在服务端 API 设计模块中定义端点 ${ref.referenceText}，或更正前端代码中的引用。`
                    });
                }
            }
        }

        // 检查移动端模块的 API 引用
        if (referenceMap[ModuleType.Mobile]) {
            const apiRefs = referenceMap[ModuleType.Mobile][ModuleType.ServerApi] || [];
            const apiContent = modules.get(ModuleType.ServerApi) || '';

            for (const ref of apiRefs) {
                const isApiDefined = this.isApiEndpointDefined(ref.referenceText, apiContent);

                if (!isApiDefined) {
                    inconsistencies.push({
                        module1: ModuleType.Mobile,
                        module2: ModuleType.ServerApi,
                        description: `移动端模块引用了未定义的 API 端点: ${ref.referenceText}`,
                        severity: 'error',
                        suggestion: `请在服务端 API 设计模块中定义端点 ${ref.referenceText}，或更正移动端代码中的引用。`
                    });
                }
            }
        }

        return inconsistencies;
    }

    /**
     * 检测数据模型引用不一致
     *
     * 检查 API 或逻辑模块中引用的数据模型是否在数据库模块中定义。
     *
     * @param referenceMap 引用映射
     * @param modules 模块内容映射
     * @returns 数据模型相关的不一致性列表
     */
    private detectDataModelInconsistencies(
        referenceMap: ReferenceMap,
        modules: Map<ModuleType, string>
    ): Inconsistency[] {
        const inconsistencies: Inconsistency[] = [];

        const databaseContent = modules.get(ModuleType.ServerDatabase) || '';

        // 检查 API 模块的数据模型引用
        if (referenceMap[ModuleType.ServerApi]) {
            const modelRefs = referenceMap[ModuleType.ServerApi][ModuleType.ServerDatabase] || [];

            for (const ref of modelRefs) {
                const isModelDefined = this.isDataModelDefined(ref.referenceText, databaseContent);

                if (!isModelDefined) {
                    inconsistencies.push({
                        module1: ModuleType.ServerApi,
                        module2: ModuleType.ServerDatabase,
                        description: `API 模块引用了未定义的数据模型: ${ref.referenceText}`,
                        severity: 'warning',
                        suggestion: `请在数据库设计模块中定义模型 ${ref.referenceText}，或更正 API 代码中的引用。`
                    });
                }
            }
        }

        // 检查逻辑模块的数据模型引用
        if (referenceMap[ModuleType.ServerLogic]) {
            const modelRefs = referenceMap[ModuleType.ServerLogic][ModuleType.ServerDatabase] || [];

            for (const ref of modelRefs) {
                const isModelDefined = this.isDataModelDefined(ref.referenceText, databaseContent);

                if (!isModelDefined) {
                    inconsistencies.push({
                        module1: ModuleType.ServerLogic,
                        module2: ModuleType.ServerDatabase,
                        description: `逻辑模块引用了未定义的数据模型: ${ref.referenceText}`,
                        severity: 'warning',
                        suggestion: `请在数据库设计模块中定义模型 ${ref.referenceText}，或更正逻辑代码中的引用。`
                    });
                }
            }
        }

        return inconsistencies;
    }

    /**
     * 检测组件引用不一致
     *
     * 检查组件引用是否在前端模块中定义。
     *
     * @param referenceMap 引用映射
     * @param modules 模块内容映射
     * @returns 组件相关的不一致性列表
     */
    private detectComponentInconsistencies(
        referenceMap: ReferenceMap,
        modules: Map<ModuleType, string>
    ): Inconsistency[] {
        const inconsistencies: Inconsistency[] = [];

        const frontendContent = modules.get(ModuleType.Frontend) || '';

        // 检查前端模块内的组件引用
        if (referenceMap[ModuleType.Frontend]) {
            const componentRefs = referenceMap[ModuleType.Frontend][ModuleType.Frontend] || [];

            for (const ref of componentRefs) {
                const isComponentDefined = this.isComponentDefined(ref.referenceText, frontendContent);

                if (!isComponentDefined) {
                    inconsistencies.push({
                        module1: ModuleType.Frontend,
                        module2: ModuleType.Frontend,
                        description: `前端模块引用了未定义的组件: ${ref.referenceText}`,
                        severity: 'warning',
                        suggestion: `请在前端设计模块中定义组件 ${ref.referenceText}，或检查组件名称是否正确。`
                    });
                }
            }
        }

        return inconsistencies;
    }

    /**
     * 检测服务引用不一致
     *
     * 检查服务引用是否在逻辑模块中定义。
     *
     * @param referenceMap 引用映射
     * @param modules 模块内容映射
     * @returns 服务相关的不一致性列表
     */
    private detectServiceInconsistencies(
        referenceMap: ReferenceMap,
        modules: Map<ModuleType, string>
    ): Inconsistency[] {
        const inconsistencies: Inconsistency[] = [];

        const logicContent = modules.get(ModuleType.ServerLogic) || '';

        // 检查 API 模块的服务引用
        if (referenceMap[ModuleType.ServerApi]) {
            const serviceRefs = referenceMap[ModuleType.ServerApi][ModuleType.ServerLogic] || [];

            for (const ref of serviceRefs) {
                const isServiceDefined = this.isServiceDefined(ref.referenceText, logicContent);

                if (!isServiceDefined) {
                    inconsistencies.push({
                        module1: ModuleType.ServerApi,
                        module2: ModuleType.ServerLogic,
                        description: `API 模块引用了未定义的服务: ${ref.referenceText}`,
                        severity: 'warning',
                        suggestion: `请在服务端逻辑模块中定义服务 ${ref.referenceText}，或更正 API 代码中的引用。`
                    });
                }
            }
        }

        return inconsistencies;
    }

    /**
     * 检查 API 端点是否定义
     *
     * 在 API 模块内容中查找端点定义。
     *
     * @param endpoint API 端点路径
     * @param apiContent API 模块内容
     * @returns 端点是否已定义
     */
    private isApiEndpointDefined(endpoint: string, apiContent: string): boolean {
        // 检查端点路径是否在内容中出现
        // 支持多种格式：
        // - GET /api/users
        // - `/api/users`
        // - /api/users (in heading or code block)

        // 标准化端点路径（移除查询参数）
        const normalizedEndpoint = endpoint.split('?')[0];

        // 检查是否包含端点路径
        if (apiContent.includes(normalizedEndpoint)) {
            return true;
        }

        // 检查是否在标题中定义（例如: ### GET /api/users）
        const headingPattern = new RegExp(
            `#{1,6}\\s+(?:GET|POST|PUT|DELETE|PATCH)\\s+${this.escapeRegExp(normalizedEndpoint)}`,
            'i'
        );
        if (headingPattern.test(apiContent)) {
            return true;
        }

        return false;
    }

    /**
     * 检查数据模型是否定义
     *
     * 在数据库模块内容中查找模型定义。
     *
     * @param modelName 模型名称
     * @param databaseContent 数据库模块内容
     * @returns 模型是否已定义
     */
    private isDataModelDefined(modelName: string, databaseContent: string): boolean {
        // 检查模型名称是否在内容中出现
        // 支持多种格式：
        // - class User
        // - interface User
        // - model User
        // - ### User Model

        const patterns = [
            new RegExp(`\\b(?:class|interface|model|entity)\\s+${this.escapeRegExp(modelName)}\\b`, 'i'),
            new RegExp(`#{1,6}\\s+${this.escapeRegExp(modelName)}\\s+(?:Model|Entity|Schema)`, 'i'),
            new RegExp(`#{1,6}\\s+${this.escapeRegExp(modelName)}\\b`, 'i')
        ];

        return patterns.some(pattern => pattern.test(databaseContent));
    }

    /**
     * 检查组件是否定义
     *
     * 在前端模块内容中查找组件定义。
     *
     * @param componentName 组件名称
     * @param frontendContent 前端模块内容
     * @returns 组件是否已定义
     */
    private isComponentDefined(componentName: string, frontendContent: string): boolean {
        // 检查组件名称是否在内容中定义
        // 支持多种格式：
        // - function UserComponent
        // - const UserComponent
        // - class UserComponent
        // - ### UserComponent

        const patterns = [
            new RegExp(`\\b(?:function|const|class)\\s+${this.escapeRegExp(componentName)}\\b`, 'i'),
            new RegExp(`#{1,6}\\s+${this.escapeRegExp(componentName)}\\b`, 'i'),
            new RegExp(`\\b${this.escapeRegExp(componentName)}\\s*[=:]`, 'i')
        ];

        return patterns.some(pattern => pattern.test(frontendContent));
    }

    /**
     * 检查服务是否定义
     *
     * 在逻辑模块内容中查找服务定义。
     *
     * @param serviceName 服务名称
     * @param logicContent 逻辑模块内容
     * @returns 服务是否已定义
     */
    private isServiceDefined(serviceName: string, logicContent: string): boolean {
        // 检查服务名称是否在内容中定义
        // 支持多种格式：
        // - class UserService
        // - ### UserService
        // - UserService:

        const patterns = [
            new RegExp(`\\b(?:class|interface|service)\\s+${this.escapeRegExp(serviceName)}\\b`, 'i'),
            new RegExp(`#{1,6}\\s+${this.escapeRegExp(serviceName)}\\b`, 'i'),
            new RegExp(`\\b${this.escapeRegExp(serviceName)}\\s*[=:]`, 'i')
        ];

        return patterns.some(pattern => pattern.test(logicContent));
    }

    /**
     * 生成交叉链接建议
     *
     * 基于模块类型，建议该模块应该链接到哪些其他模块。
     *
     * @param moduleType 当前模块类型
     * @param modules 所有模块内容映射
     * @returns 交叉链接建议列表
     *
     * @example
     * ```typescript
     * const crossLinks = analyzer.generateCrossLinks(
     *     ModuleType.Frontend,
     *     modules
     * );
     * ```
     */
    generateCrossLinks(moduleType: ModuleType, modules: Map<ModuleType, string>): CrossLink[] {
        this.outputChannel.appendLine(
            `[CrossReferenceAnalyzer] Generating cross links for ${moduleType}...`
        );

        const crossLinks: CrossLink[] = [];

        // 根据模块类型生成相关链接
        switch (moduleType) {
            case ModuleType.Frontend:
                // 前端应该链接到 API 和测试
                if (modules.has(ModuleType.ServerApi)) {
                    crossLinks.push({
                        targetModule: ModuleType.ServerApi,
                        linkText: '查看服务端 API 设计',
                        reason: '前端组件需要调用的 API 端点定义'
                    });
                }
                if (modules.has(ModuleType.Testing)) {
                    crossLinks.push({
                        targetModule: ModuleType.Testing,
                        linkText: '查看测试设计',
                        reason: '前端组件的测试策略'
                    });
                }
                break;

            case ModuleType.Mobile:
                // 移动端应该链接到 API 和测试
                if (modules.has(ModuleType.ServerApi)) {
                    crossLinks.push({
                        targetModule: ModuleType.ServerApi,
                        linkText: '查看服务端 API 设计',
                        reason: '移动端应用需要调用的 API 端点定义'
                    });
                }
                if (modules.has(ModuleType.Testing)) {
                    crossLinks.push({
                        targetModule: ModuleType.Testing,
                        linkText: '查看测试设计',
                        reason: '移动端应用的测试策略'
                    });
                }
                break;

            case ModuleType.ServerApi:
                // API 应该链接到逻辑、数据库和测试
                if (modules.has(ModuleType.ServerLogic)) {
                    crossLinks.push({
                        targetModule: ModuleType.ServerLogic,
                        linkText: '查看服务端逻辑设计',
                        reason: 'API 端点的业务逻辑实现'
                    });
                }
                if (modules.has(ModuleType.ServerDatabase)) {
                    crossLinks.push({
                        targetModule: ModuleType.ServerDatabase,
                        linkText: '查看数据库设计',
                        reason: 'API 使用的数据模型定义'
                    });
                }
                if (modules.has(ModuleType.Testing)) {
                    crossLinks.push({
                        targetModule: ModuleType.Testing,
                        linkText: '查看测试设计',
                        reason: 'API 端点的测试策略'
                    });
                }
                break;

            case ModuleType.ServerLogic:
                // 逻辑应该链接到数据库和测试
                if (modules.has(ModuleType.ServerDatabase)) {
                    crossLinks.push({
                        targetModule: ModuleType.ServerDatabase,
                        linkText: '查看数据库设计',
                        reason: '业务逻辑使用的数据模型定义'
                    });
                }
                if (modules.has(ModuleType.Testing)) {
                    crossLinks.push({
                        targetModule: ModuleType.Testing,
                        linkText: '查看测试设计',
                        reason: '业务逻辑的测试策略'
                    });
                }
                break;

            case ModuleType.ServerDatabase:
                // 数据库应该链接到测试
                if (modules.has(ModuleType.Testing)) {
                    crossLinks.push({
                        targetModule: ModuleType.Testing,
                        linkText: '查看测试设计',
                        reason: '数据模型的测试策略'
                    });
                }
                break;

            case ModuleType.Testing:
                // 测试应该链接到所有其他模块
                for (const [type] of modules.entries()) {
                    if (type !== ModuleType.Testing) {
                        crossLinks.push({
                            targetModule: type,
                            linkText: `查看 ${this.getModuleDisplayName(type)}`,
                            reason: `测试覆盖的 ${this.getModuleDisplayName(type)} 模块`
                        });
                    }
                }
                break;
        }

        this.outputChannel.appendLine(
            `[CrossReferenceAnalyzer] Generated ${crossLinks.length} cross links`
        );

        return crossLinks;
    }

    /**
     * 获取模块显示名称
     *
     * @param moduleType 模块类型
     * @returns 模块的中文显示名称
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
     * 转义正则表达式特殊字符
     *
     * @param str 要转义的字符串
     * @returns 转义后的字符串
     */
    private escapeRegExp(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
