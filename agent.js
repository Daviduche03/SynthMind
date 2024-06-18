import OpenAIAgent from "./Agent/OpenaiAgent/openai.js";
import GroqAgent from "./Agent/GroqAgent/groq.js";
import { createTools, createTool } from "./Agent/tools.js";
import AgentMemory from "./Agent/memory/memory.js";
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();




const start_time = Date.now();

const sessions = {};
const request_session = 999;

const humanTool = async (arg, conversationId = 777, sessions) => {
    console.log(`Human Tool Invoked. Context: ${arg}`);

    // Initialize session if it doesn't exist
    if (!sessions[conversationId]) {
        sessions[conversationId] = {};
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const humanInput = await new Promise(resolve => {
        rl.question('Human Input: ', input => {
            rl.close();
            resolve(input);
        });
    });

    if (/exit/i.test(humanInput)) {
        const updatedSentence = humanInput.replace(/exit/i, "").trim();
        sessions[conversationId].inHumanMode = false;
        return updatedSentence;
    }

    // Store the human input in the session state
    sessions[conversationId].inHumanMode = true;

    console.log(sessions);

    return humanInput;
};

const tools = [
    createTool({
        tool_name: 'web',
        description: 'Search the web for information',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The query to search for',
                },
            },
            required: ['query'],
        },
        tool_function: (query) => {
            console.log(query);
            return 'he is a Software Developer and AI Engineer';
        }
    }),
    createTool({
        tool_name: 'human',
        description: 'Invoke a human supervisor for input',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: "string",
                    description: "The context or query for the human supervisor",
                },
                
            },
            required: ['query'],
        },
        tool_function: (query, conversationId) => humanTool(query, conversationId, sessions)
    })
];

AgentMemory.addMessage({ userMessage: "hello", agentMessage: "hello" });
AgentMemory.addMessage({ userMessage: "my name is john", agentMessage: "nice to meet you john" });


const agent = new OpenAIAgent({ systemMessage: "your name is David", tools: tools, apiKey: process.env.OPENAI_API_KEY, memory: true });
const response = await agent.sendMessage("please handover to the human?");
console.log(response);

const end_time = Date.now();

console.log((end_time - start_time) / 1000);



