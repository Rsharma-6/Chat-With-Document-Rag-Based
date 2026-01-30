// backend/server.js - VERSION 6: With MongoDB Atlas Vector Search
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const { splitIntoChunksWithMetadata } = require("./utils/chunker");
const {
  generateEmbeddings,
  generateSingleEmbedding,
} = require("./utils/embeddings");

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Initialize chat model
const chatModel = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 2048,
  },
});

// MongoDB connection
let db;
let documentsCollection;
let vectorCollection;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    db = client.db(process.env.MONGODB_DATABASE || "pdf_qa_rag");
    documentsCollection = db.collection("documents");
    vectorCollection = db.collection("vectors");

    // Create vector search index (if not exists)
    await createVectorSearchIndex();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

// Create vector search index
async function createVectorSearchIndex() {
  try {
    const indexes = await vectorCollection.listIndexes().toArray();
    const vectorIndexExists = indexes.some((idx) => idx.name === "vectors");

    if (!vectorIndexExists) {
      console.log("📊 Creating vector search index...");

      // Note: Vector search index must be created via MongoDB Atlas UI
      // or using the Atlas API. This is a placeholder for documentation.
      console.log(`
⚠️  IMPORTANT: Create vector search index manually in MongoDB Atlas:
    
    1. Go to MongoDB Atlas → Database → Search
    2. Click "Create Search Index"
    3. Choose "JSON Editor"
    4. Use this configuration:

    {
      "mappings": {
        "dynamic": true,
        "fields": {
          "embedding": {
            "type": "knnVector",
            "dimensions": 768,
            "similarity": "cosine"
          }
        }
      }
    }

    5. Name it: vector_index
    6. Select collection: vectors
      `);
    } else {
      console.log("✅ Vector search index already exists");
    }
  } catch (error) {
    console.error("Error checking vector index:", error);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// Helper function to extract pages from PDF
async function extractPagesFromPDF(buffer) {
  const data = await pdfParse(buffer);
  const fullText = data.text;

  const estimatedCharsPerPage = 2000;
  const pages = [];

  let currentPos = 0;
  let pageNum = 1;

  while (currentPos < fullText.length) {
    const pageText = fullText.slice(
      currentPos,
      currentPos + estimatedCharsPerPage,
    );

    pages.push({
      pageNumber: pageNum,
      text: pageText,
      startChar: currentPos,
      endChar: currentPos + pageText.length,
    });

    currentPos += estimatedCharsPerPage;
    pageNum++;
  }

  return { pages, totalPages: pages.length, fullText };
}

// Route: Upload and process PDF
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📄 Processing PDF:", req.file.originalname);

    // Step 1: Extract text with page information
    console.log("📝 Extracting text...");
    const { pages, totalPages, fullText } = await extractPagesFromPDF(
      req.file.buffer,
    );
    console.log(
      `✅ Extracted ${fullText.length} characters from ${totalPages} pages`,
    );

    // Step 2: Split into chunks with metadata
    console.log("✂️  Splitting into chunks...");
    const chunksWithMetadata = splitIntoChunksWithMetadata(pages);
    console.log(`✅ Created ${chunksWithMetadata.length} chunks`);

    // Step 3: Generate embeddings
    console.log("🧮 Generating embeddings with Gemini...");
    const texts = chunksWithMetadata.map((c) => c.text);
    const embeddings = await generateEmbeddings(texts);
    console.log(`✅ Generated ${embeddings.length} embeddings`);

    // Step 4: Save document metadata to MongoDB
    const docId = new Date().getTime().toString();
    const documentRecord = {
      _id: docId,
      filename: req.file.originalname,
      textLength: fullText.length,
      chunkCount: chunksWithMetadata.length,
      totalPages: totalPages,
      uploadedAt: new Date(),
      status: "processed",
    };

    await documentsCollection.insertOne(documentRecord);
    console.log("✅ Document metadata saved to MongoDB");

    // Step 5: Save vectors to MongoDB
    console.log("💾 Storing vectors in MongoDB...");
    const vectorDocuments = chunksWithMetadata.map((chunk, idx) => ({
      docId: docId,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      embedding: embeddings[idx],
      metadata: {
        page: chunk.metadata.page,
        paragraphNumber: chunk.metadata.paragraphNumber,
        paragraphRange: chunk.metadata.paragraphRange,
        startChar: chunk.metadata.startChar,
        endChar: chunk.metadata.endChar,
        chunkLength: chunk.metadata.chunkLength,
      },
      createdAt: new Date(),
    }));

    await vectorCollection.insertMany(vectorDocuments);
    console.log(`✅ ${vectorDocuments.length} vectors stored in MongoDB`);

    res.json({
      docId,
      filename: req.file.originalname,
      textLength: fullText.length,
      chunkCount: chunksWithMetadata.length,
      totalPages: totalPages,
      message: "Document processed and stored in MongoDB (Version 6)",
      database: "MongoDB Atlas Vector Search",
    });
  } catch (error) {
    console.error("❌ Error processing PDF:", error);
    res.status(500).json({ error: "Failed to process PDF: " + error.message });
  }
});

// Route: Ask question using MongoDB Vector Search
// backend/server.js - FIXED /api/ask route

// Replace the /api/ask route with this improved version:

// backend/server.js - OPTIMIZED /api/ask route for Gemini

app.post("/api/ask", async (req, res) => {
  try {
    const { docId, question } = req.body;

    if (!docId || !question) {
      return res.status(400).json({ error: "Missing docId or question" });
    }

    const document = await documentsCollection.findOne({ _id: docId });
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    console.log(`❓ Question: ${question}`);

    // Generate question embedding
    const questionEmbedding = await generateSingleEmbedding(question);

    // Retrieve relevant chunks (reduce to 3 for smaller context)
    const topK = 3; // ← REDUCED from 5 to 3

    let relevantChunks = [];

    try {
      const pipeline = [
        {
          $vectorSearch: {
            index: "vectors",
            path: "embedding",
            queryVector: questionEmbedding,
            numCandidates: topK*10, // ← REDUCED from 50
            limit: topK,
            filter: { docId: docId },
          },
        },
        {
          $project: {
            _id: 0,
            text: 1,
            metadata: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ];

      relevantChunks = await vectorCollection.aggregate(pipeline).toArray();
      console.log(`✅ Found ${relevantChunks.length} chunks`);
    } catch (vectorSearchError) {
      console.error("⚠️  Vector search failed, using fallback");

      const { cosineSimilarity } = require("./utils/embeddings");

      const allChunks = await vectorCollection
        .find({ docId })
        .limit(50)
        .toArray();

      const chunksWithScores = allChunks.map((chunk) => ({
        text: chunk.text,
        metadata: chunk.metadata,
        score: cosineSimilarity(questionEmbedding, chunk.embedding),
      }));

      chunksWithScores.sort((a, b) => b.score - a.score);
      relevantChunks = chunksWithScores.slice(0, topK);
    }

    if (relevantChunks.length === 0) {
      return res.json({
        answer:
          "No relevant information found. Please check if:\n1. Vector search index is created in MongoDB Atlas\n2. The document was uploaded successfully\n3. Your question relates to the document content",
        question,
        docId,
        sources: [],
      });
    }

    console.log("📊 Chunk scores:");
    relevantChunks.forEach((chunk, idx) => {
      console.log(
        `  ${idx + 1}. Score: ${chunk.score?.toFixed(4)}, Page: ${chunk.metadata?.page}`,
      );
    });

    // OPTIMIZED PROMPT - Shorter and clearer
    const context = relevantChunks
      .map((chunk, idx) => {
        const page = chunk.metadata?.page || "Unknown";
        const para = chunk.metadata?.paragraphNumber || "Unknown";
        // Limit chunk text to 800 characters max
        const text =
          chunk.text.length > 800
            ? chunk.text.substring(0, 800) + "..."
            : chunk.text;
        return `[Source ${idx + 1} - Page ${page}, Para ${para}]\n${text}`;
      })
      .join(" ");

    console.log(context);
    // SIMPLIFIED PROMPT
const prompt = `Based on these document excerpts, answer the question.
Document Excerpts:
${context}

Question: ${question}

Instructions:
- Answer ONLY using information from the excerpts above
- Cite sources like [Source 1 - Page 3, Para 2]
- If the answer is not in the excerpts, say so clearly
- Be concise and specific

Answer:`;

    console.log(`📝 Prompt length: ${prompt.length} characters`);

    // Generate answer
    const result = await chatModel.generateContent(prompt);
    const answer = result.response.text();

    console.log("✅ Answer generated");
    console.log(`📄 Answer preview: ${answer.substring(0, 100)}...`);

    res.json({
      answer,
      question,
      docId,
      sources: relevantChunks.map((chunk, idx) => ({
        sourceNumber: idx + 1,
        page: chunk.metadata?.page || "N/A",
        paragraphNumber: chunk.metadata?.paragraphNumber || "N/A",
        text: chunk.text.substring(0, 300) + "...",
        similarity: chunk.score || 0,
        startChar: chunk.metadata?.startChar || 0,
        endChar: chunk.metadata?.endChar || 0,
      })),
      model: "gemini-3-pro-preview",
      promptLength: prompt.length,
      chunksUsed: relevantChunks.length,
      version: "6.0 - Optimized",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      error: "Failed to answer: " + error.message,
    });
  }
});

// Route: List all documents
app.get("/api/documents", async (req, res) => {
  try {
    const documents = await documentsCollection
      .find({})
      .sort({ uploadedAt: -1 })
      .limit(50)
      .toArray();

    res.json({
      documents: documents.map((doc) => ({
        docId: doc._id,
        filename: doc.filename,
        totalPages: doc.totalPages,
        chunkCount: doc.chunkCount,
        uploadedAt: doc.uploadedAt,
      })),
      total: documents.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route: Delete document
app.delete("/api/document/:docId", async (req, res) => {
  try {
    const { docId } = req.params;

    // Delete vectors
    await vectorCollection.deleteMany({ docId });

    // Delete document
    await documentsCollection.deleteOne({ _id: docId });

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/api/health", async (req, res) => {
  try {
    // Check MongoDB connection
    await db.admin().ping();

    // Get stats
    const docCount = await documentsCollection.countDocuments();
    const vectorCount = await vectorCollection.countDocuments();

    res.json({
      status: "ok",
      version: "6.0",
      vectorStore: {
        mode: "mongodb",
        type: "persistent",
      },
      message: "RAG server with MongoDB Atlas Vector Search",
      database: {
        connected: true,
        documents: docCount,
        vectors: vectorCount,
      },
      features: [
        "mongodb-atlas",
        "vector-search",
        "persistent-storage",
        "page-tracking",
        "paragraph-tracking",
        "automatic-citations",
      ],
      cost: "FREE! 🎉",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB first
    await connectToMongoDB();

    // Then start Express server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════╗
║   PDF Q&A RAG - VERSION 6.0               ║
║   With MongoDB Atlas Vector Search        ║
╚═══════════════════════════════════════════╝

🚀 Server running on port ${PORT}
🤖 Using Gemini 1.5 Flash for answers
🧮 Using Gemini text-embedding-004
💾 Using MongoDB Atlas Vector Search
📍 Tracks: Pages & Paragraphs
📝 Auto-cites sources in answers
💰 Total Cost: $0.00

API Endpoints:
  POST   /api/upload        - Upload PDF
  POST   /api/ask           - Ask question
  GET    /api/document/:id  - Get document info
  GET    /api/documents     - List all documents
  DELETE /api/document/:id  - Delete document
  GET    /api/health        - Health check
      `);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
