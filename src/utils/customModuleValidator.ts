/**
 * CustomModuleValidator - 自定义模块验证器
 *
 * 负责验证自定义模块定义的有效性，确保配置正确且可用。
 *
 * 主要验证项：
 * - 必填字段的存在性和格式
 * - 文件名的有效性
 * - 提示模板的语法
 * - 检测规则的完整性
 * - 模块类型的唯一性
 */

import { CustomModuleDefinition, DetectionRule, ModuleType } from '../types/modularDesign';

/**
 * 验证结果接口
 */
export interface ValidationResult {
    /** 是否验证通过 */
    valid: boolean;

    /** 错误信息列表 */
    errors: ValidationError[];

    /** 警告信息列表 */
    warnings: ValidationWarning[];
}

/**
 * 验证错误
 */
export interface ValidationError {
    /** 模块类型（如果适用） */
    moduleType?: string;

    /** 错误字段 */
    field: string;

    /** 错误消息 */
    message: string;

    /** 错误级别 */
    severity: 'error';
}

/**
 * 验证警告
 */
export interface ValidationWarning {
    /** 模块类型（如果适用） */
    moduleType?: string;

    /** 警告字段 */
    field: string;

    /** 警告消息 */
    message: string;

    /** 警告级别 */
    severity: 'warning';
}

/**
 * CustomModuleValidator 类
 */
export class CustomModuleValidator {
    /**
     * 验证自定义模块定义列表
     *
     * @param customModules 自定义模块定义列表
     * @returns 验证结果
     */
    static validate(customModules: CustomModuleDefinition[]): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 检查模块类型的唯一性
        const typeSet = new Set<string>();
        const duplicates = new Set<string>();

        for (const module of customModules) {
            if (typeSet.has(module.type)) {
                duplicates.add(module.type);
            }
            typeSet.add(module.type);
        }

        if (duplicates.size > 0) {
            duplicates.forEach(type => {
                errors.push({
                    moduleType: type,
                    field: 'type',
                    message: `模块类型 "${type}" 重复定义`,
                    severity: 'error'
                });
            });
        }

        // 验证每个模块
        for (const module of customModules) {
            this.validateModule(module, errors, warnings);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 验证单个模块定义
     *
     * @param module 模块定义
     * @param errors 错误列表（输出参数）
     * @param warnings 警告列表（输出参数）
     */
    private static validateModule(
        module: CustomModuleDefinition,
        errors: ValidationError[],
        warnings: ValidationWarning[]
    ): void {
        // 验证必填字段
        this.validateRequiredFields(module, errors);

        // 验证类型字段
        this.validateType(module, errors, warnings);

        // 验证名称字段
        this.validateName(module, errors);

        // 验证文件名
        this.validateFileName(module, errors, warnings);

        // 验证提示模板
        if (module.promptTemplate) {
            this.validatePromptTemplate(module, warnings);
        } else {
            warnings.push({
                moduleType: module.type,
                field: 'promptTemplate',
                message: '未提供提示模板，将使用默认模板',
                severity: 'warning'
            });
        }

        // 验证检测规则
        if (module.detectionRules) {
            this.validateDetectionRules(module, errors, warnings);
        } else {
            warnings.push({
                moduleType: module.type,
                field: 'detectionRules',
                message: '未提供检测规则，将使用模块类型和名称作为默认关键词',
                severity: 'warning'
            });
        }

        // 验证图标
        if (module.icon) {
            this.validateIcon(module, warnings);
        }
    }

    /**
     * 验证必填字段
     */
    private static validateRequiredFields(
        module: CustomModuleDefinition,
        errors: ValidationError[]
    ): void {
        if (!module.type || typeof module.type !== 'string' || module.type.trim() === '') {
            errors.push({
                field: 'type',
                message: '模块类型 (type) 是必填字段且不能为空',
                severity: 'error'
            });
        }

        if (!module.name || typeof module.name !== 'string' || module.name.trim() === '') {
            errors.push({
                moduleType: module.type,
                field: 'name',
                message: '模块名称 (name) 是必填字段且不能为空',
                severity: 'error'
            });
        }

        if (!module.fileName || typeof module.fileName !== 'string' || module.fileName.trim() === '') {
            errors.push({
                moduleType: module.type,
                field: 'fileName',
                message: '文件名 (fileName) 是必填字段且不能为空',
                severity: 'error'
            });
        }
    }

    /**
     * 验证模块类型
     */
    private static validateType(
        module: CustomModuleDefinition,
        errors: ValidationError[],
        warnings: ValidationWarning[]
    ): void {
        if (!module.type) {
            return;
        }

        // 检查是否与标准模块类型冲突
        const standardTypes = Object.values(ModuleType) as string[];
        if (standardTypes.includes(module.type)) {
            warnings.push({
                moduleType: module.type,
                field: 'type',
                message: `模块类型 "${module.type}" 与标准模块类型冲突，将覆盖标准模块的行为`,
                severity: 'warning'
            });
        }

        // 检查类型命名规范（小写字母、数字和连字符）
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(module.type)) {
            errors.push({
                moduleType: module.type,
                field: 'type',
                message: '模块类型应仅包含小写字母、数字和连字符，且不能以连字符开头或结尾',
                severity: 'error'
            });
        }

        // 检查类型长度
        if (module.type.length > 50) {
            errors.push({
                moduleType: module.type,
                field: 'type',
                message: '模块类型长度不应超过 50 个字符',
                severity: 'error'
            });
        }
    }

    /**
     * 验证模块名称
     */
    private static validateName(
        module: CustomModuleDefinition,
        errors: ValidationError[]
    ): void {
        if (!module.name) {
            return;
        }

        // 检查名称长度
        if (module.name.length > 100) {
            errors.push({
                moduleType: module.type,
                field: 'name',
                message: '模块名称长度不应超过 100 个字符',
                severity: 'error'
            });
        }
    }

    /**
     * 验证文件名
     */
    private static validateFileName(
        module: CustomModuleDefinition,
        errors: ValidationError[],
        warnings: ValidationWarning[]
    ): void {
        if (!module.fileName) {
            return;
        }

        // 检查文件扩展名
        if (!module.fileName.endsWith('.md')) {
            warnings.push({
                moduleType: module.type,
                field: 'fileName',
                message: '建议使用 .md 扩展名以保持一致性',
                severity: 'warning'
            });
        }

        // 检查文件名中的非法字符
        const illegalChars = /[<>:"|?*\x00-\x1F]/;
        if (illegalChars.test(module.fileName)) {
            errors.push({
                moduleType: module.type,
                field: 'fileName',
                message: '文件名包含非法字符',
                severity: 'error'
            });
        }

        // 检查文件名是否包含路径分隔符
        if (module.fileName.includes('/') || module.fileName.includes('\\')) {
            errors.push({
                moduleType: module.type,
                field: 'fileName',
                message: '文件名不应包含路径分隔符',
                severity: 'error'
            });
        }

        // 建议的命名模式
        if (!module.fileName.startsWith('design-')) {
            warnings.push({
                moduleType: module.type,
                field: 'fileName',
                message: '建议文件名以 "design-" 开头以保持一致性',
                severity: 'warning'
            });
        }
    }

    /**
     * 验证提示模板
     */
    private static validatePromptTemplate(
        module: CustomModuleDefinition,
        warnings: ValidationWarning[]
    ): void {
        if (!module.promptTemplate) {
            return;
        }

        const template = module.promptTemplate;

        // 检查模板长度
        if (template.length < 100) {
            warnings.push({
                moduleType: module.type,
                field: 'promptTemplate',
                message: '提示模板较短，可能需要更详细的说明以获得更好的生成结果',
                severity: 'warning'
            });
        }

        // 检查是否包含必要的变量占位符
        const requiredVars = ['specName', 'requirements'];
        for (const varName of requiredVars) {
            const pattern = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
            if (!pattern.test(template)) {
                warnings.push({
                    moduleType: module.type,
                    field: 'promptTemplate',
                    message: `建议在提示模板中包含 {{${varName}}} 变量`,
                    severity: 'warning'
                });
            }
        }

        // 检查条件块语法的匹配
        const ifPattern = /\{\{#if\s+[\w.]+\}\}/g;
        const endifPattern = /\{\{\/if\}\}/g;

        const ifMatches = template.match(ifPattern) || [];
        const endifMatches = template.match(endifPattern) || [];

        if (ifMatches.length !== endifMatches.length) {
            warnings.push({
                moduleType: module.type,
                field: 'promptTemplate',
                message: '提示模板中的条件块 {{#if}} 和 {{/if}} 数量不匹配',
                severity: 'warning'
            });
        }
    }

    /**
     * 验证检测规则
     */
    private static validateDetectionRules(
        module: CustomModuleDefinition,
        errors: ValidationError[],
        warnings: ValidationWarning[]
    ): void {
        if (!module.detectionRules) {
            return;
        }

        const rules = module.detectionRules;

        // 验证关键词
        if (!rules.keywords || !Array.isArray(rules.keywords)) {
            errors.push({
                moduleType: module.type,
                field: 'detectionRules.keywords',
                message: '检测规则的关键词 (keywords) 应为数组',
                severity: 'error'
            });
        } else if (rules.keywords.length === 0) {
            warnings.push({
                moduleType: module.type,
                field: 'detectionRules.keywords',
                message: '检测规则未提供任何关键词，可能影响自动检测效果',
                severity: 'warning'
            });
        }

        // 验证正则模式
        if (!rules.patterns || !Array.isArray(rules.patterns)) {
            errors.push({
                moduleType: module.type,
                field: 'detectionRules.patterns',
                message: '检测规则的模式 (patterns) 应为数组',
                severity: 'error'
            });
        } else {
            // 验证每个正则表达式的有效性
            for (let i = 0; i < rules.patterns.length; i++) {
                const pattern = rules.patterns[i];
                if (!(pattern instanceof RegExp)) {
                    errors.push({
                        moduleType: module.type,
                        field: `detectionRules.patterns[${i}]`,
                        message: `模式 [${i}] 不是有效的正则表达式`,
                        severity: 'error'
                    });
                }
            }
        }

        // 验证 defaultApplicable
        if (typeof rules.defaultApplicable !== 'boolean') {
            errors.push({
                moduleType: module.type,
                field: 'detectionRules.defaultApplicable',
                message: 'defaultApplicable 应为布尔值',
                severity: 'error'
            });
        }
    }

    /**
     * 验证图标
     */
    private static validateIcon(
        module: CustomModuleDefinition,
        warnings: ValidationWarning[]
    ): void {
        if (!module.icon) {
            return;
        }

        // 常见的 VSCode ThemeIcon 名称
        const commonIcons = [
            'file', 'folder', 'symbol-class', 'symbol-method', 'symbol-property',
            'symbol-interface', 'symbol-variable', 'symbol-module', 'symbol-package',
            'gear', 'wrench', 'beaker', 'database', 'server', 'cloud', 'rocket',
            'bug', 'check', 'close', 'warning', 'info', 'question'
        ];

        // 如果图标名称不在常见列表中，给出警告
        if (!commonIcons.includes(module.icon)) {
            warnings.push({
                moduleType: module.type,
                field: 'icon',
                message: `图标 "${module.icon}" 可能不是有效的 VSCode ThemeIcon 名称，请确认图标存在`,
                severity: 'warning'
            });
        }
    }

    /**
     * 快速验证（仅检查必填字段）
     *
     * @param customModules 自定义模块定义列表
     * @returns 是否通过快速验证
     */
    static quickValidate(customModules: CustomModuleDefinition[]): boolean {
        for (const module of customModules) {
            if (!module.type || !module.name || !module.fileName) {
                return false;
            }
        }
        return true;
    }

    /**
     * 格式化验证结果为可读字符串
     *
     * @param result 验证结果
     * @returns 格式化的字符串
     */
    static formatValidationResult(result: ValidationResult): string {
        const lines: string[] = [];

        if (result.valid) {
            lines.push('✓ 自定义模块验证通过');
        } else {
            lines.push('✗ 自定义模块验证失败');
        }

        lines.push('');

        if (result.errors.length > 0) {
            lines.push(`错误 (${result.errors.length}):`);
            for (const error of result.errors) {
                const prefix = error.moduleType ? `[${error.moduleType}] ` : '';
                lines.push(`  ✗ ${prefix}${error.field}: ${error.message}`);
            }
            lines.push('');
        }

        if (result.warnings.length > 0) {
            lines.push(`警告 (${result.warnings.length}):`);
            for (const warning of result.warnings) {
                const prefix = warning.moduleType ? `[${warning.moduleType}] ` : '';
                lines.push(`  ⚠ ${prefix}${warning.field}: ${warning.message}`);
            }
        }

        return lines.join('\n');
    }
}
