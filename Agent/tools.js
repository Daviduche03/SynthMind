import { TavilySearchResults } from "@langchain/community/tools/tavily_search";


const defaultTools = () => ({
    get_current_weather: (location, unit = "fahrenheit") => {
        if (location.toLowerCase().includes("tokyo")) {
            return JSON.stringify({ location: "Tokyo", temperature: "10", unit: "celsius" });
        } else if (location.toLowerCase().includes("san francisco")) {
            return JSON.stringify({ location: "San Francisco", temperature: "72", unit: "fahrenheit" });
        } else if (location.toLowerCase().includes("paris")) {
            return JSON.stringify({ location: "Paris", temperature: "22", unit: "fahrenheit" });
        } else {
            return JSON.stringify({ location, temperature: "unknown" });
        }
    },
    web: async (query) => {
        const webSearch = new TavilySearchResults({
            maxResults: 1,
            apiKey: "",
        });
        return await webSearch._call(query);
    },
});


const createTool = ({ tool_name, description, parameters, tool_function }) => ({
    tool_name,
    description,
    parameters,
    tool_function,
});

const createTools = () => [
    createTool({
        tool_name: "get_current_weather",
        description: "Get the current weather in a given location",
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: "string",
                    description: "The city and state, e.g. San Francisco, CA",
                },
                unit: { 
                    type: "string", 
                    enum: ["celsius", "fahrenheit"] 
                },
            },
            required: ['location', 'unit']
        },
        tool_function: defaultTools().get_current_weather
    }),
    createTool({
        tool_name: "web",
        description: "Search the web for information",
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: "string",
                    description: "The query to search for",
                },
            },
            required: ['query']
        },
        tool_function: defaultTools().web
    }),
];





export { createTools, createTool };