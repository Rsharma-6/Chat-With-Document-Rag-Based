
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function test() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const db = client.db('pdf_qa_rag');
  
  // Check documents
  const docCount = await db.collection('documents').countDocuments();
  console.log(`📄 Documents: ${docCount}`);
  
  // Check vectors
  const vectorCount = await db.collection('vectors').countDocuments();
  console.log(`🔢 Vectors: ${vectorCount}`);
  
  // Check a sample vector
  const sample = await db.collection('vectors').findOne({});
  console.log('\n📋 Sample Vector:');
  console.log('- Has text:', !!sample?.text);
  console.log('- Has embedding:', !!sample?.embedding);
  console.log('- Embedding length:', sample?.embedding?.length);
  console.log('- Has docId:', !!sample?.docId);
  console.log('- Has metadata:', !!sample?.metadata);
  
  await client.close();
}

test();