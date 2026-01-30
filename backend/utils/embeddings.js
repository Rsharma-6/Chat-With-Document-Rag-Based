// backend/utils/embeddings.js
// Generates embeddings using Google Gemini API

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Generate embeddings for text chunks using Google Gemini
 * @param {Array<string>} texts - Array of text chunks
 * @param {string} model - Embedding model to use
 * @returns {Promise<Array<Array<number>>>} Array of embedding vectors
 */
async function generateEmbeddings(texts, model = 'gemini-embedding-001') {
  try {
    console.log(`🧮 Generating embeddings for ${texts.length} chunks using Gemini ${model}...`);
    
    const embeddingModel = genAI.getGenerativeModel({ model: model });
    const allEmbeddings = [];

    // Process in batches to avoid rate limits
    const batchSize = 100;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      // Gemini allows batch processing
      const batchEmbeddings = await Promise.all(
        batch.map(async (text) => {
          const result = await embeddingModel.embedContent(text);
          return result.embedding.values;
        })
      );

      allEmbeddings.push(...batchEmbeddings);

      console.log(`  ✓ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
      
      // Add small delay to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Generated ${allEmbeddings.length} embeddings`);
    console.log(`   Embedding dimension: ${allEmbeddings[0].length}`);

    return allEmbeddings;

  } catch (error) {
    console.error('❌ Error generating embeddings:', error.message);
    throw new Error('Failed to generate embeddings: ' + error.message);
  }
}

/**
 * Generate embedding for a single text (optimized for questions)
 * @param {string} text - Single text to embed
 * @returns {Promise<Array<number>>} Embedding vector
 */
async function generateSingleEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('❌ Error generating single embedding:', error.message);
    throw new Error('Failed to generate embedding: ' + error.message);
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA 
 * @param {Array<number>} vecB 
 * @returns {number} Similarity score (0-1)
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return similarity;
}

/**
 * Get embedding model info
 */
function getModelInfo(model = 'gemini-embedding-001') {
  const models = {
    'gemini-embedding-001': {
      dimensions: 768,
      cost: 'Free (with rate limits)',
      description: 'Latest Gemini embedding model - high quality, efficient',
      maxTokens: 2048,
      provider: 'Google'
    },
    'embedding-001': {
      dimensions: 768,
      cost: 'Free (with rate limits)',
      description: 'Previous generation Gemini embeddings',
      maxTokens: 2048,
      provider: 'Google'
    }
  };

  return models[model] || models['gemini-embedding-001'];
}

/**
 * Test embedding generation
 */
async function testEmbeddings() {
  try {
    console.log('🧪 Testing Gemini embeddings...');
    const testText = 'This is a test sentence for embedding generation.';
    const embedding = await generateSingleEmbedding(testText);
    console.log('✅ Test successful!');
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

module.exports = {
  generateEmbeddings,
  generateSingleEmbedding,
  cosineSimilarity,
  getModelInfo,
  testEmbeddings
};