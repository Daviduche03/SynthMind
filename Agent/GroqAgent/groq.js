import BaseAgent from "../base.js";
import { Groq } from "groq-sdk";


class GroqAgent extends BaseAgent {
    constructor(systemMessage, tools, apiKey) {
      super(systemMessage, tools);
      this.groq = new Groq({ apiKey: apiKey });
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
      const response = await this.groq.chat.completions.create({
        model: "llama3-70b-8192",
        messages: this.messages,
        tools: tools,
        tool_choice: "auto",
        max_tokens: 4096,
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

export default GroqAgent

//   "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"