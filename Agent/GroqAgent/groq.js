import BaseAgent from "../base.js";
import { Groq } from "groq-sdk";


class GroqAgent extends BaseAgent {
  constructor({ systemMessage, tools, apiKey }) {
    super(systemMessage, tools);
    this.agent_tools = tools;
    this.groq = new Groq({ apiKey: apiKey });
  }

  async sendMessage(userMessage) {
    let tools = [];

    for (const tool of this.agent_tools) {
      const { tool_name, description, parameters } = tool;

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

