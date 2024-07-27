import BaseAgent from "../base.js";
import OpenAI, {AzureOpenAI} from "openai";
import AgentMemory from "../memory/memory.js";




class AzureOpenAIAgent extends BaseAgent {
    constructor({ systemMessage, tools, apiKey, endpoint, apiVersion, deployment, memory }) {
        super(systemMessage, tools, memory);
        this.agent_tools = tools;
        this.openai = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });
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
            // console.log(responseMessage.tool_calls);

            if (responseMessage.tool_calls.some((tool) => tool.function.name === 'human')) {

                const humanInput = await this.processToolCalls(responseMessage.tool_calls);

                return humanInput;
            } else {
                await this.processToolCalls(responseMessage.tool_calls);
                return this.sendMessage('');
            }

            

        } else {
            if (this.memory) {
                AgentMemory.addMessage({ userMessage, agentMessage: responseMessage.content });
            }
            return responseMessage.content;
        }

    }
}

export default AzureOpenAIAgent



