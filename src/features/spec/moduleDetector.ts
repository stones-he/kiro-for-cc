/**
 * ModuleDetector - 智能模块检测类
 *
 * 负责分析需求文档内容，智能检测哪些设计模块适用于当前 spec。
 * 基于关键词匹配和正则表达式模式识别来判断技术栈和功能范围。
 *
 * 特性：
 * - 支持中英文关键词检测
 * - 支持正则表达式模式匹配
 * - 可配置的默认适用规则
 * - 支持自定义检测规则
 * - 详细的检测日志输出
 *
 * @example
 * ```typescript
 * const detector = new ModuleDetector(outputChannel);
 * const requirements = "Build a web application with React and REST API";
 * const modules = await detector.detectApplicableModules(requirements);
 * // 返回: [ModuleType.Frontend, ModuleType.ServerApi, ModuleType.ServerLogic, ModuleType.ServerDatabase, ModuleType.Testing]
 * ```
 */

import * as vscode from 'vscode';
import { ModuleType, DetectionRule, CustomModuleDefinition } from '../../types/modularDesign';

/**
 * IModuleDetector 接口
 *
 * 定义模块检测器的公共接口。
 */
export interface IModuleDetector {
    /**
     * 检测适用的模块类型
     *
     * @param requirements 需求文档内容
     * @returns 适用的模块类型列表
     */
    detectApplicableModules(requirements: string): Promise<ModuleType[]>;

    /**
     * 检查特定模块是否适用
     *
     * @param requirements 需求文档内容
     * @param moduleType 要检查的模块类型
     * @returns 该模块是否适用
     */
    isModuleApplicable(requirements: string, moduleType: ModuleType): Promise<boolean>;
}

/**
 * ModuleDetector 类
 *
 * 实现智能模块检测功能，分析需求文档并确定适用的设计模块。
 */
export class ModuleDetector implements IModuleDetector {
    /** 检测规则映射（模块类型 → 检测规则） */
    private detectionRules: Map<ModuleType, DetectionRule>;

    /**
     * 构造函数
     *
     * @param outputChannel VSCode 输出通道，用于日志记录
     * @param customModuleDefinitions 自定义模块定义列表（可选）
     */
    constructor(
        private outputChannel: vscode.OutputChannel,
        customModuleDefinitions?: CustomModuleDefinition[]
    ) {
        this.detectionRules = new Map();
        this.initializeDetectionRules();

        // 加载自定义模块的检测规则
        if (customModuleDefinitions && customModuleDefinitions.length > 0) {
            this.loadCustomModuleRules(customModuleDefinitions);
        }
    }

    /**
     * 初始化检测规则
     *
     * 为每个标准模块类型定义检测规则，包括关键词、正则模式和默认适用性。
     * 规则设计原则：
     * - Frontend: 默认适用（大多数项目都有前端）
     * - Mobile: 仅在明确提及移动端时适用
     * - ServerApi: 默认适用（大多数项目都有后端 API）
     * - ServerLogic: 默认适用（大多数项目都有业务逻辑）
     * - ServerDatabase: 默认适用（大多数项目都需要数据存储）
     * - Testing: 总是适用（所有项目都应该有测试）
     */
    private initializeDetectionRules(): void {
        this.detectionRules = new Map([
            // 前端模块检测规则
            [ModuleType.Frontend, {
                keywords: [
                    // 英文关键词
                    'frontend', 'web', 'ui', 'user interface', 'react', 'vue',
                    'angular', 'component', 'page', 'view', 'browser', 'html',
                    'css', 'javascript', 'typescript', 'webpack', 'vite',
                    'nextjs', 'nuxt', 'svelte', 'ember', 'backbone',
                    // 中文关键词
                    '前端', '界面', '网页', '组件', '页面', '浏览器',
                    '用户界面', 'UI', '网站', 'Web'
                ],
                patterns: [
                    /web\s+application/i,
                    /user\s+interface/i,
                    /frontend\s+component/i,
                    /前端(\s+)?应用/i,
                    /网页(\s+)?应用/i
                ],
                defaultApplicable: true  // 默认适用
            }],

            // 移动端模块检测规则
            [ModuleType.Mobile, {
                keywords: [
                    // 英文关键词
                    'mobile', 'ios', 'android', 'react native',
                    'flutter', 'native app', 'phone', 'tablet', 'mobile app',
                    'swift', 'kotlin', 'objective-c', 'xamarin', 'ionic',
                    'cordova', 'capacitor', 'mobile platform', 'smartphone',
                    // 中文关键词
                    '移动端', '手机', 'APP', '移动应用', '安卓', '苹果',
                    '原生应用', '混合应用', '平板', '手机应用'
                ],
                patterns: [
                    /mobile\s+app/i,
                    /(ios|android)\s+app/i,
                    /移动(\s+)?应用/i,
                    /手机(\s+)?应用/i,
                    /原生(\s+)?应用/i,
                    /native\s+app/i
                ],
                defaultApplicable: false  // 仅在明确提及时适用
            }],

            // 服务端 API 模块检测规则
            [ModuleType.ServerApi, {
                keywords: [
                    // 英文关键词
                    'api', 'endpoint', 'rest', 'graphql', 'http', 'request',
                    'response', 'server', 'backend', 'route', 'controller',
                    'express', 'fastify', 'koa', 'nestjs', 'restful',
                    'microservice', 'service', 'grpc', 'websocket',
                    // 中文关键词
                    '接口', '后端', '服务端', '端点', 'API', '服务器',
                    '后台', '微服务'
                ],
                patterns: [
                    /api\s+endpoint/i,
                    /rest\s+api/i,
                    /backend\s+api/i,
                    /后端(\s+)?接口/i,
                    /服务端(\s+)?接口/i,
                    /RESTful/i
                ],
                defaultApplicable: true  // 默认适用
            }],

            // 服务端逻辑模块检测规则
            [ModuleType.ServerLogic, {
                keywords: [
                    // 英文关键词
                    'business logic', 'service', 'backend', 'server',
                    'processing', 'calculation', 'workflow', 'algorithm',
                    'service layer', 'domain logic', 'use case', 'handler',
                    'processor', 'manager', 'orchestration',
                    // 中文关键词
                    '业务逻辑', '服务层', '处理', '计算', '工作流',
                    '业务规则', '领域逻辑', '业务处理', '数据处理'
                ],
                patterns: [
                    /business\s+logic/i,
                    /service\s+layer/i,
                    /domain\s+logic/i,
                    /业务(\s+)?逻辑/i,
                    /服务(\s+)?层/i
                ],
                defaultApplicable: true  // 默认适用
            }],

            // 服务端数据库模块检测规则
            [ModuleType.ServerDatabase, {
                keywords: [
                    // 英文关键词
                    'database', 'db', 'sql', 'nosql', 'mongodb', 'postgresql',
                    'mysql', 'redis', 'model', 'schema', 'entity', 'table',
                    'collection', 'orm', 'sequelize', 'typeorm', 'prisma',
                    'mongoose', 'knex', 'storage', 'persistence',
                    // 中文关键词
                    '数据库', '数据模型', '表', '实体', '存储', '持久化',
                    '数据存储', 'ORM', '数据层'
                ],
                patterns: [
                    /database\s+schema/i,
                    /data\s+model/i,
                    /(sql|nosql)\s+database/i,
                    /数据库(\s+)?模式/i,
                    /数据(\s+)?模型/i,
                    /实体(\s+)?模型/i
                ],
                defaultApplicable: true  // 默认适用
            }],

            // 测试模块检测规则
            [ModuleType.Testing, {
                keywords: [
                    // 英文关键词
                    'test', 'testing', 'qa', 'quality', 'unit test',
                    'integration test', 'e2e', 'jest', 'mocha', 'cypress',
                    'playwright', 'vitest', 'jasmine', 'karma', 'selenium',
                    'test driven', 'tdd', 'bdd', 'coverage',
                    // 中文关键词
                    '测试', '单元测试', '集成测试', '端到端测试',
                    '测试驱动', '测试覆盖', '质量保证', 'QA'
                ],
                patterns: [
                    /test\s+case/i,
                    /testing\s+strategy/i,
                    /unit\s+test/i,
                    /integration\s+test/i,
                    /测试(\s+)?用例/i,
                    /测试(\s+)?策略/i,
                    /单元(\s+)?测试/i
                ],
                defaultApplicable: true  // 测试总是适用
            }]
        ]);

        this.outputChannel.appendLine('[ModuleDetector] Detection rules initialized');
    }

    /**
     * 检测适用的模块类型
     *
     * 分析需求文档内容，根据检测规则确定哪些模块适用。
     * 检测逻辑：
     * 1. 如果匹配到任何关键词，则模块适用
     * 2. 如果匹配到任何正则模式，则模块适用
     * 3. 如果以上都不匹配，使用默认适用规则
     *
     * @param requirements 需求文档内容
     * @returns 适用的模块类型列表
     */
    async detectApplicableModules(requirements: string): Promise<ModuleType[]> {
        this.outputChannel.appendLine('[ModuleDetector] Starting module detection');
        this.outputChannel.appendLine(`[ModuleDetector] Requirements length: ${requirements.length} characters`);

        const applicable: ModuleType[] = [];
        const normalizedReq = requirements.toLowerCase();

        // 遍历所有检测规则
        for (const [moduleType, rule] of this.detectionRules) {
            let isApplicable = rule.defaultApplicable;
            let matchReason = 'default rule';

            // 检查关键词匹配
            const matchedKeyword = rule.keywords.find(keyword =>
                normalizedReq.includes(keyword.toLowerCase())
            );

            if (matchedKeyword) {
                isApplicable = true;
                matchReason = `keyword: "${matchedKeyword}"`;
            }

            // 检查正则模式匹配
            const matchedPattern = rule.patterns.find(pattern =>
                pattern.test(requirements)
            );

            if (matchedPattern) {
                isApplicable = true;
                matchReason = `pattern: ${matchedPattern.source}`;
            }

            // 记录检测结果
            if (isApplicable) {
                applicable.push(moduleType);
                this.outputChannel.appendLine(
                    `[ModuleDetector] ✓ Module "${moduleType}" is applicable (${matchReason})`
                );
            } else {
                this.outputChannel.appendLine(
                    `[ModuleDetector] ✗ Module "${moduleType}" is not applicable`
                );
            }
        }

        this.outputChannel.appendLine(
            `[ModuleDetector] Detection complete: ${applicable.length} modules applicable`
        );
        this.outputChannel.appendLine(
            `[ModuleDetector] Applicable modules: [${applicable.join(', ')}]`
        );

        return applicable;
    }

    /**
     * 检查特定模块是否适用
     *
     * 检测单个模块类型是否适用于给定的需求文档。
     *
     * @param requirements 需求文档内容
     * @param moduleType 要检查的模块类型
     * @returns 该模块是否适用
     */
    async isModuleApplicable(
        requirements: string,
        moduleType: ModuleType
    ): Promise<boolean> {
        this.outputChannel.appendLine(
            `[ModuleDetector] Checking if module "${moduleType}" is applicable`
        );

        const applicable = await this.detectApplicableModules(requirements);
        const result = applicable.includes(moduleType);

        this.outputChannel.appendLine(
            `[ModuleDetector] Module "${moduleType}" applicability: ${result}`
        );

        return result;
    }

    /**
     * 添加自定义检测规则
     *
     * 允许外部添加或覆盖检测规则，支持自定义模块类型。
     *
     * @param moduleType 模块类型（标准或自定义）
     * @param rule 检测规则
     *
     * @example
     * ```typescript
     * detector.addDetectionRule('devops' as ModuleType, {
     *     keywords: ['docker', 'kubernetes', 'ci/cd'],
     *     patterns: [/deployment/i],
     *     defaultApplicable: false
     * });
     * ```
     */
    addDetectionRule(moduleType: ModuleType | string, rule: DetectionRule): void {
        this.detectionRules.set(moduleType as ModuleType, rule);
        this.outputChannel.appendLine(
            `[ModuleDetector] Added custom detection rule for module "${moduleType}"`
        );
    }

    /**
     * 获取检测规则
     *
     * 返回指定模块类型的检测规则。
     *
     * @param moduleType 模块类型
     * @returns 检测规则，如果不存在则返回 undefined
     */
    getDetectionRule(moduleType: ModuleType): DetectionRule | undefined {
        return this.detectionRules.get(moduleType);
    }

    /**
     * 获取所有检测规则
     *
     * @returns 所有模块类型的检测规则映射
     */
    getAllDetectionRules(): Map<ModuleType, DetectionRule> {
        return new Map(this.detectionRules);
    }

    /**
     * 重置检测规则为默认值
     *
     * 清除所有自定义规则，恢复到初始状态。
     */
    resetDetectionRules(): void {
        this.outputChannel.appendLine('[ModuleDetector] Resetting detection rules to default');
        this.detectionRules.clear();
        this.initializeDetectionRules();
    }

    /**
     * 获取检测统计信息
     *
     * 返回关于检测规则的统计信息，用于调试和监控。
     *
     * @returns 检测规则统计信息
     */
    getDetectionStats(): {
        totalRules: number;
        rulesByModule: Map<ModuleType, { keywords: number; patterns: number }>;
    } {
        const rulesByModule = new Map<ModuleType, { keywords: number; patterns: number }>();

        for (const [moduleType, rule] of this.detectionRules) {
            rulesByModule.set(moduleType, {
                keywords: rule.keywords.length,
                patterns: rule.patterns.length
            });
        }

        return {
            totalRules: this.detectionRules.size,
            rulesByModule
        };
    }

    /**
     * 加载自定义模块的检测规则
     *
     * 从自定义模块定义中提取检测规则并添加到检测规则映射中。
     * 自定义模块可以覆盖标准模块的检测规则。
     *
     * @param customModules 自定义模块定义列表
     */
    private loadCustomModuleRules(customModules: CustomModuleDefinition[]): void {
        this.outputChannel.appendLine(
            `[ModuleDetector] Loading ${customModules.length} custom module rules`
        );

        for (const customModule of customModules) {
            // 如果自定义模块提供了检测规则，则添加或覆盖
            if (customModule.detectionRules) {
                this.addDetectionRule(
                    customModule.type as ModuleType,
                    customModule.detectionRules
                );
                this.outputChannel.appendLine(
                    `[ModuleDetector] Loaded custom rule for module "${customModule.type}"`
                );
            } else {
                // 如果没有提供检测规则，创建一个默认的规则（默认不适用）
                this.addDetectionRule(customModule.type as ModuleType, {
                    keywords: [customModule.type, customModule.name],
                    patterns: [],
                    defaultApplicable: false
                });
                this.outputChannel.appendLine(
                    `[ModuleDetector] Created default rule for custom module "${customModule.type}"`
                );
            }
        }
    }

    /**
     * 更新自定义模块规则
     *
     * 允许在运行时更新自定义模块的检测规则。
     * 这对于支持动态配置变更很有用。
     *
     * @param customModules 新的自定义模块定义列表
     */
    updateCustomModuleRules(customModules: CustomModuleDefinition[]): void {
        this.outputChannel.appendLine(
            '[ModuleDetector] Updating custom module rules'
        );

        // 移除所有非标准模块的检测规则
        const standardModuleTypes = Object.values(ModuleType);
        for (const [moduleType] of this.detectionRules) {
            if (!standardModuleTypes.includes(moduleType)) {
                this.detectionRules.delete(moduleType);
                this.outputChannel.appendLine(
                    `[ModuleDetector] Removed custom rule for "${moduleType}"`
                );
            }
        }

        // 加载新的自定义模块规则
        this.loadCustomModuleRules(customModules);
    }

    /**
     * 检查是否为自定义模块
     *
     * @param moduleType 模块类型
     * @returns 是否为自定义模块（非标准模块）
     */
    isCustomModule(moduleType: string): boolean {
        const standardModuleTypes = Object.values(ModuleType) as string[];
        return !standardModuleTypes.includes(moduleType);
    }

    /**
     * 获取所有自定义模块类型
     *
     * @returns 自定义模块类型列表
     */
    getCustomModuleTypes(): string[] {
        const customTypes: string[] = [];

        for (const [moduleType] of this.detectionRules) {
            if (this.isCustomModule(moduleType as string)) {
                customTypes.push(moduleType as string);
            }
        }

        return customTypes;
    }
}
