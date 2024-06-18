import BaseAgent from "../base.js";
import OpenAI from "openai";
import AgentMemory from "../memory/memory.js";




class OpenAIAgent extends BaseAgent {
    constructor({ systemMessage, tools, apiKey, memory }) {
        super(systemMessage, tools, memory);
        this.agent_tools = tools;
        this.openai = new OpenAI({
            apiKey: apiKey,
        });
        this.memory = memory;
        
        
    }

    async sendMessage(userMessage) {
        let tools = [];

        for (const tool of this.agent_tools) {
            const { tool_name, tool_function, description, parameters } = tool;

            tools.push({
                type: "function",
                function: {
                    name: tool_name,
                    description: description,
                    parameters: parameters,
                },
            });
        }

        this.messages.push({ role: 'user', content: userMessage });
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: this.messages,
            tools: tools,
            tool_choice: "auto",
        });

        const responseMessage = response.choices[0].message;
        this.messages.push(responseMessage);

        if (responseMessage.tool_calls) {
            await this.processToolCalls(responseMessage.tool_calls);
            return this.sendMessage(''); // Recursive call to get the final response
        } else {
            
            if(this.memory) {
                AgentMemory.addMessage({ userMessage, agentMessage: responseMessage.content });
            }
            return responseMessage.content;
        }
    }
}

export default OpenAIAgent


