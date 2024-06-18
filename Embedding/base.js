import { VectorStore } from "@langchain/core/vectorstores";
import { Document } from "@langchain/core/documents";
import { similarity as ml_distance_similarity } from "ml-distance";

class CustomVectorStore extends VectorStore {
  constructor(embeddings, fields = {}) {
    super(embeddings, fields);
    this.memoryVectors = [];
  }

  _vectorstoreType() {
    return "custom";
  }

  

  /**
   * Adds documents to the vector store by embedding their content.
   * @param {Document[]} documents - An array of Document objects to be added.
   */
  async addDocuments(documents) {
    console.log(this.memoryVectors);
    const texts = documents.map(({ pageContent }) => pageContent);
    try {
      const embeddings = await this.embeddings.embedDocuments(texts);
      await this.addVectors(embeddings, documents);
    } catch (error) {
      console.error("Error embedding documents:", error);
    }
  }

  /**
   * Adds vectors and corresponding documents to the in-memory storage.
   * @param {number[][]} vectors - An array of vectors (embeddings).
   * @param {Document[]} documents - An array of Document objects corresponding to the vectors.
   */
  async addVectors(vectors, documents) {
    const memoryVectors = vectors.map((embedding, idx) => ({
      content: documents[idx].pageContent,
      embedding,
      metadata: documents[idx].metadata,
    }));
    this.memoryVectors = this.memoryVectors.concat(memoryVectors);
  }

  /**
   * Performs a similarity search with the given query vector and returns the top k results.
   * @param {number[]} query - A vector representing the query.
   * @param {number} k - The number of top results to return.
   * @param {Function} [filter] - An optional filter function to filter documents.
   * @returns {Promise<Array>} A promise that resolves to an array of tuples containing a Document and its similarity score.
   */
  async similaritySearchVectorWithScore(query, k, filter) {
    const filterFunction = (memoryVector) => {
      if (!filter) {
        return true;
      }
      const doc = new Document({
        metadata: memoryVector.metadata,
        pageContent: memoryVector.content,
      });
      return filter(doc);
    };

    const filteredMemoryVectors = this.memoryVectors.filter(filterFunction);
    const searches = filteredMemoryVectors
      .map((vector, index) => ({
        similarity: ml_distance_similarity.cosine(query, vector.embedding),
        index,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);

    return searches.map((search) => [
      new Document({
        metadata: filteredMemoryVectors[search.index].metadata,
        pageContent: filteredMemoryVectors[search.index].content,
      }),
      search.similarity,
    ]);
  }

  /**
   * Creates an instance of CustomVectorStore from an array of texts.
   * @param {string[]} texts - An array of strings representing the texts.
   * @param {object[] | object} metadatas - An array of metadata objects or a single metadata object.
   * @param {EmbeddingsInterface} embeddings - An instance of EmbeddingsInterface to embed the texts.
   * @param {CustomVectorStoreArgs} [dbConfig] - Optional configuration for the CustomVectorStore.
   * @returns {Promise<CustomVectorStore>} A promise that resolves to an instance of CustomVectorStore.
   */
  static async fromTexts(texts, metadatas, embeddings, dbConfig) {
    const docs = texts.map((text, i) => {
      const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
      return new Document({
        pageContent: text,
        metadata,
      });
    });

    return this.fromDocuments(docs, embeddings, dbConfig);
  }

  /**
   * Creates an instance of CustomVectorStore from an array of documents.
   * @param {Document[]} docs - An array of Document objects.
   * @param {EmbeddingsInterface} embeddings - An instance of EmbeddingsInterface to embed the documents.
   * @param {CustomVectorStoreArgs} [dbConfig] - Optional configuration for the CustomVectorStore.
   * @returns {Promise<CustomVectorStore>} A promise that resolves to an instance of CustomVectorStore.
   */
  static async fromDocuments(docs, embeddings, dbConfig) {
    const instance = new this(embeddings, dbConfig);
    try {
      await instance.addDocuments(docs);
    } catch (error) {
      console.error("Error adding documents:", error);
    }
    return instance;
  }
}

export { CustomVectorStore };
