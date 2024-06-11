import BaseAgent from "../base.js";
import OpenAI from "openai";

class OpenAIAgent extends BaseAgent {
    constructor(systemMessage, tools, apiKey) {
        super(systemMessage, tools);
        this.openai = new OpenAI({
            apiKey: apiKey,
        });
    }



    async sendMessage(userMessage) {
        const tools = [
            {
                type: "function",
                function: {
                    name: "get_current_weather",
                    description: "Get the current weather in a given location",
                    parameters: {
                        type: "object",
                        properties: {
                            location: {
                                type: "string",
                                description: "The city and state, e.g. San Francisco, CA",
                            },
                            unit: { type: "string", enum: ["celsius", "fahrenheit"] },
                        },
                        required: ["location"],
                    },
                },
            },
        ];
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
            return responseMessage.content;
        }
    }
}

export default OpenAIAgent