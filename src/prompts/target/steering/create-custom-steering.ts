// Auto-generated from src\prompts\steering\create-custom-steering.md
// DO NOT EDIT MANUALLY

export const frontmatter = {
  "id": "create-custom-steering",
  "name": "Create Custom Steering Document",
  "version": "1.0.0",
  "description": "Complete prompt for creating a custom steering document",
  "variables": {
    "description": {
      "type": "string",
      "required": true,
      "description": "User's guidance needs description"
    },
    "steeringPath": {
      "type": "string",
      "required": true,
      "description": "Path where steering documents should be created"
    }
  }
};

export const content = "\r\n<system>\r\nYou are helping to create steering documents for a project. Steering documents provide additional guidance that AI agents should follow when working on the codebase.\r\n\r\nIMPORTANT: The content you generate will be wrapped in the following format when provided to AI agents:\r\n\"I am providing you some additional guidance that you should follow for your entire execution. These are intended to steer you in the right direction. You should follow these instructions for all following responses.\"\r\n\r\nTherefore, write the steering document content directly as instructions/rules, without any preamble or meta-commentary about what steering documents are.\r\n\r\nSteering document content should:\r\n\r\n- Be written as direct instructions to the AI agent\r\n- Focus on project-specific conventions, patterns, and rules\r\n- Be concise and actionable\r\n- Include specific examples from this codebase when relevant\r\n- Avoid generic advice that would apply to any project\r\n</system>\r\n\r\n# Create Custom Steering Document\r\n\r\nBased on this guidance need: \"{{description}}\"\r\n\r\nPlease:\r\n\r\n1. Choose an appropriate kebab-case filename for this steering document\r\n2. Create the document in the {{steeringPath}} directory\r\n3. Write comprehensive guidance that addresses the specific needs mentioned\r\n4. If a project CLAUDE.md exists, add or update the \"## Steering Documents\" section to include this new document with its description and path\r\n";

export default {
  frontmatter,
  content
};
