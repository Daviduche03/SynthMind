import mongoose from 'mongoose';
import { VectorStore } from "@langchain/core/vectorstores";
import { Document } from "@langchain/core/documents";
import { similarity as ml_distance_similarity } from "ml-distance";

// Define a Mongoose schema for storing embeddings
const embeddingSchema = new mongoose.Schema({
  content: { type: String, unique: true },
  embedding: [Number],
  metadata: mongoose.Schema.Types.Mixed,
});

const EmbeddingModel = mongoose.model('Embedding', embeddingSchema);

class CustomVectorStore extends VectorStore {
  constructor(embeddings, fields = {}, useDatabase = false, dbUri) {
    super(embeddings, fields);
    this.useDatabase = useDatabase;
    this.dbUri = dbUri;

    if (this.useDatabase) {
      this.connectToDatabase();
    } else {
      this.memoryVectors = [];
    }
  }
  
  _vectorstoreType() {
    return "custom";
  }

  connectToDatabase() {
    mongoose.connect(this.dbUri);
  }

  async addDocuments(documents) {
    if (this.useDatabase) {
      await this.addDocumentsToDatabase(documents);
    } else {
      await this.addDocumentsToMemory(documents);
    }
  }

  async addDocumentsToMemory(documents) {
    const texts = documents.map(({ pageContent }) => pageContent);
    const newEmbeddings = await this.embeddings.embedDocuments(texts);
    await this.addVectorsToMemory(newEmbeddings, documents);
  }

  async addDocumentsToDatabase(documents) {
    try {
      const embeddings = await this.embeddings.embedDocuments(documents.map(({ pageContent }) => pageContent));
      const embeddingDocuments = embeddings.map((embedding, idx) => ({
        content: documents[idx].pageContent,
        embedding,
        metadata: documents[idx].metadata,
      }));

      // Insert new embeddings into the database
      try {
        await EmbeddingModel.insertMany(embeddingDocuments, { ordered: false });
        console.log('Documents added to the database successfully.');
      } catch (error) {
        console.error("Error adding vectors to the database:", error.message);
      }
    } catch (error) {
      console.error("Error fetching existing embeddings:", error.message);
    }
  }

  async addVectorsToMemory(vectors, documents) {
    const memoryVectors = vectors.map((embedding, idx) => ({
      content: documents[idx].pageContent,
      embedding,
      metadata: documents[idx].metadata,
    }));
    this.memoryVectors = this.memoryVectors.concat(memoryVectors);
  }

  async similaritySearchVectorWithScore(queryVector, k, filter) {
    try {
      if (this.useDatabase) {
        const allEmbeddings = await EmbeddingModel.find();
        const filterFunction = (embeddingDoc) => {
          if (!filter) {
            return true;
          }
          const doc = new Document({
            metadata: embeddingDoc.metadata,
            pageContent: embeddingDoc.content,
          });
          return filter(doc);
        };

        const filteredEmbeddings = allEmbeddings.filter(filterFunction);
        const searches = filteredEmbeddings
          .map((embeddingDoc, index) => ({
            similarity: ml_distance_similarity.cosine(queryVector, embeddingDoc.embedding),
            index,
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, k);

        return searches.map((search) => [
          new Document({
            metadata: filteredEmbeddings[search.index].metadata,
            pageContent: filteredEmbeddings[search.index].content,
          }),
          search.similarity,
        ]);
      } else {
        const embeddings = this.memoryVectors
          .map((embedding) => ({
            content: embedding.content,
            embedding: embedding.embedding,
          }));
        const searches = embeddings
          .map((embedding, index) => ({
            similarity: ml_distance_similarity.cosine(queryVector, embedding.embedding),
            index,
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, k);

        return searches.map((search) => [
          new Document({
            metadata: embeddings[search.index].metadata,
            pageContent: embeddings[search.index].content,
          }),
          search.similarity,
        ]);
      }
    } catch (error) {
      console.error("Error during similarity search:", error);
      return [];
    }
  }

  static async fromTexts(texts, metadatas, embeddings, useDatabase, dbUri) {
    const docs = texts.map((text, i) => {
      const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
      return new Document({
        pageContent: text,
        metadata,
      });
    });

    return this.fromDocuments(docs, embeddings, useDatabase, dbUri);
  }

  static async fromDocuments(docs, embeddings, useDatabase, dbUri) {
    const instance = new this(embeddings, {}, useDatabase, dbUri);
    try {
      await instance.addDocuments(docs);
    } catch (error) {
      console.error("Error adding documents:", error);
    }
    return instance;
  }

  async getQueryVector(query) {
    const [newEmbedding] = await this.embeddings.embedDocuments([query]);
    return newEmbedding;
  }
}

export { CustomVectorStore };
