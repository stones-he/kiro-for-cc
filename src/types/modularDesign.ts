// ============================================================================
// 模块化设计结构 - 核心类型定义
// ============================================================================

/**
 * 设计模块类型枚举
 *
 * 定义了所有支持的设计模块类型。每个模块类型对应一个独立的设计文档文件。
 */
export enum ModuleType {
    /** 前端设计模块 - 包含组件架构、状态管理、路由、UI/UX 模式 */
    Frontend = 'frontend',

    /** 移动端设计模块 - 包含平台特定设计、原生vs混合决策、离线能力 */
    Mobile = 'mobile',

    /** 服务端 API 设计模块 - 包含 REST/GraphQL 端点、请求/响应模式、认证授权 */
    ServerApi = 'server-api',

    /** 服务端逻辑设计模块 - 包含业务规则、服务层架构、数据处理流程 */
    ServerLogic = 'server-logic',

    /** 服务端数据库设计模块 - 包含实体模型、关系、索引、迁移策略 */
    ServerDatabase = 'server-database',

    /** 测试设计模块 - 包含单元测试、集成测试、E2E 测试策略 */
    Testing = 'testing'
}

/**
 * 模块工作流状态枚举
 *
 * 定义了设计模块在工作流中的状态。状态转换：
 * NotGenerated → PendingReview → (Approved | Rejected)
 * Rejected → PendingReview (重新生成后)
 */
export enum WorkflowState {
    /** 未生成 - 模块尚未创建 */
    NotGenerated = 'not-generated',

    /** 待审核 - 模块已生成，等待用户审核 */
    PendingReview = 'pending-review',

    /** 已批准 - 模块已通过审核 */
    Approved = 'approved',

    /** 已拒绝 - 模块未通过审核，需要重新生成 */
    Rejected = 'rejected'
}

// ============================================================================
// 模块配置
// ============================================================================

/**
 * 模块化设计配置
 *
 * 定义了模块化设计功能的所有配置选项。这些配置可以在 VSCode 设置或
 * .claude/settings/kfc-settings.json 中进行设置。
 */
export interface ModularDesignConfig {
    /** 是否启用模块化设计功能（默认: false，保持向后兼容） */
    enabled: boolean;

    /** 默认生成的模块类型列表 */
    defaultModules: ModuleType[];

    /** 自定义模块定义（可选） */
    customModules?: CustomModuleDefinition[];

    /** 文件命名模式（默认: "design-{moduleType}.md"） */
    fileNamingPattern?: string;

    /** 是否自动检测适用的模块（默认: true） */
    autoDetectModules?: boolean;

    /** 是否并行生成多个模块以提高速度（默认: true） */
    parallelGeneration?: boolean;

    /** 是否启用模块信息缓存（默认: true） */
    cacheEnabled?: boolean;

    /** 缓存过期时间，单位毫秒（默认: 300000，即 5 分钟） */
    cacheTTL?: number;

    /** 是否自动迁移旧版 design.md 文件（默认: false） */
    autoMigrateLegacy?: boolean;

    /** 是否在检测到旧版设计时显示迁移提示（默认: true） */
    showMigrationPrompt?: boolean;

    /** 是否验证模块间的交叉引用（默认: true） */
    validateCrossReferences?: boolean;

    /** 是否在发现不一致性时显示警告（默认: true） */
    warnOnInconsistencies?: boolean;
}

/**
 * 自定义模块定义
 *
 * 允许用户定义自己的设计模块类型，超越默认的 6 种模块类型。
 * 例如：可以定义 "DevOps" 模块、"Security" 模块等。
 */
export interface CustomModuleDefinition {
    /** 自定义模块类型标识符（唯一） */
    type: string;

    /** 模块显示名称（用于 UI） */
    name: string;

    /** 模块文件名 */
    fileName: string;

    /** 自定义提示模板（可选，用于 AI 生成） */
    promptTemplate?: string;

    /** 检测规则（可选，用于自动检测该模块是否适用） */
    detectionRules?: DetectionRule;

    /** VSCode ThemeIcon 名称（可选，用于 TreeView 图标） */
    icon?: string;
}

/**
 * 检测规则
 *
 * 定义了如何检测某个模块是否适用于当前 spec。
 * 基于需求文档中的关键词和正则模式进行匹配。
 */
export interface DetectionRule {
    /** 关键词列表（不区分大小写） */
    keywords: string[];

    /** 正则表达式模式列表 */
    patterns: RegExp[];

    /** 是否默认适用（如果没有匹配到关键词或模式时的默认行为） */
    defaultApplicable: boolean;
}

// ============================================================================
// 模块信息
// ============================================================================

/**
 * 模块信息
 *
 * 描述单个设计模块的状态和元数据。
 */
export interface ModuleInfo {
    /** 模块类型 */
    type: ModuleType;

    /** 模块文件名 */
    fileName: string;

    /** 模块文件是否存在于文件系统中 */
    exists: boolean;

    /** 模块的工作流状态 */
    workflowState: WorkflowState;

    /** 文件最后修改时间（可选） */
    lastModified?: Date;

    /** 文件大小，单位字节（可选） */
    fileSize?: number;

    /** 文件内容校验和（可选，用于检测内容变化） */
    checksum?: string;
}

/**
 * 缓存的模块信息
 *
 * 包含一个 spec 的所有模块信息及缓存元数据。
 * 用于减少文件系统操作，提高性能。
 */
export interface CachedModuleInfo {
    /** 该 spec 的所有模块信息列表 */
    modules: ModuleInfo[];

    /** 缓存最后更新时间 */
    lastUpdated: Date;

    /** 该 spec 是否存在旧版 design.md 文件 */
    hasLegacyDesign: boolean;
}

// ============================================================================
// 生成相关
// ============================================================================

/**
 * 模块生成选项
 *
 * 控制模块生成行为的选项参数。
 */
export interface GenerateOptions {
    /** 要生成的模块类型列表（可选，如果未指定则生成所有适用模块） */
    moduleTypes?: ModuleType[];

    /** 是否强制重新生成已存在的模块（默认: false） */
    forceRegenerate?: boolean;

    /** 是否并行生成多个模块（默认: true） */
    parallel?: boolean;

    /** 生成时是否包含相关模块内容作为上下文（默认: false） */
    includeRelatedModules?: boolean;
}

/**
 * 生成结果
 *
 * 描述模块生成操作的结果，包括成功、失败和跳过的模块。
 */
export interface GenerationResult {
    /** 整体生成是否成功（如果有任何失败则为 false） */
    success: boolean;

    /** 成功生成的模块类型列表 */
    generatedModules: ModuleType[];

    /** 生成失败的模块列表及其错误信息 */
    failedModules: Array<{
        /** 失败的模块类型 */
        type: ModuleType;

        /** 错误消息 */
        error: string;
    }>;

    /** 跳过的模块类型列表（已存在或不适用） */
    skippedModules: ModuleType[];
}

/**
 * 生成上下文
 *
 * 提供给 AI 生成模块内容所需的上下文信息。
 */
export interface GenerationContext {
    /** 需求文档内容 */
    requirements: string;

    /** Spec 名称 */
    specName: string;

    /** 相关模块的内容映射（可选，用于交叉引用） */
    relatedModules?: Map<ModuleType, string>;

    /** 用户自定义指令（可选） */
    customInstructions?: string;
}

// ============================================================================
// 交叉引用
// ============================================================================

/**
 * 引用映射
 *
 * 描述模块间的引用关系。
 * 键为源模块类型，值为该模块引用的其他模块及具体引用列表。
 */
export interface ReferenceMap {
    [sourceModule: string]: {
        [targetModule: string]: Reference[];
    };
}

/**
 * 引用
 *
 * 描述一个具体的模块间引用。
 */
export interface Reference {
    /** 引用发生的源位置 */
    sourceLocation: Location;

    /** 被引用的目标模块类型 */
    targetModule: ModuleType;

    /** 引用的文本内容 */
    referenceText: string;

    /** 引用类型 */
    referenceType: 'api-call' | 'data-model' | 'component' | 'service' | 'test-target';
}

/**
 * 位置信息
 *
 * 描述文件中的具体位置。
 */
export interface Location {
    /** 行号（从 1 开始） */
    line: number;

    /** 列号（从 1 开始） */
    column: number;

    /** 文件名 */
    fileName: string;
}

/**
 * 不一致性
 *
 * 描述模块间检测到的不一致性问题。
 */
export interface Inconsistency {
    /** 涉及的第一个模块 */
    module1: ModuleType;

    /** 涉及的第二个模块 */
    module2: ModuleType;

    /** 不一致性描述 */
    description: string;

    /** 严重级别 */
    severity: 'error' | 'warning';

    /** 修复建议（可选） */
    suggestion?: string;
}

/**
 * 交叉链接
 *
 * 描述一个模块应该链接到另一个模块的建议。
 */
export interface CrossLink {
    /** 目标模块类型 */
    targetModule: ModuleType;

    /** 链接文本 */
    linkText: string;

    /** 链接原因说明 */
    reason: string;
}

// ============================================================================
// 迁移相关
// ============================================================================

/**
 * 内容分析
 *
 * 旧版 design.md 文件的内容分析结果。
 */
export interface ContentAnalysis {
    /** 章节映射（章节标题 → 章节对象） */
    sections: Map<string, Section>;

    /** 建议的模块映射（模块类型 → 章节标题列表） */
    suggestedModuleMapping: Map<ModuleType, string[]>;
}

/**
 * 章节
 *
 * 描述旧版设计文档中的一个章节。
 */
export interface Section {
    /** 章节标题 */
    title: string;

    /** 章节内容 */
    content: string;

    /** 章节起始行号 */
    startLine: number;

    /** 章节结束行号 */
    endLine: number;

    /** 建议映射到的模块类型 */
    suggestedModule: ModuleType;

    /** 置信度（0-1 之间） */
    confidence: number;
}

/**
 * 迁移结果
 *
 * 描述旧版设计文档迁移操作的结果。
 */
export interface MigrationResult {
    /** 迁移是否成功 */
    success: boolean;

    /** 成功迁移的模块类型列表 */
    migratedModules: ModuleType[];

    /** 迁移过程中的错误列表（可选） */
    errors?: string[];
}

// ============================================================================
// 错误处理
// ============================================================================

/**
 * 错误类别枚举
 *
 * 用于分类和处理不同类型的错误。
 */
export enum ErrorCategory {
    /** 文件系统错误（权限、不存在、磁盘已满等） */
    FileSystem = 'filesystem',

    /** 生成错误（AI 生成失败、内容验证失败等） */
    Generation = 'generation',

    /** 验证错误（数据格式错误、不一致性等） */
    Validation = 'validation',

    /** 网络错误（连接失败、超时等） */
    Network = 'network',

    /** 配置错误（配置无效、缺失等） */
    Configuration = 'configuration'
}

/**
 * 错误上下文
 *
 * 提供错误处理所需的上下文信息。
 */
export interface ErrorContext {
    /** 错误类别 */
    category: ErrorCategory;

    /** 操作名称 */
    operation: string;

    /** 相关的 spec 名称（可选） */
    specName?: string;

    /** 相关的模块类型（可选） */
    moduleType?: ModuleType;

    /** 错误是否可重试 */
    retryable: boolean;

    /** 用户友好的错误消息 */
    userMessage: string;

    /** 技术详细信息（用于日志） */
    technicalDetails: string;
}

// ============================================================================
// 元数据
// ============================================================================

/**
 * 模块元数据
 *
 * 存储在 .module-metadata.json 文件中的模块元数据结构。
 */
export interface ModuleMetadataFile {
    /** 元数据文件格式版本 */
    version: string;

    /** 各模块的元数据映射 */
    modules: {
        [moduleType: string]: ModuleMetadata;
    };

    /** 是否可以进入任务阶段（所有必需模块已批准） */
    canProgressToTasks: boolean;
}

/**
 * 单个模块的元数据
 */
export interface ModuleMetadata {
    /** 模块的工作流状态 */
    workflowState: WorkflowState;

    /** 模块生成时间（ISO 8601 格式） */
    generatedAt?: string;

    /** 模块批准时间（ISO 8601 格式，可选） */
    approvedAt?: string;

    /** 批准者（可选） */
    approvedBy?: string;

    /** 内容校验和（可选，用于检测外部修改） */
    checksum?: string;
}
