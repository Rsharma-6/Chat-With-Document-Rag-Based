// backend/utils/vectorStore-v5.js
// Enhanced vector store that preserves metadata

const { cosineSimilarity } = require('./embeddings');

/**
 * Vector store with metadata support (Version 5)
 */
class VectorStore {
  constructor() {
    this.store = new Map();
  }

  /**
   * Add documents with embeddings and metadata
   * @param {string} docId 
   * @param {Array} chunks - Array of {text, chunkIndex, metadata}
   * @param {Array} embeddings - Array of embedding vectors
   */
  async addDocuments(docId, chunks, embeddings) {
    if (chunks.length !== embeddings.length) {
      throw new Error('Number of chunks and embeddings must match');
    }

    const enrichedChunks = chunks.map((chunk, idx) => ({
      text: chunk.text,
      embedding: embeddings[idx],
      chunkIndex: chunk.chunkIndex,
      metadata: {
        page: chunk.metadata.page,
        paragraphNumber: chunk.metadata.paragraphNumber,
        paragraphRange: chunk.metadata.paragraphRange,
        startChar: chunk.metadata.startChar,
        endChar: chunk.metadata.endChar,
        chunkLength: chunk.metadata.chunkLength
      }
    }));

    this.store.set(docId, enrichedChunks);
    
    console.log(`💾 Stored ${enrichedChunks.length} chunks with metadata for doc ${docId}`);
    console.log(`   Metadata includes: Page numbers, Paragraph numbers, Character positions`);
  }

  /**
   * Search for most similar chunks with metadata
   * @param {string} docId 
   * @param {Array} queryEmbedding 
   * @param {number} topK 
   * @returns {Array} Top K results with metadata
   */
  async search(docId, queryEmbedding, topK = 5) {
    const chunks = this.store.get(docId);
    
    if (!chunks) {
      throw new Error(`Document ${docId} not found in vector store`);
    }

    // Calculate similarity for all chunks
    const results = chunks.map(chunk => ({
      text: chunk.text,
      chunkIndex: chunk.chunkIndex,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
      metadata: chunk.metadata  // Include all metadata
    }));

    // Sort by similarity and take top K
    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, topK);

    console.log(`🔍 Search results for doc ${docId}:`);
    topResults.forEach((result, idx) => {
      console.log(`  ${idx + 1}. Page ${result.metadata.page}, Para ${result.metadata.paragraphNumber} - Similarity: ${result.similarity.toFixed(4)}`);
    });

    return topResults;
  }

  /**
   * Get document by ID
   */
  getDocument(docId) {
    return this.store.get(docId) || [];
  }

  /**
   * Delete document
   */
  deleteDocument(docId) {
    const deleted = this.store.delete(docId);
    if (deleted) {
      console.log(`🗑️  Deleted document ${docId}`);
    }
    return deleted;
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      totalDocuments: this.store.size,
      documents: []
    };

    this.store.forEach((chunks, docId) => {
      const pages = new Set(chunks.map(c => c.metadata.page));
      stats.documents.push({
        docId,
        chunkCount: chunks.length,
        uniquePages: pages.size,
        embeddingDimension: chunks[0]?.embedding.length || 0
      });
    });

    return stats;
  }

  /**
   * Clear all documents
   */
  clear() {
    this.store.clear();
    console.log('🗑️  Cleared all documents');
  }
}

module.exports = {
  VectorStore
};