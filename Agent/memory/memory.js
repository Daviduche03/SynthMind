class AgentMemory {
    constructor() {
        if (!AgentMemory.instance) {
            this.memory = [];
            AgentMemory.instance = this;
        }
        return AgentMemory.instance;
    }

    addMessage({userMessage, agentMessage}) {
        this.memory.push({ user: userMessage, assistant: agentMessage });
    }

    getMessages() {
        return this.memory;
    }

    clearMessages() {
        this.memory = [];
    }

    getLastMessage() {
        return this.memory.length > 0 ? this.memory[this.memory.length - 1] : null;
    }
}

const instance = new AgentMemory();
Object.freeze(instance);




export default instance;
