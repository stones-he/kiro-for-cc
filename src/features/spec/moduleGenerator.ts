/**
 * ModuleGenerator - 模块生成类
 *
 * 负责使用 Claude AI 生成特定类型的设计模块内容。
 * 集成 ClaudeCodeProvider 和模块特定的提示模板。
 *
 * 主要功能：
 * - 根据模块类型生成对应的设计文档
 * - 使用专门的提示模板确保生成内容聚焦于特定领域
 * - 支持交叉引用相关模块内容
 * - 实现错误处理和重试机制
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ClaudeCodeProvider } from '../../providers/claudeCodeProvider';
import { ConfigManager } from '../../utils/configManager';
import { RetryHandler } from '../../utils/retryHandler';
import {
    ModuleType,
    GenerationContext,
    WorkflowState,
    CustomModuleDefinition
} from '../../types/modularDesign';
import * as prompts from '../../prompts/target';

/**
 * ModuleGenerator 类
 *
 * 核心模块生成引擎，负责调用 Claude AI 生成设计模块内容。
 */
export class ModuleGenerator {
    private configManager: ConfigManager;
    private retryHandler: RetryHandler;
    private customModules: Map<string, CustomModuleDefinition>;

    constructor(
        private claudeProvider: ClaudeCodeProvider,
        private outputChannel: vscode.OutputChannel,
        customModuleDefinitions?: CustomModuleDefinition[]
    ) {
        this.configManager = ConfigManager.getInstance();
        this.retryHandler = new RetryHandler();
        this.customModules = new Map();

        // 加载自定义模块定义
        if (customModuleDefinitions && customModuleDefinitions.length > 0) {
            this.loadCustomModules(customModuleDefinitions);
        }
    }

    /**
     * 生成单个设计模块
     *
     * @param specName Spec 名称
     * @param moduleType 要生成的模块类型
     * @param requirements 需求文档内容
     * @param relatedModules 可选的相关模块内容（用于交叉引用）
     * @returns Promise，在生成完成后 resolve
     * @throws 当生成失败且重试耗尽后抛出错误
     */
    async generateModule(
        specName: string,
        moduleType: ModuleType,
        requirements: string,
        relatedModules?: Map<ModuleType, string>
    ): Promise<void> {
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('='.repeat(80));
        this.outputChannel.appendLine(
            `[ModuleGenerator] Generating module: ${moduleType} for spec: ${specName}`
        );
        this.outputChannel.appendLine('='.repeat(80));

        // 构建生成上下文
        const context: GenerationContext = {
            specName,
            requirements,
            relatedModules
        };

        // 获取模块特定的提示
        const prompt = this.getModulePrompt(moduleType, context);

        // 使用重试机制生成模块
        await this.retryHandler.withRetry(
            async () => {
                // 调用 Claude 生成内容
                this.outputChannel.appendLine(
                    `[ModuleGenerator] Invoking Claude for module: ${moduleType}`
                );

                const result = await this.claudeProvider.invokeClaudeHeadless(prompt);

                if (result.exitCode !== 0 && result.exitCode !== undefined) {
                    throw new Error(
                        `Claude Code failed with exit code: ${result.exitCode}`
                    );
                }

                this.outputChannel.appendLine(
                    `[ModuleGenerator] Module ${moduleType} generated successfully`
                );

                // 验证文件是否已创建
                await this.verifyModuleFile(specName, moduleType);
            },
            `Generate module ${moduleType}`,
            {
                maxRetries: 3,
                initialDelay: 2000,
                onRetry: (error, attempt, delay) => {
                    this.outputChannel.appendLine(
                        `[ModuleGenerator] Generation failed (attempt ${attempt}): ${error.message}`
                    );
                    this.outputChannel.appendLine(
                        `[ModuleGenerator] Retrying in ${delay}ms...`
                    );
                }
            }
        );

        this.outputChannel.appendLine(
            `[ModuleGenerator] Module ${moduleType} generation completed`
        );
    }

    /**
     * 获取模块特定的提示内容
     *
     * 根据模块类型加载对应的提示模板，并替换变量。
     *
     * @param moduleType 模块类型
     * @param context 生成上下文
     * @returns 完整的提示字符串
     */
    private getModulePrompt(
        moduleType: ModuleType,
        context: GenerationContext
    ): string {
        // 获取对应模块的提示模板
        const promptModule = this.getPromptModule(moduleType);

        if (!promptModule) {
            throw new Error(`No prompt template found for module type: ${moduleType}`);
        }

        // 准备模板变量
        const variables: Record<string, any> = {
            specName: context.specName,
            requirements: context.requirements
        };

        // 如果有相关模块，添加到变量中
        if (context.relatedModules && context.relatedModules.size > 0) {
            const relatedModulesObj: Record<string, string> = {};
            context.relatedModules.forEach((content, type) => {
                relatedModulesObj[type] = content;
            });
            variables.relatedModules = relatedModulesObj;
        }

        // 替换提示内容中的变量
        let prompt = promptModule.content;

        // 替换简单变量 {{variableName}}
        prompt = prompt.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            return variables[varName] ?? match;
        });

        // 处理条件块 {{#if condition}}...{{/if}}
        prompt = this.processConditionals(prompt, variables);

        return prompt;
    }

    /**
     * 获取提示模块
     *
     * @param moduleType 模块类型
     * @returns 提示模块对象
     */
    private getPromptModule(moduleType: ModuleType): typeof prompts.designFrontend | null {
        // 首先检查是否为自定义模块
        const customModule = this.customModules.get(moduleType as string);
        if (customModule && customModule.promptTemplate) {
            // 返回自定义提示模板（模拟标准提示模块的结构）
            return {
                id: `custom-${customModule.type}`,
                name: customModule.name,
                content: customModule.promptTemplate
            } as any;
        }

        // 标准模块的提示
        switch (moduleType) {
            case ModuleType.Frontend:
                return prompts.designFrontend;
            case ModuleType.Mobile:
                return prompts.designMobile;
            case ModuleType.ServerApi:
                return prompts.designServerApi;
            case ModuleType.ServerLogic:
                return prompts.designServerLogic;
            case ModuleType.ServerDatabase:
                return prompts.designServerDatabase;
            case ModuleType.Testing:
                return prompts.designTesting;
            default:
                return null;
        }
    }

    /**
     * 处理提示中的条件块
     *
     * 支持简单的 Handlebars 风格条件语法：
     * {{#if condition}}...{{/if}}
     * {{#if object.property}}...{{/if}}
     *
     * @param prompt 原始提示内容
     * @param variables 变量对象
     * @returns 处理后的提示内容
     */
    private processConditionals(
        prompt: string,
        variables: Record<string, any>
    ): string {
        // 匹配 {{#if condition}}...{{/if}} 块
        const conditionalRegex = /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

        return prompt.replace(conditionalRegex, (match, condition, content) => {
            // 解析条件路径（支持 object.property 格式）
            const value = this.resolveConditionValue(condition, variables);

            // 如果条件为真，返回内容；否则返回空字符串
            return value ? content : '';
        });
    }

    /**
     * 解析条件值
     *
     * 支持简单路径和嵌套路径（如 "relatedModules.server-api"）
     *
     * @param path 条件路径
     * @param variables 变量对象
     * @returns 解析后的值
     */
    private resolveConditionValue(
        path: string,
        variables: Record<string, any>
    ): any {
        const parts = path.split('.');
        let value: any = variables;

        for (const part of parts) {
            if (value && typeof value === 'object') {
                value = value[part];
            } else {
                return undefined;
            }
        }

        return value;
    }

    /**
     * 验证模块文件是否已创建
     *
     * @param specName Spec 名称
     * @param moduleType 模块类型
     * @throws 如果文件不存在则抛出错误
     */
    private async verifyModuleFile(
        specName: string,
        moduleType: ModuleType
    ): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const specBasePath = this.configManager.getPath('specs');
        const fileName = this.getModuleFileName(moduleType);
        const filePath = path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            specName,
            fileName
        );

        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
            this.outputChannel.appendLine(
                `[ModuleGenerator] Verified module file exists: ${fileName}`
            );
        } catch (error) {
            throw new Error(
                `Module file was not created: ${fileName}. Generation may have failed.`
            );
        }
    }

    /**
     * 批量生成多个模块
     *
     * 支持并行或串行生成。
     *
     * @param specName Spec 名称
     * @param moduleTypes 要生成的模块类型列表
     * @param requirements 需求文档内容
     * @param parallel 是否并行生成（默认 true）
     * @returns 包含成功和失败模块的结果对象
     */
    async generateModules(
        specName: string,
        moduleTypes: ModuleType[],
        requirements: string,
        parallel: boolean = true
    ): Promise<{
        succeeded: ModuleType[];
        failed: Array<{ type: ModuleType; error: Error }>;
    }> {
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine(
            `[ModuleGenerator] Batch generating ${moduleTypes.length} modules`
        );
        this.outputChannel.appendLine(
            `[ModuleGenerator] Parallel mode: ${parallel}`
        );

        const succeeded: ModuleType[] = [];
        const failed: Array<{ type: ModuleType; error: Error }> = [];

        if (parallel) {
            // 并行生成
            const results = await Promise.allSettled(
                moduleTypes.map(type =>
                    this.generateModule(specName, type, requirements)
                )
            );

            results.forEach((result, index) => {
                const moduleType = moduleTypes[index];
                if (result.status === 'fulfilled') {
                    succeeded.push(moduleType);
                } else {
                    failed.push({
                        type: moduleType,
                        error: result.reason
                    });
                }
            });
        } else {
            // 串行生成
            for (const moduleType of moduleTypes) {
                try {
                    await this.generateModule(specName, moduleType, requirements);
                    succeeded.push(moduleType);
                } catch (error) {
                    failed.push({
                        type: moduleType,
                        error: error as Error
                    });
                }
            }
        }

        this.outputChannel.appendLine('');
        this.outputChannel.appendLine(
            `[ModuleGenerator] Batch generation completed. Success: ${succeeded.length}, Failed: ${failed.length}`
        );

        return { succeeded, failed };
    }

    /**
     * 读取已存在的模块内容
     *
     * 用于在生成新模块时提供交叉引用上下文。
     *
     * @param specName Spec 名称
     * @param moduleType 模块类型
     * @returns 模块内容，如果模块不存在则返回 null
     */
    async readModuleContent(
        specName: string,
        moduleType: ModuleType
    ): Promise<string | null> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return null;
        }

        const specBasePath = this.configManager.getPath('specs');
        const fileName = this.getModuleFileName(moduleType);
        const filePath = path.join(
            workspaceFolder.uri.fsPath,
            specBasePath,
            specName,
            fileName
        );

        try {
            const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
            return Buffer.from(content).toString('utf-8');
        } catch (error) {
            // 文件不存在或读取失败
            return null;
        }
    }

    /**
     * 读取多个模块的内容
     *
     * @param specName Spec 名称
     * @param moduleTypes 模块类型列表
     * @returns 模块内容映射（只包含存在的模块）
     */
    async readModuleContents(
        specName: string,
        moduleTypes: ModuleType[]
    ): Promise<Map<ModuleType, string>> {
        const contents = new Map<ModuleType, string>();

        for (const moduleType of moduleTypes) {
            const content = await this.readModuleContent(specName, moduleType);
            if (content) {
                contents.set(moduleType, content);
            }
        }

        return contents;
    }

    /**
     * 生成带有交叉引用的模块
     *
     * 在生成某个模块时，先读取相关模块的内容作为上下文。
     *
     * @param specName Spec 名称
     * @param moduleType 要生成的模块类型
     * @param requirements 需求文档内容
     * @param relatedModuleTypes 相关模块类型列表
     * @returns Promise，在生成完成后 resolve
     */
    async generateModuleWithReferences(
        specName: string,
        moduleType: ModuleType,
        requirements: string,
        relatedModuleTypes: ModuleType[]
    ): Promise<void> {
        this.outputChannel.appendLine(
            `[ModuleGenerator] Generating ${moduleType} with cross-references to: ${relatedModuleTypes.join(', ')}`
        );

        // 读取相关模块内容
        const relatedModules = await this.readModuleContents(
            specName,
            relatedModuleTypes
        );

        if (relatedModules.size > 0) {
            this.outputChannel.appendLine(
                `[ModuleGenerator] Found ${relatedModules.size} related modules for context`
            );
        }

        // 生成模块，包含相关模块内容
        await this.generateModule(specName, moduleType, requirements, relatedModules);
    }

    /**
     * 加载自定义模块定义
     *
     * @param customModules 自定义模块定义列表
     */
    private loadCustomModules(customModules: CustomModuleDefinition[]): void {
        this.outputChannel.appendLine(
            `[ModuleGenerator] Loading ${customModules.length} custom module definitions`
        );

        for (const customModule of customModules) {
            this.customModules.set(customModule.type, customModule);
            this.outputChannel.appendLine(
                `[ModuleGenerator] Loaded custom module: "${customModule.type}" (${customModule.name})`
            );
        }
    }

    /**
     * 更新自定义模块定义
     *
     * @param customModules 新的自定义模块定义列表
     */
    updateCustomModules(customModules: CustomModuleDefinition[]): void {
        this.outputChannel.appendLine(
            '[ModuleGenerator] Updating custom module definitions'
        );

        this.customModules.clear();
        this.loadCustomModules(customModules);
    }

    /**
     * 获取模块文件名
     *
     * 支持标准模块和自定义模块的文件名。
     *
     * @param moduleType 模块类型
     * @returns 模块文件名
     */
    private getModuleFileName(moduleType: ModuleType): string {
        // 检查是否为自定义模块
        const customModule = this.customModules.get(moduleType as string);
        if (customModule) {
            return customModule.fileName;
        }

        // 标准模块使用默认命名模式
        return `design-${moduleType}.md`;
    }

    /**
     * 检查是否为自定义模块
     *
     * @param moduleType 模块类型
     * @returns 是否为自定义模块
     */
    isCustomModule(moduleType: string): boolean {
        return this.customModules.has(moduleType);
    }

    /**
     * 获取自定义模块定义
     *
     * @param moduleType 模块类型
     * @returns 自定义模块定义，如果不存在则返回 undefined
     */
    getCustomModule(moduleType: string): CustomModuleDefinition | undefined {
        return this.customModules.get(moduleType);
    }

    /**
     * 获取所有自定义模块类型
     *
     * @returns 自定义模块类型列表
     */
    getCustomModuleTypes(): string[] {
        return Array.from(this.customModules.keys());
    }
}
