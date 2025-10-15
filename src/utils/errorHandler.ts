/**
 * ErrorHandler - 错误处理类
 *
 * 提供统一的错误处理机制，包括：
 * - 错误分类和检测
 * - 用户友好的错误消息生成
 * - 详细的技术日志记录
 * - 特定错误类型的专门处理
 * - 可重试性判断
 *
 * 使用场景：
 * - 文件系统操作错误
 * - AI 生成错误
 * - 网络连接错误
 * - 配置验证错误
 * - 数据验证错误
 */

import * as vscode from 'vscode';
import { ErrorCategory, ErrorContext, ModuleType } from '../types/modularDesign';

/**
 * ErrorHandler 类
 *
 * 提供统一的错误处理和用户反馈机制。
 */
export class ErrorHandler {
    /**
     * 构造函数
     *
     * @param outputChannel VSCode 输出通道，用于记录详细的错误日志
     */
    constructor(private outputChannel: vscode.OutputChannel) {}

    /**
     * 处理错误
     *
     * 这是错误处理的主入口。它会：
     * 1. 构建完整的错误上下文
     * 2. 记录技术详细信息到输出通道
     * 3. 向用户显示友好的错误消息
     * 4. 执行特定错误类型的处理逻辑
     *
     * @param error 错误对象
     * @param context 部分错误上下文（可选字段）
     *
     * @example
     * ```typescript
     * try {
     *     await fs.writeFile(path, content);
     * } catch (error) {
     *     await errorHandler.handleError(error as Error, {
     *         operation: 'Writing design module',
     *         specName: 'my-feature',
     *         moduleType: ModuleType.Frontend
     *     });
     * }
     * ```
     */
    async handleError(error: Error, context: Partial<ErrorContext>): Promise<void> {
        const errorContext = this.buildErrorContext(error, context);

        // 记录技术详细信息
        this.logError(errorContext);

        // 显示用户友好消息
        await this.showUserMessage(errorContext);

        // 执行特定错误类型的处理
        await this.handleSpecificError(errorContext);
    }

    /**
     * 构建完整的错误上下文
     *
     * 将部分错误上下文和错误对象合并，生成完整的错误上下文信息。
     * 自动检测错误类别、可重试性等属性。
     *
     * @param error 错误对象
     * @param context 部分错误上下文
     * @returns 完整的错误上下文
     */
    private buildErrorContext(
        error: Error,
        context: Partial<ErrorContext>
    ): ErrorContext {
        return {
            category: context.category || this.detectErrorCategory(error),
            operation: context.operation || 'unknown',
            specName: context.specName,
            moduleType: context.moduleType,
            retryable: context.retryable !== undefined
                ? context.retryable
                : this.isRetryable(error),
            userMessage: context.userMessage || this.getUserMessage(error),
            technicalDetails: error.stack || error.message
        };
    }

    /**
     * 自动检测错误类别
     *
     * 根据错误消息和错误类型推断错误所属的类别。
     *
     * @param error 错误对象
     * @returns 检测到的错误类别
     */
    private detectErrorCategory(error: Error): ErrorCategory {
        const message = error.message.toLowerCase();

        // 文件系统错误
        if (
            message.includes('enoent') ||
            message.includes('eacces') ||
            message.includes('eperm') ||
            message.includes('eexist') ||
            message.includes('enotdir') ||
            message.includes('eisdir') ||
            message.includes('enospc') ||
            message.includes('file') ||
            message.includes('directory')
        ) {
            return ErrorCategory.FileSystem;
        }

        // 网络错误
        if (
            message.includes('timeout') ||
            message.includes('network') ||
            message.includes('econnrefused') ||
            message.includes('econnreset') ||
            message.includes('etimedout') ||
            message.includes('enotfound') ||
            message.includes('fetch')
        ) {
            return ErrorCategory.Network;
        }

        // 验证错误
        if (
            message.includes('validation') ||
            message.includes('invalid') ||
            message.includes('expected') ||
            message.includes('required') ||
            message.includes('schema') ||
            message.includes('format')
        ) {
            return ErrorCategory.Validation;
        }

        // 配置错误
        if (
            message.includes('config') ||
            message.includes('setting') ||
            message.includes('option') ||
            message.includes('parameter')
        ) {
            return ErrorCategory.Configuration;
        }

        // 默认为生成错误
        return ErrorCategory.Generation;
    }

    /**
     * 判断错误是否可重试
     *
     * 某些类型的错误是临时性的，可以通过重试来解决。
     * 例如网络超时、临时文件锁等。
     *
     * @param error 错误对象
     * @returns 是否可重试
     */
    private isRetryable(error: Error): boolean {
        const message = error.message.toLowerCase();

        // 网络相关错误通常可重试
        if (
            message.includes('timeout') ||
            message.includes('network') ||
            message.includes('econnrefused') ||
            message.includes('econnreset') ||
            message.includes('etimedout')
        ) {
            return true;
        }

        // 临时性错误可重试
        if (
            message.includes('temporary') ||
            message.includes('unavailable') ||
            message.includes('busy') ||
            message.includes('locked')
        ) {
            return true;
        }

        // 速率限制错误可重试
        if (
            message.includes('rate limit') ||
            message.includes('too many requests') ||
            message.includes('throttle')
        ) {
            return true;
        }

        // 默认不可重试
        return false;
    }

    /**
     * 生成用户友好的错误消息
     *
     * 将技术性的错误消息转换为用户容易理解的描述。
     *
     * @param error 错误对象
     * @returns 用户友好的错误消息
     */
    private getUserMessage(error: Error): string {
        const message = error.message.toLowerCase();

        // 文件系统错误
        if (message.includes('enoent')) {
            return '文件或目录不存在';
        }
        if (message.includes('eacces') || message.includes('eperm')) {
            return '权限不足，无法访问文件';
        }
        if (message.includes('eexist')) {
            return '文件或目录已存在';
        }
        if (message.includes('enospc')) {
            return '磁盘空间不足';
        }
        if (message.includes('eisdir')) {
            return '目标是一个目录，期望是文件';
        }
        if (message.includes('enotdir')) {
            return '目标是一个文件，期望是目录';
        }

        // 网络错误
        if (message.includes('timeout') || message.includes('etimedout')) {
            return '操作超时，请重试';
        }
        if (message.includes('econnrefused')) {
            return '连接被拒绝，请检查网络或服务状态';
        }
        if (message.includes('econnreset')) {
            return '连接被重置，请重试';
        }
        if (message.includes('enotfound')) {
            return '无法找到主机或服务';
        }
        if (message.includes('network')) {
            return '网络连接失败';
        }

        // 验证错误
        if (message.includes('validation')) {
            return '数据验证失败';
        }
        if (message.includes('invalid')) {
            return '数据格式无效';
        }

        // 配置错误
        if (message.includes('config')) {
            return '配置错误';
        }

        // 生成错误
        if (message.includes('generation')) {
            return '生成失败';
        }

        // 默认消息
        return '操作失败';
    }

    /**
     * 记录详细的错误信息到输出通道
     *
     * 包含错误类别、操作名称、相关上下文和完整的堆栈跟踪。
     *
     * @param context 错误上下文
     */
    private logError(context: ErrorContext): void {
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('='.repeat(80));
        this.outputChannel.appendLine(`[ERROR] ${context.category.toUpperCase()}`);
        this.outputChannel.appendLine(`Time: ${new Date().toISOString()}`);
        this.outputChannel.appendLine(`Operation: ${context.operation}`);

        if (context.specName) {
            this.outputChannel.appendLine(`Spec: ${context.specName}`);
        }

        if (context.moduleType) {
            this.outputChannel.appendLine(`Module: ${context.moduleType}`);
        }

        this.outputChannel.appendLine(`Retryable: ${context.retryable}`);
        this.outputChannel.appendLine(`User Message: ${context.userMessage}`);
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('Technical Details:');
        this.outputChannel.appendLine(context.technicalDetails);
        this.outputChannel.appendLine('='.repeat(80));
        this.outputChannel.appendLine('');
    }

    /**
     * 向用户显示错误消息
     *
     * 根据错误是否可重试，显示不同的对话框选项。
     * 可重试的错误会提供"重试"按钮，所有错误都提供"查看日志"选项。
     *
     * @param context 错误上下文
     */
    private async showUserMessage(context: ErrorContext): Promise<void> {
        const message = `${context.userMessage} (${context.operation})`;

        if (context.retryable) {
            // 可重试错误：提供重试和查看日志选项
            const choice = await vscode.window.showErrorMessage(
                message,
                '重试',
                '查看日志'
            );

            if (choice === '查看日志') {
                this.outputChannel.show();
            }
            // 注意：重试逻辑由调用方处理，这里只是提供用户提示
        } else {
            // 不可重试错误：只提供查看日志选项
            const choice = await vscode.window.showErrorMessage(
                message,
                '查看日志'
            );

            if (choice === '查看日志') {
                this.outputChannel.show();
            }
        }
    }

    /**
     * 处理特定类型的错误
     *
     * 针对不同错误类别执行专门的处理逻辑。
     * 例如文件系统错误可能需要引导用户检查权限，
     * 配置错误可能需要打开设置界面。
     *
     * @param context 错误上下文
     */
    private async handleSpecificError(context: ErrorContext): Promise<void> {
        switch (context.category) {
            case ErrorCategory.FileSystem:
                await this.handleFileSystemError(context);
                break;
            case ErrorCategory.Configuration:
                await this.handleConfigurationError(context);
                break;
            case ErrorCategory.Network:
                await this.handleNetworkError(context);
                break;
            case ErrorCategory.Validation:
                await this.handleValidationError(context);
                break;
            case ErrorCategory.Generation:
                await this.handleGenerationError(context);
                break;
        }
    }

    /**
     * 处理文件系统错误
     *
     * 对于权限错误，提示用户检查文件权限。
     * 对于空间不足错误，提示清理磁盘空间。
     *
     * @param context 错误上下文
     */
    private async handleFileSystemError(context: ErrorContext): Promise<void> {
        const message = context.technicalDetails.toLowerCase();

        if (message.includes('eacces') || message.includes('eperm')) {
            const choice = await vscode.window.showWarningMessage(
                '权限不足。请检查文件权限设置或以管理员身份运行 VSCode。',
                '打开文件位置'
            );

            if (choice === '打开文件位置' && context.specName) {
                // 尝试在文件管理器中打开 spec 目录
                // 这需要工作区上下文，这里只是示例
                // 实际实现需要从配置管理器获取路径
                this.outputChannel.appendLine(
                    `[ErrorHandler] User requested to open file location for spec: ${context.specName}`
                );
            }
        } else if (message.includes('enospc')) {
            await vscode.window.showWarningMessage(
                '磁盘空间不足。请清理磁盘空间后重试。',
                '确定'
            );
        } else if (message.includes('enoent')) {
            if (context.moduleType) {
                const choice = await vscode.window.showInformationMessage(
                    `模块文件不存在。是否要生成 ${context.moduleType} 模块？`,
                    '生成',
                    '取消'
                );

                if (choice === '生成') {
                    // 触发模块生成命令
                    // 实际实现需要调用命令系统
                    this.outputChannel.appendLine(
                        `[ErrorHandler] User requested to generate module: ${context.moduleType}`
                    );
                }
            }
        }
    }

    /**
     * 处理配置错误
     *
     * 提示用户打开设置界面修正配置。
     *
     * @param context 错误上下文
     */
    private async handleConfigurationError(context: ErrorContext): Promise<void> {
        const choice = await vscode.window.showErrorMessage(
            '配置错误。请检查并修正配置设置。',
            '打开设置',
            '查看文档'
        );

        if (choice === '打开设置') {
            // 打开 VSCode 设置页面，聚焦到 kfc 配置
            await vscode.commands.executeCommand(
                'workbench.action.openSettings',
                'kfc.features.modularDesign'
            );
        } else if (choice === '查看文档') {
            // 打开配置文档
            const docUrl = vscode.Uri.parse(
                'https://github.com/your-repo/docs/configuration.md'
            );
            await vscode.env.openExternal(docUrl);
        }
    }

    /**
     * 处理网络错误
     *
     * 对于网络连接问题，提示用户检查网络设置和代理配置。
     *
     * @param context 错误上下文
     */
    private async handleNetworkError(context: ErrorContext): Promise<void> {
        const choice = await vscode.window.showErrorMessage(
            '网络连接失败。请检查网络连接和代理设置。',
            '检查代理设置',
            '重试'
        );

        if (choice === '检查代理设置') {
            // 打开代理设置
            await vscode.commands.executeCommand(
                'workbench.action.openSettings',
                'http.proxy'
            );
        }
        // 重试逻辑由调用方处理
    }

    /**
     * 处理验证错误
     *
     * 对于数据验证错误，提供更详细的错误信息和修复建议。
     *
     * @param context 错误上下文
     */
    private async handleValidationError(context: ErrorContext): Promise<void> {
        await vscode.window.showWarningMessage(
            `数据验证失败: ${context.technicalDetails}`,
            '确定'
        );
    }

    /**
     * 处理生成错误
     *
     * 对于 AI 生成失败，提示可能的原因和解决方案。
     *
     * @param context 错误上下文
     */
    private async handleGenerationError(context: ErrorContext): Promise<void> {
        const message = context.moduleType
            ? `生成 ${context.moduleType} 模块失败。`
            : '生成失败。';

        const choice = await vscode.window.showErrorMessage(
            `${message} 可能原因：AI 服务暂时不可用、提示过长或网络问题。`,
            '重试',
            '查看详情'
        );

        if (choice === '查看详情') {
            this.outputChannel.show();
        }
        // 重试逻辑由调用方处理
    }

    /**
     * 创建带有完整上下文的错误对象
     *
     * 用于在捕获错误后创建一个增强的错误对象，包含更多上下文信息。
     *
     * @param originalError 原始错误
     * @param context 额外的上下文信息
     * @returns 增强的错误对象
     *
     * @example
     * ```typescript
     * try {
     *     await someOperation();
     * } catch (error) {
     *     throw errorHandler.createEnhancedError(error as Error, {
     *         operation: 'Module generation',
     *         specName: 'my-feature',
     *         moduleType: ModuleType.Frontend
     *     });
     * }
     * ```
     */
    createEnhancedError(
        originalError: Error,
        context: Partial<ErrorContext>
    ): Error {
        const errorContext = this.buildErrorContext(originalError, context);

        const enhancedError = new Error(errorContext.userMessage);
        enhancedError.name = `${errorContext.category}Error`;
        enhancedError.stack = originalError.stack;

        // 附加上下文信息（可以通过类型断言访问）
        (enhancedError as any).context = errorContext;

        return enhancedError;
    }

    /**
     * 批量处理错误
     *
     * 用于处理多个操作的错误结果，汇总显示。
     *
     * @param errors 错误列表
     * @param operation 操作名称
     *
     * @example
     * ```typescript
     * const results = await Promise.allSettled(operations);
     * const errors = results
     *     .filter(r => r.status === 'rejected')
     *     .map(r => (r as PromiseRejectedResult).reason);
     *
     * if (errors.length > 0) {
     *     await errorHandler.handleBatchErrors(errors, 'Generating modules');
     * }
     * ```
     */
    async handleBatchErrors(
        errors: Error[],
        operation: string
    ): Promise<void> {
        if (errors.length === 0) {
            return;
        }

        // 记录所有错误
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('='.repeat(80));
        this.outputChannel.appendLine(`[BATCH ERROR] ${operation}`);
        this.outputChannel.appendLine(`Total errors: ${errors.length}`);
        this.outputChannel.appendLine('='.repeat(80));

        errors.forEach((error, index) => {
            this.outputChannel.appendLine(`\nError ${index + 1}:`);
            this.outputChannel.appendLine(error.stack || error.message);
        });

        this.outputChannel.appendLine('='.repeat(80));
        this.outputChannel.appendLine('');

        // 显示汇总消息
        const message = `${operation} 过程中发生 ${errors.length} 个错误。`;
        const choice = await vscode.window.showErrorMessage(
            message,
            '查看详情',
            '确定'
        );

        if (choice === '查看详情') {
            this.outputChannel.show();
        }
    }
}
