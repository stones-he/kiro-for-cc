import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as yaml from 'js-yaml';

export interface AgentInfo {
    name: string;
    description: string;
    path: string;
    type: 'project' | 'user';
    tools?: string[];
}

export class AgentManager {
    private outputChannel: vscode.OutputChannel;
    private extensionPath: string;
    private workspaceRoot: string | undefined;
    
    private readonly BUILT_IN_AGENTS = [
        'spec-requirements',
        'spec-design',
        'spec-tasks',
        'spec-system-prompt-loader',
        'spec-judge',
        'spec-impl',
        'spec-test'
    ];

    constructor(
        context: vscode.ExtensionContext,
        outputChannel: vscode.OutputChannel
    ) {
        this.outputChannel = outputChannel;
        this.extensionPath = context.extensionPath;
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    /**
     * Get the resource path (support both development and production)
     */
    private getResourcePath(relativePath: string): string {
        // Try dist/resources first (production/packaged)
        const distPath = path.join(this.extensionPath, 'dist/resources', relativePath);
        if (fs.existsSync(distPath)) {
            return distPath;
        }

        // Fall back to src/resources (development mode)
        const srcPath = path.join(this.extensionPath, 'src/resources', relativePath);
        return srcPath;
    }

    /**
     * Initialize built-in agents (copy if not exist on startup)
     */
    async initializeBuiltInAgents(): Promise<void> {
        if (!this.workspaceRoot) {
            this.outputChannel.appendLine('[AgentManager] No workspace root found, skipping agent initialization');
            return;
        }

        const targetDir = path.join(this.workspaceRoot, '.claude/agents/kfc');

        try {
            // Ensure target directory exists
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(targetDir));
            this.outputChannel.appendLine(`[AgentManager] Target directory created: ${targetDir}`);

            // Copy each built-in agent (always overwrite to ensure latest version)
            for (const agentName of this.BUILT_IN_AGENTS) {
                const sourcePath = this.getResourcePath(`agents/${agentName}.md`);
                const targetPath = path.join(targetDir, `${agentName}.md`);

                try {
                    // Check if source file exists
                    if (!fs.existsSync(sourcePath)) {
                        this.outputChannel.appendLine(`[AgentManager] Source file not found: ${sourcePath}`);
                        continue;
                    }

                    const sourceUri = vscode.Uri.file(sourcePath);
                    const targetUri = vscode.Uri.file(targetPath);
                    await vscode.workspace.fs.copy(sourceUri, targetUri, { overwrite: true });
                    this.outputChannel.appendLine(`[AgentManager] Updated agent ${agentName} from ${sourcePath}`);
                } catch (error) {
                    this.outputChannel.appendLine(`[AgentManager] Failed to copy agent ${agentName}: ${error}`);
                }
            }

            // Also copy system prompt if it doesn't exist
            await this.initializeSystemPrompt();

        } catch (error) {
            this.outputChannel.appendLine(`[AgentManager] Failed to initialize agents: ${error}`);
        }
    }

    /**
     * Initialize system prompt (copy if not exist)
     */
    private async initializeSystemPrompt(): Promise<void> {
        if (!this.workspaceRoot) {
            return;
        }

        const systemPromptDir = path.join(this.workspaceRoot, '.claude/system-prompts');
        const sourcePath = this.getResourcePath('prompts/spec-workflow-starter.md');
        const targetPath = path.join(systemPromptDir, 'spec-workflow-starter.md');

        try {
            // Check if source file exists
            if (!fs.existsSync(sourcePath)) {
                this.outputChannel.appendLine(`[AgentManager] System prompt source file not found: ${sourcePath}`);
                return;
            }

            // Ensure directory exists
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(systemPromptDir));
            this.outputChannel.appendLine(`[AgentManager] System prompt directory created: ${systemPromptDir}`);

            // Always overwrite to ensure latest version
            await vscode.workspace.fs.copy(vscode.Uri.file(sourcePath), vscode.Uri.file(targetPath), { overwrite: true });
            this.outputChannel.appendLine(`[AgentManager] Updated system prompt from ${sourcePath}`);
        } catch (error) {
            this.outputChannel.appendLine(`[AgentManager] Failed to initialize system prompt: ${error}`);
        }
    }

    /**
     * Get list of agents
     */
    async getAgentList(type: 'project' | 'user' | 'all' = 'all'): Promise<AgentInfo[]> {
        const agents: AgentInfo[] = [];

        // Get project agents (excluding kfc built-in agents)
        if (type === 'project' || type === 'all') {
            if (this.workspaceRoot) {
                const projectAgentsPath = path.join(this.workspaceRoot, '.claude/agents');
                const projectAgents = await this.getAgentsFromDirectory(
                    projectAgentsPath,
                    'project',
                    true  // exclude kfc directory
                );
                agents.push(...projectAgents);
            }
        }

        // Get user agents
        if (type === 'user' || type === 'all') {
            const userAgentsPath = path.join(os.homedir(), '.claude/agents');
            const userAgents = await this.getAgentsFromDirectory(userAgentsPath, 'user');
            agents.push(...userAgents);
        }

        return agents;
    }

    /**
     * Get agents from a specific directory (including subdirectories)
     */
    private async getAgentsFromDirectory(dirPath: string, type: 'project' | 'user', excludeKfc: boolean = false): Promise<AgentInfo[]> {
        const agents: AgentInfo[] = [];
        const stats = { total: 0, success: 0, failed: 0 };

        try {
            this.outputChannel.appendLine(`[AgentManager] Reading agents from directory: ${dirPath}`);
            await this.readAgentsRecursively(dirPath, type, agents, excludeKfc, stats);
            this.outputChannel.appendLine(`[AgentManager] Summary for ${dirPath}:`);
            this.outputChannel.appendLine(`  - Total agent files found: ${stats.total}`);
            this.outputChannel.appendLine(`  - Successfully parsed: ${stats.success}`);
            this.outputChannel.appendLine(`  - Failed to parse: ${stats.failed}`);
        } catch (error) {
            this.outputChannel.appendLine(`[AgentManager] Failed to read agents from ${dirPath}: ${error}`);
        }

        return agents;
    }

    /**
     * Recursively read agents from directory and subdirectories
     */
    private async readAgentsRecursively(
        dirPath: string,
        type: 'project' | 'user',
        agents: AgentInfo[],
        excludeKfc: boolean = false,
        stats?: { total: number; success: number; failed: number }
    ): Promise<void> {
        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dirPath));

            for (const [fileName, fileType] of entries) {
                const fullPath = path.join(dirPath, fileName);

                // Skip kfc directory if excludeKfc is true
                if (excludeKfc && fileName === 'kfc' && fileType === vscode.FileType.Directory) {
                    this.outputChannel.appendLine(`[AgentManager] Skipping kfc directory (built-in agents)`);
                    continue;
                }

                if (fileType === vscode.FileType.File && fileName.endsWith('.md')) {
                    if (stats) {
                        stats.total++;
                    }
                    this.outputChannel.appendLine(`[AgentManager] Processing agent file: ${fileName}`);
                    const agentInfo = await this.parseAgentFile(fullPath, type);
                    if (agentInfo) {
                        agents.push(agentInfo);
                        if (stats) {
                            stats.success++;
                        }
                        this.outputChannel.appendLine(`[AgentManager] ✓ Added agent: ${agentInfo.name}`);
                    } else {
                        if (stats) {
                            stats.failed++;
                        }
                        this.outputChannel.appendLine(`[AgentManager] ✗ Failed to parse agent: ${fileName}`);
                    }
                } else if (fileType === vscode.FileType.Directory) {
                    // Recursively read subdirectories
                    this.outputChannel.appendLine(`[AgentManager] Entering subdirectory: ${fileName}`);
                    await this.readAgentsRecursively(fullPath, type, agents, excludeKfc, stats);
                }
            }
        } catch (error) {
            this.outputChannel.appendLine(`[AgentManager] Error reading directory ${dirPath}: ${error}`);
        }
    }

    /**
     * Parse agent file and extract metadata
     */
    private async parseAgentFile(filePath: string, type: 'project' | 'user'): Promise<AgentInfo | null> {
        try {
            this.outputChannel.appendLine(`[AgentManager] Parsing agent file: ${filePath}`);
            const content = await fs.promises.readFile(filePath, 'utf8');
            
            // Extract YAML frontmatter
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (!frontmatterMatch) {
                this.outputChannel.appendLine(`[AgentManager] No frontmatter found in: ${filePath}`);
                return null;
            }

            let frontmatter: any;
            try {
                frontmatter = yaml.load(frontmatterMatch[1]) as any;
                this.outputChannel.appendLine(`[AgentManager] Successfully parsed YAML for: ${path.basename(filePath)}`);
            } catch (yamlError: any) {
                const fileName = path.basename(filePath);
                this.outputChannel.appendLine(`[AgentManager] YAML parse error in ${fileName}:`);
                this.outputChannel.appendLine(`  ${yamlError.message || yamlError}`);
                this.outputChannel.appendLine(`  File location: ${filePath}`);
                this.outputChannel.appendLine(`  Hint: Check the YAML frontmatter (between --- markers) for proper indentation and syntax`);

                // Show first few lines of problematic frontmatter to help debug
                const frontmatterLines = frontmatterMatch[1].split('\n');
                const previewLines = frontmatterLines.slice(0, 5);
                this.outputChannel.appendLine(`  First few lines of frontmatter:`);
                previewLines.forEach((line, idx) => {
                    this.outputChannel.appendLine(`    ${idx + 1}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
                });

                return null;
            }
            
            return {
                name: frontmatter.name || path.basename(filePath, '.md'),
                description: frontmatter.description || '',
                path: filePath,
                type,
                tools: Array.isArray(frontmatter.tools) 
                    ? frontmatter.tools 
                    : (frontmatter.tools ? frontmatter.tools.split(',').map((t: string) => t.trim()) : undefined)
            };
        } catch (error) {
            this.outputChannel.appendLine(`[AgentManager] Failed to parse agent file ${filePath}: ${error}`);
            return null;
        }
    }

    /**
     * Check if agent exists
     */
    checkAgentExists(agentName: string, location: 'project' | 'user'): boolean {
        const basePath = location === 'project' 
            ? (this.workspaceRoot ? path.join(this.workspaceRoot, '.claude/agents/kfc') : null)
            : path.join(os.homedir(), '.claude/agents');

        if (!basePath) {
            return false;
        }

        const agentPath = path.join(basePath, `${agentName}.md`);
        return fs.existsSync(agentPath);
    }

    /**
     * Get agent file path
     */
    getAgentPath(agentName: string): string | null {
        // Check project agents first
        if (this.workspaceRoot) {
            const projectPath = path.join(this.workspaceRoot, '.claude/agents/kfc', `${agentName}.md`);
            if (fs.existsSync(projectPath)) {
                return projectPath;
            }
        }

        // Check user agents
        const userPath = path.join(os.homedir(), '.claude/agents', `${agentName}.md`);
        if (fs.existsSync(userPath)) {
            return userPath;
        }

        return null;
    }
}