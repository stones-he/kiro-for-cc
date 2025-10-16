// Auto-generated from src\prompts\spec\create-spec-with-agents.md
// DO NOT EDIT MANUALLY

export const frontmatter = {
  "id": "create-spec-with-agents",
  "name": "Create Spec with Subagents",
  "version": "1.0.0",
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
    },
    "modularDesignEnabled": {
      "type": "string",
      "required": true,
      "description": "Whether modular design is enabled (true/false)"
    }
  }
};

export const content = "<user_input>\r\nLAUNCH A SPEC DEVELOPMENT WORKFLOW\r\n\r\nFeature Description: {{description}}\r\n\r\nWorkspace path: {{workspacePath}}\r\nSpec base path: {{specBasePath}}\r\nModular Design Enabled: {{modularDesignEnabled}}\r\n\r\n**Instructions:**\r\n\r\n1. First, call the `spec-system-prompt-loader` agent to get the path to the spec workflow system prompt\r\n2. Read the workflow file from the returned path to understand the complete workflow\r\n3. Follow the workflow defined in that file, starting from \"0.Initialize\" step\r\n4. The workflow will guide you through creating requirements, design, and tasks\r\n\r\n**Important Notes:**\r\n- You MUST choose a kebab-case feature name based on the description (e.g., \"user-authentication\")\r\n- You MUST create the feature directory structure: {{specBasePath}}/{feature-name}/\r\n- All files must be created inside the feature-specific directory, NOT directly in {{specBasePath}}/\r\n- If modular design is enabled, create multiple design-*.md files instead of a single design.md\r\n\r\nStart by calling the spec-system-prompt-loader agent.\r\n</user_input>\r\n";

export default {
  frontmatter,
  content
};
