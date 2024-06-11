import { createTools } from "./tools.js";
import GroqAgent from "../Agent/GroqAgent/groq.js";
import OpenAIAgent from "../Agent/OpenaiAgent/openai.js";
import { createTools } from "../Agent/tools.js";




const runSequentialWorkflow = async (user_prompt, agentConfigs) => {
    let input = user_prompt;
    for (const { agentClass, systemMessage, tools, apiKey } of agentConfigs) {
      const agent = new agentClass(systemMessage, tools, apiKey);
      input = await agent.sendMessage(input);
      console.log(`Response from agent: ${input}`);
    }
    return input;
  };
  
  const runHierarchicalWorkflow = async (user_prompt, managerConfig, agentConfigs) => {
    const managerAgent = new managerConfig.agentClass(managerConfig.systemMessage, createTools(), managerConfig.apiKey);
    const managerResponse = await managerAgent.sendMessage(user_prompt);
    const taskAssignments = JSON.parse(managerResponse.match(/\[.*\]/s)[0]);
  
    let input = user_prompt;
    for (const { agentIndex, taskDescription } of taskAssignments) {
      const { agentClass, systemMessage, tools, apiKey } = agentConfigs[agentIndex];
      const agent = new agentClass(systemMessage, tools, apiKey);
      input = await agent.sendMessage(taskDescription);
      console.log(`Response from agent ${agentIndex}: ${input}`);
    }
    return input;
  };
  
  const agentConfigs = [
    { agentClass: GroqAgent, systemMessage: "Competitor Research Agent's system message", tools: createTools(), apiKey: "YOUR_API_KEY_HERE" },
    { agentClass: OpenAIAgent, systemMessage: "Content Creation Agent's system message", tools: createTools(), apiKey: "YOUR_API_KEY_HERE" },
    { agentClass: OpenAIAgent, systemMessage: "Quality and Accuracy Improvement Agent's system message", tools: createTools(), apiKey: "YOUR_API_KEY_HERE" },
  ];
  
  const user_prompt = "Your prompt here";
  const workflowType = "sequential"; // or "hierarchical"
  
  if (workflowType === "sequential") {
    runSequentialWorkflow(user_prompt, agentConfigs).then(response => {
      console.log("Final Response:", response);
    });
  } else if (workflowType === "hierarchical") {
    const managerConfig = { agentClass: OpenAIAgent, systemMessage: "Manager Agent's system message", tools: createTools(), apiKey: "" };
    runHierarchicalWorkflow(user_prompt, managerConfig, agentConfigs).then(response => {
      console.log("Final Response:", response);
    });
  }
  