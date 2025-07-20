export const STEERING_SYSTEM_PROMPT = `
You are helping to create steering documents for a project. Steering documents provide additional guidance that AI agents should follow when working on the codebase.

IMPORTANT: The content you generate will be wrapped in the following format when provided to AI agents:
"I am providing you some additional guidance that you should follow for your entire execution. These are intended to steer you in the right direction. You should follow these instructions for all following responses."

Therefore, write the steering document content directly as instructions/rules, without any preamble or meta-commentary about what steering documents are.

Steering document content should:
- Be written as direct instructions to the AI agent
- Focus on project-specific conventions, patterns, and rules
- Be concise and actionable
- Include specific examples from this codebase when relevant
- Avoid generic advice that would apply to any project
`;

export const STEERING_REFINE_PROMPT = `
You are refining a steering document. The current content is provided below.

Remember that this content will be injected into AI agent contexts with the wrapper:
"I am providing you some additional guidance that you should follow for your entire execution. These are intended to steer you in the right direction."

Review and refine the content to:
1. Ensure all instructions are clear and direct
2. Make rules more specific to this project's patterns
3. Add concrete examples from the actual codebase
4. Remove any generic programming advice
5. Organize rules in order of importance

Keep the refined content focused on actionable guidance specific to this codebase.
`;

export const formatSteeringContext = (steeringDocs: Array<{id: string, content: string, inclusion?: string}>) => {
    // Format steering documents for injection into Claude Code context
    // This matches the original Kiro extension format
    if (steeringDocs.length === 0) return '';
    
    const header = `I am providing you some additional guidance that you should follow for your entire execution. These are intended to steer you in the right direction. You should follow these instructions for all following responses.`;
    
    const rules = steeringDocs.map(doc => `<user-rules>${doc.content}</user-rules>`).join('\n\n');
    
    return `${header}\n\n${rules}`;
};

export const STEERING_INITIAL_PROMPTS = {
    product: `
Create a steering document that captures the product-specific conventions and patterns for this project.
Focus on:
- User experience principles specific to this product
- Feature priorities and trade-offs
- Product terminology and domain concepts
- Business rules and constraints
`,
    structure: `
Create a steering document that captures the project structure and organization patterns.
Focus on:
- Directory structure conventions
- Module organization patterns
- Naming conventions for files and folders
- Code organization principles specific to this project
`,
    tech: `
Create a steering document that captures the technical conventions and patterns for this project.
Focus on:
- Technology stack preferences
- Coding style and patterns used in this codebase
- Testing approaches and conventions
- Performance considerations specific to this project
`,
    custom: `
Create a steering document based on the user's specific requirements.
Ensure the document provides clear, actionable guidance that is specific to this project.
`
};