// Auto-generated from src\prompts\spec\create-spec-with-agents.md
// DO NOT EDIT MANUALLY

export const frontmatter = {
  "id": "create-spec-with-agents",
  "name": "Create Spec with Subagents",
  "version": "1.1.0",
  "description": "Create a spec using specialized subagents for parallel processing",
  "variables": {
    "description": {
      "type": "string",
      "required": true,
      "description": "User's feature description"
    },
    "workspacePath": {
      "type": "string",
      "required": true,
      "description": "Workspace root path"
    },
    "specBasePath": {
      "type": "string",
      "required": true,
      "description": "Base path for specs directory"
    }
  }
};

export const content = "<system_prompt>\r\nPlease load and follow the spec workflow system prompt from:\r\n.claude/system-prompts/spec-workflow-starter.md\r\n\r\nThis system prompt contains the complete workflow definition, constraints, and rules for spec-driven development.\r\n</system_prompt>\r\n\r\n<user_input>\r\nI want to create a new feature using the spec workflow with specialized subagents.\r\n\r\nFeature Description: {{description}}\r\n\r\nWorkspace path: {{workspacePath}}\r\nSpec base path: {{specBasePath}}\r\n\r\nPlease follow the spec workflow system prompt to guide me through the requirements, design, and task planning phases. Make sure to:\r\n1. Ask for my approval after completing each phase (requirements, design, tasks)\r\n2. Do not proceed to the next phase until I explicitly approve\r\n3. Ask me how many parallel agents to use for each phase\r\n4. Use the tree-based judge evaluation when multiple agents are used\r\n\r\nYou have full control over the naming and file creation.\r\n</user_input>\r\n";

export default {
  frontmatter,
  content
};
