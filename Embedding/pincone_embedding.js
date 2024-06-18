import OpenAI from "openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


class PinconeEmbedding {
    constructor(text, dbUrl) {
        this.text = text;
    }

    splitText() {
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        return splitter.createDocuments([this.text]);
    }

    async embedDocuments(texts) {
        const embedding = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: texts,
            encoding_format: "float",
          });
        return embedding.data[0].embedding;
    }

    async addVectors(vectors, documents) {
        const embeddingDocuments = vectors.map((embedding, idx) => ({
            content: documents[idx].pageContent,
            embedding,
            metadata: documents[idx].metadata,
        }));
        try {
            await EmbeddingModel.insertMany(embeddingDocuments, { ordered: false });
        } catch (error) {
            console.error("Error adding vectors to the database:", error);
        }
    }

    
    

}
