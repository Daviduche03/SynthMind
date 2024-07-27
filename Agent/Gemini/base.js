import { GoogleGenerativeAI } from "@google/generative-ai";


class GeminiBase {
  constructor(apiKey, modelName = "gemini-1.5-pro", systemMessage ) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    this.functionDeclarations = [];
    this.functions = {};
    this.history = [];
    this.tools = new Map();
    this.systemInstruction = `You're a helpful conversational agent. You will stick to every instruction and personality provided in the system message and use the conversation memory for better results.
        System message: ${systemMessage}
        Conversation memory: ${JSON.stringify(this.history)}`;
  }

  initializeModel() {
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: this.systemInstruction,
      tools: {
        functionDeclarations: this.functionDeclarations,
      },
    });
    this.chat = this.model.startChat({
      history: this.history,
    });
    // console.log(this.history);
  }

  addTool(tool) {
    this.tools.set(tool.name, tool);
    this.addFunctionDeclaration(tool.name, tool.description, tool.parameters);
    this.addFunction(tool.name, tool.implementation);
  }


  addFunctionDeclaration(name, description, parameters) {
    this.functionDeclarations.push({ name, description, parameters });
  }

  addFunction(name, func) {
    this.functions[name] = func;
  }

  async sendMessage(userPrompt) {
    try {
      const result = await this.chat.sendMessage(userPrompt);
      // this.history.push({role: "user", parts: "my name is david"});
      // console.log(result);

      if (!result.response.text()) {
        const functionCall = result.response.functionCalls()[0];
        const func = this.functions[functionCall.name];
        if (func) {
          const apiResponse = await func(functionCall.args);
          
          const result2 = await this.chat.sendMessage([{
            functionResponse: {
              name: functionCall.name,
              response: apiResponse
            }
          }]);

          return result2.response.text();
        } else {
          return `Function ${functionCall.name} not found.`;
        }
      } else {
        return result.response.text();
      }
    } catch (error) {
      console.error("An error occurred:", error);
      return "An error occurred while processing your request.";
    }
  }

  addChatHistory(history) {
    this.history = history;
  }
}


const createGeminiTool = ({ name, description, parameters, implementation }) => ({
  name,
  description,
  parameters,
  implementation
});


export { GeminiBase, createGeminiTool };