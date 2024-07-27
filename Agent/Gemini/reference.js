import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiBase, createGeminiTool } from "./base.js";

class ExtendedGeminiBase extends GeminiBase {
  constructor(apiKey, modelName = "gemini-1.5-pro", systemMessage) {
    super(apiKey, modelName, systemMessage);
    this.temperature = 0.7;
    this.maxOutputTokens = 1024;
  }

  setModelParameters(params) {
    this.temperature = params.temperature || this.temperature;
    this.maxOutputTokens = params.maxOutputTokens || this.maxOutputTokens;
  }

  async streamResponse(userPrompt) {
    const result = await this.chat.sendMessageStream(userPrompt);
    return result;
  }

  async retry(func, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await func();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async sendMessage(userPrompt) {
    try {
      const result = await this.retry(() => this.chat.sendMessage(userPrompt));
      
      // Add user message to history
      this.history.push({ role: "user", parts: userPrompt });

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

          // Add function call and response to history
          this.history.push({ role: "function", name: functionCall.name, content: apiResponse });
          this.history.push({ role: "assistant", parts: result2.response.text() });

          return result2.response.text();
        } else {
          return `Function ${functionCall.name} not found.`;
        }
      } else {
        // Add assistant's response to history
        this.history.push({ role: "assistant", parts: result.response.text() });
        return result.response.text();
      }
    } catch (error) {
      console.error("An error occurred:", error);
      return "An error occurred while processing your request.";
    }
  }

  summarizeConversation() {
    // Implement conversation summarization logic here
    console.log("Summarizing conversation:", this.history);
  }

  branchConversation() {
    // Implement conversation branching logic here
    const newBranch = [...this.history];
    console.log("Created new conversation branch:", newBranch);
    return newBranch;
  }

  parseOutput(output, format = 'text') {
    switch (format) {
      case 'json':
        return JSON.parse(output);
      case 'markdown':
        // Implement markdown parsing
        console.log("Parsing markdown:", output);
        return output;
      default:
        return output;
    }
  }

  initializeModel() {
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
      },
      systemInstruction: this.systemInstruction,
      tools: {
        functionDeclarations: this.functionDeclarations,
      },
    });
    this.chat = this.model.startChat({
      history: this.history,
    });
  }
}

// Example usage
async function exampleUsage() {
  const apiKey = '';
  const systemMessage = "You are a helpful assistant with a focus on technology and programming.";
  
  const agent = new ExtendedGeminiBase(apiKey, "gemini-1.5-pro", systemMessage);
  
  // Initialize the model
  agent.initializeModel();
  
  // Set custom model parameters
  agent.setModelParameters({ temperature: 0.8, maxOutputTokens: 2048 });
  
  // Add a custom tool
  agent.addTool(createGeminiTool({
    name: "getCurrentWeather",
    description: "Get the current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. San Francisco, CA"
        }
      },
      required: ["location"]
    },
    implementation: async (args) => {
      // This would normally call a weather API
      return JSON.stringify({ temperature: 72, condition: "Sunny" });
    }
  }));
  
  // Send messages and get responses
  const response1 = await agent.sendMessage("Hello! Can you tell me about the latest trends in AI?");
  console.log("Response 1:", response1);
  
  const response2 = await agent.sendMessage("What's the weather like in San Francisco?");
  console.log("Response 2:", response2);
  
  // Use the stream response feature
  const stream = await agent.streamResponse("Write a short story about a robot learning to paint.");
  for await (const chunk of stream) {
    process.stdout.write(chunk.text());
  }
  
  // Summarize the conversation
  agent.summarizeConversation();
  
  // Create a new branch of the conversation
  const newBranch = agent.branchConversation();
  
  // Parse output in different formats
  const jsonOutput = agent.parseOutput('{"key": "value"}', 'json');
  console.log("Parsed JSON:", jsonOutput);
}

exampleUsage().catch(console.error);

export { ExtendedGeminiBase };