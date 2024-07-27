import { GeminiBase, createGeminiTool } from "./base.js";


export class GeminiAgent extends GeminiBase {
    constructor({ apiKey, modelName, systemMessage , history}) {
        super(apiKey, modelName, systemMessage);
        this.addChatHistory(history);
        this.initializeModel();
        
    }


}

// Usage example
async function main() {
    const apiKey = "";

    const history = [
        {
            role: "user",
            parts: [{
                text: "my name is david",
            }]
        },
    ];

    const systemMessage = "You are a helpful conversational agent."

    const agent = new GeminiAgent({ apiKey, modelName: "gemini-1.5-pro", systemMessage, history });

    // Adding a new tool dynamically
    const weatherTool = createGeminiTool({
        name: "getWeather",
        description: "Get the current weather for a location",
        parameters: {
            type: "OBJECT",
            properties: {
                location: {
                    type: "STRING",
                    description: "The city and country",
                },
            },
            required: ["location"],
        },
        implementation: async ({ location }) => {
            // Mock weather API call
            return { temperature: 22, condition: "Sunny", location };
        }
    });
    agent.addTool(weatherTool);

    agent.addChatHistory(history);

    const response = await agent.sendMessage("hey, what is the current weather in denver?");
    console.log(response);
}

// Uncomment the line below to run the example
// main().catch(console.error);