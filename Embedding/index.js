import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

import { CustomVectorStore } from "./mongo/MongoBase.js";
import mongoose from "mongoose";

import dotenv from 'dotenv';
dotenv.config();

// const vectorstore = new CustomVectorStore();
// const vectorstore = new CustomVectorStore(new OpenAIEmbeddings({
//     openAIApiKey: process.env.OPENAI_API_KEY,
// }));

//   // Add a long story in chunks
//   await vectorstore.addDocuments([
//     new Document({
//       pageContent: "In 1928, Alexander Fleming was working at St. Mary's Hospital, London.",
//       metadata: { id: 1 },
//     }),
//     new Document({
//       pageContent: "He was studying Staphylococcus bacteria.",
//       metadata: { id: 2 },
//     }),
//     new Document({
//       pageContent: "Fleming noticed that a petri dish containing Staphylococcus was contaminated with mold.",
//       metadata: { id: 3 },
//     }),
//     new Document({
//       pageContent: "The mold seemed to be inhibiting the growth of the bacteria.",
//       metadata: { id: 4 },
//     }),
//     new Document({
//       pageContent: "Fleming identified the mold as Penicillium notatum.",
//       metadata: { id: 5 },
//     }),
//     new Document({
//       pageContent: "He discovered that it produced a substance that killed a wide range of bacteria.",
//       metadata: { id: 6 },
//     }),
//     new Document({
//       pageContent: "This substance was later named penicillin.",
//       metadata: { id: 7 },
//     }),
//     new Document({
//       pageContent: "Penicillin became the first widely used antibiotic.",
//       metadata: { id: 8 },
//     }),
//     new Document({
//       pageContent: "It revolutionized the field of medicine and saved countless lives.",
//       metadata: { id: 9 },
//     }),
//   ]);

//   // Perform a similarity search related to the story
//   const query = "What was the first antibiotic discovered?";
//   const queryVector = await new OpenAIEmbeddings({
//     openAIApiKey: process.env.OPENAI_API_KEY,
// }).embedDocuments([query]);

//   const results = await vectorstore.similaritySearchVectorWithScore(queryVector[0], 3);
//   const res = await vectorstore.similaritySearch(query);

//   console.log(results, res);


// Assume you have Mongoose and the CustomVectorStore class defined as shown in the previous code snippets






// MongoDB connection URL and database name

const dbUri = process.env.MONGODB_URI;

// Embeddings interface
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

  // Example texts and metadatas
  const texts = [
    "Mitochondria is the powerhouse of the cell",
    "Buildings are made of brick",
    "my name is david",
    "the dog is hungry",
  ];
  const metadatas = [{ id: 1 }, { id: 2 }];
  
  (async () => {
    // Create an instance of CustomVectorStore and add documents
    const vectorstore = new CustomVectorStore(embeddings, {}, dbUri);
  
    // Perform a similarity search
    const query = "What is the power of the cell?";
    const queryVector = await vectorstore.getQueryVector(query);

    // const q = await embeddings.embedQuery(query);
  
    const results = await vectorstore.similaritySearchVectorWithScore(queryVector, 2);
  
    console.log(results);
  })();