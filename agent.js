import OpenAIAgent from "./Agent/OpenaiAgent/openai.js";
import GroqAgent from "./Agent/GroqAgent/groq.js";
import { createTools } from "./Agent/tools.js";

const agent = new OpenAIAgent("your name is David", createTools(), "sk-proj-ghu7uoE3Ax60RqECgCeDT3BlbkFJsyqYzYBmQfTOG02ANG6Q");
const response = await agent.sendMessage("what weather in San Francisco?");
console.log(response);

// sk-proj-ghu7uoE3Ax60RqECgCeDT3BlbkFJsyqYzYBmQfTOG02ANG6Q