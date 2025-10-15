// Auto-generated from src\prompts\steering\init-steering.md
// DO NOT EDIT MANUALLY

export const frontmatter = {
  "id": "init-steering",
  "name": "Initialize Steering",
  "version": "1.0.0",
  "description": "Complete prompt for initializing steering documents",
  "variables": {
    "steeringPath": {
      "type": "string",
      "required": true,
      "description": "Path where steering documents should be created"
    }
  }
};

export const content = "\r\n<system>\r\nYou are analyzing a codebase to create steering documents that will guide AI assistants working on this project.\r\n\r\n## Context\r\n\r\nSteering documents will be injected into AI conversations with this wrapper:\r\n\"I am providing you some additional guidance that you should follow for your entire execution. These are intended to steer you in the right direction. You should follow these instructions for all following responses.\"\r\n\r\n## Writing Guidelines\r\n\r\nWrite content as direct instructions to the AI agent:\r\n\r\n- Use imperative mood (\"Use X\", \"Avoid Y\", \"Always Z\")\r\n- Be specific to THIS codebase's patterns and conventions\r\n- Include concrete examples from actual files when relevant\r\n- Skip generic programming advice\r\n\r\n## Required Files\r\n\r\nCreate exactly these three files by analyzing the codebase:\r\n\r\n1. **{{steeringPath}}/product.md**\r\n   - Product purpose and core features\r\n   - User value proposition\r\n   - Key business logic rules\r\n\r\n2. **{{steeringPath}}/tech.md**\r\n   - Tech stack and frameworks used\r\n   - Build system and dependencies\r\n   - Common commands (build, test, run, deploy)\r\n   - Project-specific conventions\r\n\r\n3. **{{steeringPath}}/structure.md**\r\n   - Directory organization\r\n   - File naming patterns\r\n   - Component/module architecture\r\n   - Key file locations\r\n\r\n## Important\r\n\r\n- Check if files exist before creating (DO NOT overwrite)\r\n- Write directly to filesystem\r\n- Keep content concise but complete\r\n- If CLAUDE.md exists, update its \"## Steering Documents\" section\r\n</system>\r\n\r\n# Initialize Steering Documents\r\n\r\nAnalyze this repository and create basic steering rules that would help guide an AI assistant.\r\n\r\nSteering documents are markdown files that should be created in the '{{steeringPath}}' directory.\r\n\r\nFocus on project conventions, code style, architecture patterns, and any specific rules that should be followed when working with this codebase.\r\n\r\nFor the initial setup, please create the following files:\r\n\r\n- product.md: Short summary of the product, its purpose, key features, and user value proposition\r\n- tech.md: Build system used, tech stack, libraries, frameworks etc. Include a section for common commands (building, testing, running, etc.)\r\n- structure.md: Project organization, folder structure, and key file locations\r\n\r\nThe goal is to be succinct, but capture information that will be useful for an AI assistant operating in this project.\r\n\r\nIMPORTANT:\r\n\r\n1. Write each file directly to the filesystem at the appropriate path in {{steeringPath}}/\r\n2. Check if any of these files already exist before creating them. If a file already exists, DO NOT modify or overwrite it - skip it completely\r\n3. Only create files that don't exist\r\n4. If a project CLAUDE.md exists, create or update the \"## Steering Documents\" section listing all steering documents with their descriptions and paths\r\n";

export default {
  frontmatter,
  content
};
