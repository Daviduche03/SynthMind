import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { CustomVectorStore } from "./MongoBase.js";
import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();





const embedText = async ({ content, dbUri, openAIApiKey }) => {
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: openAIApiKey,
    });

    const vectorstore = new CustomVectorStore(embeddings, {}, dbUri);

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 100,
        chunkOverlap: 1,
    });

    const output = await splitter.createDocuments([content]);
    await vectorstore.addDocuments(output);

}

const embeddingRetrieve = async ({ dbUri, openAIApiKey, query }) => {
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: openAIApiKey,
    });
    const vectorstore = new CustomVectorStore(embeddings, {}, dbUri);
    const queryVector = await vectorstore.getQueryVector(query);

    // const q = await embeddings.embedQuery(query);
  
    const results = await vectorstore.similaritySearchVectorWithScore(queryVector, 4);

    return results
}

export { embedText, embeddingRetrieve };


