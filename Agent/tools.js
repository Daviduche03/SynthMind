import { TavilySearchResults } from "@langchain/community/tools/tavily_search";


const createTools = () => ({
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
            apiKey: "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",
        });
        return await webSearch._call(query);
    },
});



export { createTools };