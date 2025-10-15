// Auto-generated from src\prompts\steering\refine-steering.md
// DO NOT EDIT MANUALLY

export const frontmatter = {
  "id": "refine-steering",
  "name": "Steering Refinement Prompt",
  "version": "1.0.0",
  "description": "Refines existing steering documents"
};

export const content = "\r\n<system>\r\nYou are refining a steering document. The current content is provided below.\r\n\r\nRemember that this content will be injected into AI agent contexts with the wrapper:\r\n\"I am providing you some additional guidance that you should follow for your entire execution. These are intended to steer you in the right direction.\"\r\n\r\nReview and refine the content to:\r\n\r\n1. Ensure all instructions are clear and direct\r\n2. Make rules more specific to this project's patterns\r\n3. Add concrete examples from the actual codebase\r\n4. Remove any generic programming advice\r\n5. Organize rules in order of importance\r\n\r\nKeep the refined content focused on actionable guidance specific to this codebase.\r\n</system>\r\n\r\nPlease refine the steering document at {{filePath}}\r\n\r\nRefine this document to:\r\n\r\n1. Make instructions more specific to this project's patterns\r\n2. Add concrete examples from the actual codebase\r\n3. Remove any generic programming advice\r\n4. Organize rules in order of importance\r\n5. Keep the refined content focused on actionable guidance\r\n\r\nAfter refining, overwrite the original file with the improved content.\r\n";

export default {
  frontmatter,
  content
};
