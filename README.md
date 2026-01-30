# PDF Q&A RAG System - 100% FREE with Google Gemini 🚀

This project is a **PDF-based Q&A system** using **Retrieval-Augmented Generation (RAG)** powered entirely by **Google Gemini**.  
Upload PDFs, and the system can answer questions based on the document's content using semantic search and embeddings.

---

## Features

- Upload and process PDF documents.
- Split PDFs into manageable chunks for semantic search.
- Generate embeddings using **Google Gemini**.
- In-memory vector store for fast retrieval.
- Ask questions with RAG — get answers based on document excerpts.
- Display relevant chunks and similarity scores.
- 100% free — no Anthropic/Claude or paid services required.

---

## Tech Stack

### Frontend
- **React.js** – Dynamic, component-based UI.
- **Axios** – API requests to backend.
- **Lucide-react** – Icons for interface.
- **Optional styling** – Tailwind CSS or CSS modules.

### Backend
- **Node.js & Express.js** – REST API for file upload and question answering.
- **Multer** – File uploads handling.
- **pdf-parse** – Extract text from PDFs.
- **Google Generative AI (Gemini)** – Text embeddings & answers.
- **In-memory Vector Store** – Stores embeddings for semantic search.

---

## Folder Structure
```bash
CHAT_WITH_DOCUMENT/
├── backend/
│   ├── package.json          # ✅ Updated (no Anthropic!)
│   ├── .env                  # ⬅️ Only Google API key (DO NOT PUSH)
│   ├── server.js             # ✅ 100% Gemini
│   └── utils/
│       ├── chunker.js        # ✅ Same as before
│       ├── embeddings.js     # ✅ Gemini embeddings
│       └── vectorStore.js    # ✅ Same as before
└── frontend/
    ├── package.json          
    ├── .env                  # ⬅️ DO NOT PUSH
    └── src/
        ├── App.js            # ✅ Updated UI
        ├── index.js          
        └── index.css         # ✅ Added FREE badge
```


## Setup Instructions


## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Rsharma-6/CHAT-WITH-DOCUMENT.git
cd CHAT-WITH-DOCUMENT 
```

### 2️. Install dependencies 
#### **Client**
```bash
cd frontend
npm install
```

#### **Server**
```bash
cd ../backend
npm install
```

### 3️. Configure environment variables

Create a .env file inside the Backend directory and add the following:

```bash
PORT=5000
GOOGLE_API_KEY=your_google_api_key
```

### 4️. Start the servers

Open two terminals and run:

#### 🧩 Terminal 1 — Backend
```bash
cd server
npm start
```
#### 💻 Terminal 2 — Frontend
```bash
cd frontend
npm run dev
```