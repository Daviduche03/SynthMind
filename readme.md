# AI Agent Library Documentation

## Overview

This library provides a framework for creating and interacting with AI agents using various models (OpenAI, Azure OpenAI, Groq) and tools. It includes features such as memory management, custom tools, and vector-based knowledge retrieval.

## Installation

(Note: Installation steps are not provided in the given code. You should include steps to install the library and its dependencies here.)

## Key Components

1. Agents
2. Tools
3. Memory
4. Vector Store

## Usage

### 1. Setting up the environment

First, set up your environment variables:

```
MONGODB_URI=your_mongodb_uri
OPENAI_API_KEY=your_openai_api_key
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
OPENAI_API_BASE_URL=your_azure_openai_base_url
GROG_KEY=your_groq_api_key
```

### 2. Importing required modules

```javascript
import OpenAIAgent from "./Agent/OpenaiAgent/openai.js";
import AzureOpenAIAgent from "./Agent/OpenaiAgent/azure.js";
import GroqAgent from "./Agent/GroqAgent/groq.js";
import { createTools, createTool } from "./Agent/tools.js";
import AgentMemory from "./Agent/memory/memory.js";
```

### 3. Creating custom tools

You can create custom tools using the `createTool` function:

```javascript
const customTool = createTool({
    tool_name: 'tool_name',
    description: 'Tool description',
    parameters: {
        type: 'object',
        properties: {
            // Define tool parameters here
        },
        required: ['required_params'],
    },
    tool_function: (query) => {
        // Implement tool functionality here
    }
});
```

### 4. Initializing an agent

You can initialize different types of agents:

#### OpenAI Agent

```javascript
const openaiAgent = new OpenAIAgent({
    systemMessage: "Your system message here",
    tools: tools,
    apiKey: process.env.OPENAI_API_KEY,
    memory: true
});
```

#### Azure OpenAI Agent

```javascript
const azureAgent = new AzureOpenAIAgent({
    systemMessage: "Your system message here",
    tools: createTools(),
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.OPENAI_API_BASE_URL,
    apiVersion: "2022-12-01",
    deployment: "gpt-4o",
    memory: true,
});
```

#### Groq Agent

```javascript
const groqAgent = new GroqAgent({
    systemMessage: "Your system message here",
    tools: tools,
    apiKey: process.env.GROG_KEY,
    memory: true
});
```

### 5. Sending messages to an agent

```javascript
const response = await agent.sendMessage("Your message here");
console.log(response);
```

### 6. Using the vector store

The library includes functions for embedding text and retrieving similar documents:

```javascript
import { embedText, embeddingRetrieve } from "./Embedding/mongo/index.js";

// Retrieve similar documents
const documents = await embeddingRetrieve({
    query: "Your query here",
    dbUri: process.env.MONGODB_URI,
    openAIApiKey: process.env.OPENAI_API_KEY
});
```

### 7. Using memory

The library includes a memory management system:

```javascript
AgentMemory.addMessage({ userMessage: "hello", agentMessage: "hello" });
```

## Advanced Features

### Human Tool

The library includes a "human tool" that allows for human intervention in the agent's decision-making process:

```javascript
const humanTool = createTool({
    tool_name: 'human',
    description: 'Useful for invoking a human supervisor.',
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: "string",
                description: "context",
            },
        },
        required: ['query'],
    },
    tool_function: (query, conversationId) => humanTool(query, conversationId, sessions)
});
```

### Interactive Mode

The library supports an interactive mode where users can input queries and receive responses from the agent:

```javascript
async function main() {
    while (true) {
        const query = await getUserInput();
        if (/exit/i.test(query)) break;
        
        const response = await agent.sendMessage(query);
        console.log(response);
    }
}
```

## Error Handling

(Note: Error handling is not explicitly shown in the provided code. You should include information about how errors are handled and how users should manage exceptions.)

## Limitations

(Note: Include any known limitations of the library here.)

## Contributing

(Note: Include information about how others can contribute to the library here.)

## License

(Note: Include licensing information for the library here.)