import OpenAIAgent from "./Agent/OpenaiAgent/openai.js";
import { createTool } from "./Agent/tools.js";
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import cron from 'node-cron';

dotenv.config();

// Knowledge Base setup
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("agent_knowledge_base");
const knowledgeCollection = db.collection("knowledge");
const taskCollection = db.collection("tasks");

async function saveKnowledge(key, value) {
  await knowledgeCollection.updateOne(
    { key },
    { $set: { value } },
    { upsert: true }
  );
}

async function getKnowledge(key) {
  const doc = await knowledgeCollection.findOne({ key });
  return doc ? doc.value : null;
}

class Task {
  constructor(description, assignee, status = 'pending', dependencies = []) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.description = description;
    this.assignee = assignee;
    this.status = status;
    this.dependencies = dependencies;
  }
}

class BaseAgent {
  constructor(name, role, tools = []) {
    this.name = name;
    this.role = role;
    this.agent = new OpenAIAgent({
      systemMessage: `You are ${name}, a ${role}. Your goal is to complete assigned tasks efficiently and collaborate with other agents when necessary.`,
      tools: [
        ...tools,
        createTool({
          tool_name: 'get_knowledge',
          description: 'Retrieve information from the knowledge base',
          parameters: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The key to retrieve',
              },
            },
            required: ['key'],
          },
          tool_function: async (query) => {
            const result = await getKnowledge(query.key);
            return result || "No information found in the knowledge base.";
          }
        }),
        createTool({
          tool_name: 'save_knowledge',
          description: 'Save information to the knowledge base',
          parameters: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The key to save under',
              },
              value: {
                type: 'string',
                description: 'The value to save',
              },
            },
            required: ['key', 'value'],
          },
          tool_function: async (query) => {
            await saveKnowledge(query.key, query.value);
            return "Information saved successfully.";
          }
        }),
      ],
      apiKey: process.env.OPENAI_API_KEY,
      memory: true
    });
  }

  async processTask(task) {
    const response = await this.agent.sendMessage(`Process this task: ${task.description}`);
    task.status = 'completed';
    await taskCollection.updateOne({ id: task.id }, { $set: task });
    return response;
  }
}

class ManagerAgent extends BaseAgent {
  constructor(name) {
    super(name, "Project Manager", [
      createTool({
        tool_name: 'assign_task',
        description: 'Assign a task to an agent',
        parameters: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'The task description',
            },
            assignee: {
              type: 'string',
              description: 'The name of the agent to assign the task to',
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of task IDs that this task depends on',
            },
          },
          required: ['description', 'assignee'],
        },
        tool_function: async (query) => {
          const task = new Task(query.description, query.assignee, 'pending', query.dependencies || []);
          await taskCollection.insertOne(task);
          return `Task assigned: ${task.id}`;
        }
      }),
      createTool({
        tool_name: 'get_task_status',
        description: 'Get the status of a task',
        parameters: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'The ID of the task',
            },
          },
          required: ['taskId'],
        },
        tool_function: async (query) => {
          const task = await taskCollection.findOne({ id: query.taskId });
          return task ? `Task ${task.id} status: ${task.status}` : "Task not found";
        }
      }),
    ]);
  }

  async planWeek(weeklyGoal) {
    const plan = await this.agent.sendMessage(`Create a weekly plan to achieve this goal: ${weeklyGoal}. Use the assign_task tool to create and assign tasks to the appropriate agents.`);
    return plan;
  }

  async monitorProgress() {
    const tasks = await taskCollection.find({ status: { $ne: 'completed' } }).toArray();
    for (const task of tasks) {
      if (task.dependencies.every(async (depId) => {
        const depTask = await taskCollection.findOne({ id: depId });
        return depTask && depTask.status === 'completed';
      })) {
        const status = await this.agent.sendMessage(`Check on the progress of task ${task.id}: ${task.description}. Use the get_task_status tool if necessary.`);
        console.log(`Task ${task.id} status update: ${status}`);
      }
    }
  }
}

class DeveloperAgent extends BaseAgent {
  constructor(name) {
    super(name, "Developer", [
      createTool({
        tool_name: 'code_review',
        description: 'Review code for improvements and bugs',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code to review',
            },
          },
          required: ['code'],
        },
        tool_function: (query) => {
          // Implement code review logic here
          return "Code reviewed successfully. Suggestions: ...";
        }
      }),
    ]);
  }
}

class MarketingAgent extends BaseAgent {
  constructor(name) {
    super(name, "Marketing Specialist", [
      createTool({
        tool_name: 'generate_post',
        description: 'Generate a social media post',
        parameters: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'The topic for the post',
            },
            platform: {
              type: 'string',
              description: 'The social media platform',
            },
          },
          required: ['topic', 'platform'],
        },
        tool_function: (query) => {
          // Implement post generation logic here
          return `Generated post for ${query.platform} about ${query.topic}: ...`;
        }
      }),
    ]);
  }

  async schedulePosts() {
    const postIdeas = await this.agent.sendMessage("Generate 5 post ideas for the week.");
    for (const idea of postIdeas.split('\n')) {
      const post = await this.agent.sendMessage(`Use the generate_post tool to create a post about: ${idea}`);
      console.log(`Scheduled post: ${post}`);
    }
  }
}

class SupportAgent extends BaseAgent {
  constructor(name) {
    super(name, "Customer Support Representative");
  }

  async handleInquiry(inquiry) {
    return this.agent.sendMessage(`Respond to this customer inquiry: ${inquiry}`);
  }
}

class AgentSystem {
  constructor() {
    this.manager = new ManagerAgent("ManagerAI");
    this.developer = new DeveloperAgent("DevAI");
    this.marketer = new MarketingAgent("MarketAI");
    this.support = new SupportAgent("SupportAI");
    this.agents = {
      ManagerAI: this.manager,
      DevAI: this.developer,
      MarketAI: this.marketer,
      SupportAI: this.support,
    };
  }

  async start() {
    console.log("Starting the agent system...");
    this.setupCronJobs();
    await this.runMainLoop();
  }

  setupCronJobs() {
    // Schedule post generation every day at 9 AM
    cron.schedule('0 9 * * *', () => {
      this.marketer.schedulePosts();
    });

    // Monitor task progress every hour
    cron.schedule('0 * * * *', () => {
      this.manager.monitorProgress();
    });
  }

  async runMainLoop() {
    while (true) {
      const pendingTasks = await taskCollection.find({ status: 'pending' }).toArray();
      for (const task of pendingTasks) {
        if (task.dependencies.every(async (depId) => {
          const depTask = await taskCollection.findOne({ id: depId });
          return depTask && depTask.status === 'completed';
        })) {
          const agent = this.agents[task.assignee];
          if (agent) {
            const result = await agent.processTask(task);
            console.log(`Task completed by ${agent.name}: ${result}`);
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute before next iteration
    }
  }

  async setWeeklyGoal(goal) {
    const weeklyPlan = await this.manager.planWeek(goal);
    console.log("Weekly plan created:", weeklyPlan);
  }

  async handleCustomerSupport(inquiry) {
    return this.support.handleInquiry(inquiry);
  }
}

// Usage example
async function runAdvancedMultiAgentSystem() {
  const system = new AgentSystem();
  
  // Set the weekly goal
  await system.setWeeklyGoal("Increase user engagement by 20% and release a new feature for BrimInk");
  
  // Handle a customer support inquiry
  const supportResponse = await system.handleCustomerSupport("How do I reset my password?");
  console.log("Support response:", supportResponse);
  
  // Start the system
  await system.start();
}

runAdvancedMultiAgentSystem().catch(console.error);





