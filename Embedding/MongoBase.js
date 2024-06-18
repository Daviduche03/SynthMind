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
  constructor(embeddings, fields = {}, dbUri) {
    super(embeddings, fields);
    this.dbUri = dbUri;
    mongoose.connect(this.dbUri);
  }

  _vectorstoreType() {
    return "custom";
  }

  /**
   * Adds documents to the vector store by embedding their content.
   * @param {Document[]} documents - An array of Document objects to be added.
   */
  async addDocuments(documents) {
    const texts = documents.map(({ pageContent }) => pageContent);
    try {
      const existingEmbeddings = await this.getEmbeddingsByTexts(texts);
      const textsToEmbed = [];
      const docsToEmbed = [];

      documents.forEach((doc, idx) => {
        if (!existingEmbeddings[idx]) {
          textsToEmbed.push(doc.pageContent);
          docsToEmbed.push(doc);
        }
      });

      if (textsToEmbed.length > 0) {
        const newEmbeddings = await this.embeddings.embedDocuments(textsToEmbed);
        await this.addVectors(newEmbeddings, docsToEmbed);
      }
    } catch (error) {
      console.error("Error embedding documents:", error);
    }
  }

  /**
   * Adds vectors and corresponding documents to the database.
   * @param {number[][]} vectors - An array of vectors (embeddings).
   * @param {Document[]} documents - An array of Document objects corresponding to the vectors.
   */
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

  /**
   * Retrieves embeddings for the given texts from the database.
   * @param {string[]} texts - An array of texts to look up embeddings for.
   * @returns {Promise<(number[] | null)[]>} - An array of embeddings or null if not found.
   */
  async getEmbeddingsByTexts(texts) {
    const embeddings = await EmbeddingModel.find({ content: { $in: texts } });
    const embeddingMap = embeddings.reduce((acc, emb) => {
      acc[emb.content] = emb.embedding;
      return acc;
    }, {});

    return texts.map(text => embeddingMap[text] || null);
  }

  /**
   * Performs a similarity search with the given query vector and returns the top k results.
   * @param {number[]} queryVector - A vector representing the query.
   * @param {number} k - The number of top results to return.
   * @param {Function} [filter] - An optional filter function to filter documents.
   * @returns {Promise<Array>} A promise that resolves to an array of tuples containing a Document and its similarity score.
   */
  async similaritySearchVectorWithScore(queryVector, k, filter) {
    try {
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
    } catch (error) {
      console.error("Error during similarity search:", error);
      return [];
    }
  }

  /**
   * Creates an instance of CustomVectorStore from an array of texts.
   * @param {string[]} texts - An array of strings representing the texts.
   * @param {object[] | object} metadatas - An array of metadata objects or a single metadata object.
   * @param {EmbeddingsInterface} embeddings - An instance of EmbeddingsInterface to embed the texts.
   * @param {string} dbUri - MongoDB connection URI.
   * @returns {Promise<CustomVectorStore>} A promise that resolves to an instance of CustomVectorStore.
   */
  static async fromTexts(texts, metadatas, embeddings, dbUri) {
    const docs = texts.map((text, i) => {
      const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
      return new Document({
        pageContent: text,
        metadata,
      });
    });

    return this.fromDocuments(docs, embeddings, dbUri);
  }

  /**
   * Creates an instance of CustomVectorStore from an array of documents.
   * @param {Document[]} docs - An array of Document objects.
   * @param {EmbeddingsInterface} embeddings - An instance of EmbeddingsInterface to embed the documents.
   * @param {string} dbUri - MongoDB connection URI.
   * @returns {Promise<CustomVectorStore>} A promise that resolves to an instance of CustomVectorStore.
   */
  static async fromDocuments(docs, embeddings, dbUri) {
    const instance = new this(embeddings, {}, dbUri);
    try {
      await instance.addDocuments(docs);
    } catch (error) {
      console.error("Error adding documents:", error);
    }
    return instance;
  }

  /**
   * Embeds the query text to vector if not already in the database.
   * @param {string} query - The query text to search for.
   * @returns {Promise<number[]>} - The vector representation of the query.
   */
  async getQueryVector(query) {
    const [existingEmbedding] = await this.getEmbeddingsByTexts([query]);
    if (existingEmbedding) {
      return existingEmbedding;
    } else {
      const [newEmbedding] = await this.embeddings.embedDocuments([query]);
      return newEmbedding;
    }
  }
}

export { CustomVectorStore };
