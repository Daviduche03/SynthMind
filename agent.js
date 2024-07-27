import dotenv from 'dotenv';
import readline from 'readline';
import OpenAIAgent from "./Agent/OpenaiAgent/openai.js";
import AzureOpenAIAgent from "./Agent/OpenaiAgent/azure.js";
import GroqAgent from "./Agent/GroqAgent/groq.js";
import { createTools, createTool } from "./Agent/tools.js";
import AgentMemory from "./Agent/memory/memory.js";
import { embedText, embeddingRetrieve } from "./Embedding/mongo/index.js";

// Load environment variables
dotenv.config();

// Initialize readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Custom tool: Vector store search
const vectorSearchTool = createTool({
    tool_name: 'vector_search',
    description: 'Search the vector store for relevant information',
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search query',
            },
        },
        required: ['query'],
    },
    tool_function: async (query) => {
        const documents = await embeddingRetrieve({
            query: query,
            dbUri: process.env.MONGODB_URI,
            openAIApiKey: process.env.OPENAI_API_KEY
        });
        return documents.map(doc => doc[0].pageContent).join('\n');
    }
});

// Custom tool: Human input
const humanInputTool = createTool({
    tool_name: 'human_input',
    description: 'Get input from a human',
    parameters: {
        type: 'object',
        properties: {
            prompt: {
                type: 'string',
                description: 'Prompt for the human',
            },
        },
        required: ['prompt'],
    },
    tool_function: (prompt) => {
        return new Promise((resolve) => {
            rl.question(`Human Input (${prompt}): `, (answer) => {
                resolve(answer);
            });
        });
    }
});

// Combine custom tools with default tools
const tools = [
    vectorSearchTool,
    humanInputTool,
    ...createTools()
];

// Initialize agents
const openaiAgent = new OpenAIAgent({
    systemMessage: "You are a helpful AI assistant named David.",
    tools: tools,
    apiKey: process.env.OPENAI_API_KEY,
    memory: true
});

const azureAgent = new AzureOpenAIAgent({
    systemMessage: "You are a helpful AI assistant specialized in Azure services.",
    tools: tools,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.OPENAI_API_BASE_URL,
    apiVersion: "2022-12-01",
    deployment: "gpt-4o",
    memory: true,
});

const groqAgent = new GroqAgent({
    systemMessage: "You are a fast and efficient AI assistant.",
    tools: tools,
    apiKey: process.env.GROG_KEY,
    memory: true
});

// Function to get user input
const getUserInput = () => {
    return new Promise((resolve) => {
        rl.question('User Input: ', (input) => {
            resolve(input);
        });
    });
};

// Main interaction loop
async function main() {
    console.log("Welcome to the AI Agent Library demo!");
    console.log("Choose an agent to interact with:");
    console.log("1. OpenAI Agent");
    console.log("2. Azure OpenAI Agent");
    console.log("3. Groq Agent");
    console.log("Type 'exit' to quit at any time.");

    while (true) {
        const agentChoice = await getUserInput();
        
        if (agentChoice.toLowerCase() === 'exit') {
            break;
        }

        let currentAgent;
        switch (agentChoice) {
            case '1':
                currentAgent = openaiAgent;
                console.log("Using OpenAI Agent");
                break;
            case '2':
                currentAgent = azureAgent;
                console.log("Using Azure OpenAI Agent");
                break;
            case '3':
                currentAgent = groqAgent;
                console.log("Using Groq Agent");
                break;
            default:
                console.log("Invalid choice. Please try again.");
                continue;
        }

        console.log("Start chatting with the agent. Type 'switch' to change agents or 'exit' to quit.");

        while (true) {
            const userMessage = await getUserInput();

            if (userMessage.toLowerCase() === 'exit') {
                rl.close();
                return;
            }

            if (userMessage.toLowerCase() === 'switch') {
                break;
            }

            const response = await currentAgent.sendMessage(userMessage);
            console.log("Agent:", response);

            // Demonstrate memory usage
            console.log("Memory:");
            console.log(AgentMemory.getMessages());
        }
    }

    rl.close();
}

// Run the main function
main().catch(console.error);

// Example of using the vector store directly
async function vectorStoreExample() {
    const textToEmbed = "This is a sample text to embed in the vector store.";
    await embedText(textToEmbed, process.env.MONGODB_URI, process.env.OPENAI_API_KEY);

    const searchResult = await embeddingRetrieve({
        query: "sample text",
        dbUri: process.env.MONGODB_URI,
        openAIApiKey: process.env.OPENAI_API_KEY
    });

    console.log("Vector Store Search Result:", searchResult);
}

// Uncomment the following line to run the vector store example
// vectorStoreExample().catch(console.error);