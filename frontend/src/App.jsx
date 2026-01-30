// frontend/src/App.js - VERSION 6: With MongoDB Features
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, MessageSquare, FileText, AlertCircle, CheckCircle, Zap, Database, DollarSign, BookOpen, Trash2, List } from 'lucide-react';

const API_URL = 'http://localhost:5001';

function App() {
  const [file, setFile] = useState(null);
  const [docId, setDocId] = useState(null);
  const [documentInfo, setDocumentInfo] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showDocuments, setShowDocuments] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
    checkHealth();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/documents`);
      setDocuments(response.data.documents);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/health`);
      setDbStatus(response.data.database);
    } catch (err) {
      console.error('Error checking health:', err);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
      setDocId(null);
      setDocumentInfo(null);
      setAnswer('');
      setSources([]);
    } else {
      setError('Please select a PDF file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setDocId(response.data.docId);
      setDocumentInfo(response.data);
      console.log('Document uploaded to MongoDB:', response.data);
      
      // Reload documents list
      await loadDocuments();
      await checkHealth();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectDocument = (doc) => {
    setDocId(doc.docId);
    setDocumentInfo(doc);
    setShowDocuments(false);
    setAnswer('');
    setSources([]);
  };

  const handleDeleteDocument = async (docId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/document/${docId}`);
      await loadDocuments();
      await checkHealth();
      
      if (docId === documentInfo?.docId) {
        setDocId(null);
        setDocumentInfo(null);
        setAnswer('');
        setSources([]);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete document');
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    if (!docId) {
      setError('Please upload a document first');
      return;
    }

    setLoading(true);
    setError('');
    setAnswer('');
    setSources([]);

    try {
      const response = await axios.post(`${API_URL}/api/ask`, {
        docId,
        question,
      });

      setAnswer(response.data.answer);
      setSources(response.data.sources || []);
      console.log('Answer from MongoDB:', response.data);
    } catch (err) {
      console.error('Question error:', err);
      setError(err.response?.data?.error || 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleAskQuestion();
    }
  };

  return (
    <div className="app">
      <div className="container">
        <div className="card">
          {/* Header */}
          <div className="header">
            <h1 className="title">
              <FileText className="icon-large" />
              PDF Q&A RAG - V6
            </h1>
            <p className="subtitle">
              With MongoDB Atlas Vector Search - Persistent Storage
            </p>
            <div className="badges-container">
              <div className="rag-badge">
                <Database className="icon-small" />
                <span>MongoDB Vector Search</span>
              </div>
              <div className="free-badge">
                <DollarSign className="icon-small" />
                <span>100% FREE</span>
              </div>
              <div className="version-badge">
                <BookOpen className="icon-small" />
                <span>V6 - Persistent</span>
              </div>
            </div>

            {/* Database Status */}
            {dbStatus && (
              <div className="db-status">
                <Database className="icon-small" />
                <span>
                  MongoDB: {dbStatus.connected ? '✅ Connected' : '❌ Disconnected'} • 
                  {' '}{dbStatus.documents} docs • {dbStatus.vectors} vectors
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <AlertCircle className="icon-small" />
              {error}
            </div>
          )}

          {/* Documents List Button */}
          {documents.length > 0 && (
            <div className="section">
              <button
                onClick={() => setShowDocuments(!showDocuments)}
                className="btn btn-secondary"
              >
                <List className="icon-small" />
                {showDocuments ? 'Hide' : 'Show'} Saved Documents ({documents.length})
              </button>

              {showDocuments && (
                <div className="documents-list">
                  {documents.map((doc) => (
                    <div
                      key={doc.docId}
                      className={`document-item ${doc.docId === docId ? 'selected' : ''}`}
                      onClick={() => handleSelectDocument(doc)}
                    >
                      <div className="document-info">
                        <strong>{doc.filename}</strong>
                        <small>
                          {doc.totalPages} pages • {doc.chunkCount} chunks • 
                          {' '}{new Date(doc.uploadedAt).toLocaleDateString()}
                        </small>
                      </div>
                      <button
                        onClick={(e) => handleDeleteDocument(doc.docId, e)}
                        className="btn-delete"
                        title="Delete document"
                      >
                        <Trash2 className="icon-small" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* File Upload Section */}
          <div className="section">
            <label className="label">Upload New PDF Document</label>
            <div className="upload-area">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="file-input"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="upload-label">
                <Upload className="icon-large upload-icon" />
                <span className="upload-text">
                  {file ? file.name : 'Click to select PDF file'}
                </span>
              </label>
            </div>

            {file && !docId && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn btn-primary"
              >
                {uploading ? 'Uploading to MongoDB...' : 'Upload & Process'}
              </button>
            )}

            {uploading && (
              <div className="processing-steps">
                <p className="status-text uploading">
                  <span className="spinner">⏳</span> Processing and storing in MongoDB...
                </p>
                <div className="steps-list">
                  <div>✓ Extracting text from PDF</div>
                  <div>✓ Detecting pages & paragraphs</div>
                  <div>⏳ Generating embeddings...</div>
                  <div>⏳ Storing in MongoDB Atlas...</div>
                  <div>⏳ Creating vector index...</div>
                </div>
              </div>
            )}

            {documentInfo && (
              <div className="success-message">
                <CheckCircle className="icon-small" />
                <div>
                  <strong>{documentInfo.filename}</strong> saved to MongoDB
                  <br />
                  <small>
                    {documentInfo.totalPages} pages • {' '}
                    {documentInfo.chunkCount} chunks • {' '}
                    Persistent storage ✓
                  </small>
                </div>
              </div>
            )}
          </div>

          {/* Question Section */}
          {docId && (
            <div className="section">
              <label className="label">Ask a Question</label>
              <div className="question-input-group">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="What would you like to know about this document?"
                  className="input"
                  disabled={loading}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={!question.trim() || loading}
                  className="btn btn-primary"
                >
                  <MessageSquare className="icon-small" />
                  {loading ? 'Searching MongoDB...' : 'Ask'}
                </button>
              </div>
              <p className="help-text">
                💡 Using MongoDB Vector Search to find relevant information
              </p>
            </div>
          )}

          {/* Answer Section */}
          {answer && (
            <>
              <div className="answer-box">
                <h3 className="answer-title">
                  <AlertCircle className="icon-small" />
                  Answer (from MongoDB)
                </h3>
                <div className="answer-content">{answer}</div>
              </div>

              {/* Source References */}
              {sources && sources.length > 0 && (
                <div className="sources-section">
                  <h4 className="sources-title">
                    <BookOpen className="icon-small" />
                    Source References ({sources.length})
                  </h4>
                  <p className="sources-subtitle">
                    Retrieved from MongoDB Atlas Vector Search
                  </p>
                  <div className="sources-list">
                    {sources.map((source) => (
                      <div key={source.sourceNumber} className="source-item">
                        <div className="source-header">
                          <span className="source-badge">
                            SOURCE {source.sourceNumber}
                          </span>
                          <span className="source-location">
                            📄 Page {source.page}
                          </span>
                          <span className="source-location">
                            ¶ Paragraph {source.paragraphNumber}
                          </span>
                          <span className="source-similarity">
                            {(source.similarity * 100).toFixed(1)}% match
                          </span>
                        </div>
                        <div className="source-text">
                          {source.text}
                        </div>
                        <div className="source-meta">
                          Stored in MongoDB • Characters {source.startChar}-{source.endChar}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Instructions */}
          <div className="instructions">
            <h3 className="instructions-title">Version 6 Features (MongoDB):</h3>
            <ul className="instructions-list">
              <li><strong>Persistent Storage:</strong> Documents saved to MongoDB Atlas</li>
              <li><strong>Vector Search:</strong> Native $vectorSearch with 768-dim embeddings</li>
              <li><strong>Scalable:</strong> Handle millions of documents easily</li>
              <li><strong>Document Management:</strong> View, select, and delete documents</li>
              <li><strong>Production Ready:</strong> Enterprise-grade database</li>
              <li><strong>Free Tier:</strong> 512MB storage free forever</li>
            </ul>
            <div className="tech-stack">
              <strong>Version 6.0:</strong> MongoDB Atlas Vector Search • 
              Google Gemini • Persistent Cloud Storage • Production Ready
            </div>
            <div className="cost-info">
              <DollarSign className="icon-small" />
              <strong>Still 100% FREE!</strong> MongoDB Free Tier (M0) + Google Gemini
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;