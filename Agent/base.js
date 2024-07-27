import AgentMemory from "./memory/memory.js";

class BaseAgent {
  constructor(systemMessage, tools = [], memory = null, callback = null) {
    this.tools = {};
    this.memory = null;
    this.callback = callback;

    if (memory) {
      const messages = AgentMemory.getMessages();
      if (messages.length > 0) {
        this.memory = messages;
        this.systemMessage = `You're a helpful conversational agent. You will stick to every instruction and personality provided in the system message and use the conversation memory for better results.
        System message: ${systemMessage}
        Conversation memory: ${JSON.stringify(this.memory)}`;
      } else {
        this.systemMessage = `You're a helpful conversational agent. You will stick to every instruction and personality provided in the system message for better results.
        System message: ${systemMessage}`;
      }
    } else {
      this.systemMessage = `You're a helpful conversational agent. You will stick to every instruction and personality provided in the system message for better results.
      System message: ${systemMessage}`;
    }

    if (Array.isArray(tools)) {
      for (const tool of tools) {
        const { tool_name, tool_function } = tool;
        this.tools[tool_name] = tool_function;
      }
    }

    this.messages = [
      { role: 'system', content: this.systemMessage },
    ];
  }

  async callFunction(functionName, functionArgs) {
    if (this.tools && this.tools[functionName]) {
      const result = await this.tools[functionName](...functionArgs);
      
      // Call the callback function if it exists
      if (this.callback) {
        this.callback(functionName, result);
      }
      
      return result;
    } else {
      throw new Error(`Function ${functionName} is not available.`);
    }
  }

  async processToolCalls(toolCalls) {
    for (const toolCall of toolCalls) {
      const { function: { name: functionName, arguments: functionArgs } } = toolCall;
      try {
        const response = await this.callFunction(functionName, [functionArgs]);
        this.messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: response,
        });
      } catch (error) {
        console.error(`Error processing tool call for function ${functionName}:`, error);
      }
    }
  }
}

export default BaseAgent;