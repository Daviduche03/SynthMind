class BaseAgent {
    constructor(systemMessage, tools) {
      this.systemMessage = systemMessage;
      this.tools = tools;
      this.messages = [
        { role: 'system', content: this.systemMessage },
      ];
    }
  
    async callFunction(functionName, functionArgs) {
      if (this.tools && this.tools[functionName]) {
        return this.tools[functionName](...functionArgs);
      } else {
        throw new Error(`Function ${functionName} is not available.`);
      }
    }
  
    async processToolCalls(toolCalls) {
      for (const toolCall of toolCalls) {
        const { function: { name: functionName, arguments: functionArgs } } = toolCall;
        const response = await this.callFunction(functionName, [functionArgs]);
        this.messages.push({
            tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: response,
        });
      }
    }
  }
  
export default BaseAgent