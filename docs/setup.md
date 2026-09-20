# Local Setup & Deployment Guide — Chat With Your Docs

This guide walks you through setting up "Chat With Your Docs" locally, configuring Supabase with PostgreSQL and `pgvector`, setting up AI providers (Google Gemini or OpenAI), running the test suite, and deploying to production.

---

## 1. Prerequisites

- **Node.js**: v18.18+ or v20+ (tested on Node v22.14.0)
- **npm** or **pnpm** / **yarn**
- A **Supabase** account (Free tier supported at [supabase.com](https://supabase.com))
- A **Google Gemini API Key** ([aistudio.google.com](https://aistudio.google.com/)) OR an **OpenAI API Key** ([platform.openai.com](https://platform.openai.com/))

---

## 2. Supabase Setup

### Step A: Create a New Supabase Project
1. Log in to [Supabase Dashboard](https://app.supabase.com).
2. Click **New project**, give it a name (e.g. `chat-with-your-docs`), and set a secure database password.
3. Once provisioned, navigate to **Project Settings** -> **API**:
   - Copy the **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - Copy the `anon` public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Copy the `service_role` secret key (`SUPABASE_SERVICE_ROLE_KEY`)

### Step B: Run the Database Migration
1. In the Supabase Dashboard, open the **SQL Editor** from the left navigation.
2. Open the file `supabase/migrations/20240101000000_init_schema.sql` from this repository.
3. Paste its entire contents into the SQL Editor and click **Run**.
4. This script automatically:
   - Enables the `vector` extension (`pgvector`) and `uuid-ossp`.
   - Creates the `profiles`, `documents`, `document_chunks`, `conversations`, and `messages` tables.
   - Configures an **HNSW vector index** on `document_chunks(embedding vector_cosine_ops)`.
   - Creates the `match_document_chunks` stored procedure for cosine similarity vector search.
   - Enforces strict **Row Level Security (RLS)** on all tables.
   - Creates the private `documents` storage bucket with folder isolation policies (`(storage.foldername(name))[1] = auth.uid()::text`).
   - Sets up the `on_auth_user_created` trigger for automatic profile generation on user registration.

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Populate the variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Provider Configuration
# Choose "gemini" (recommended default) or "openai"
LLM_PROVIDER=gemini

# Google Gemini API
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-1.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

# OpenAI API (Optional if using Gemini)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Vector Dimensions: 768 for Gemini text-embedding-004, 1536 for OpenAI text-embedding-3-small
VECTOR_DIMENSION=768

# RAG Hyperparameters
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.2
RAG_CHUNK_SIZE=1000
RAG_CHUNK_OVERLAP=150
```

---

## 4. Local Installation & Development

```bash
# 1. Install dependencies
npm install

# 2. Run unit and integration tests
npm test

# 3. Verify TypeScript compilation
npx tsc --noEmit

# 4. Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Production Build & Deployment

To verify production readiness:

```bash
npm run build
npm run start
```

### Deploying to Vercel
1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Under **Environment Variables**, add all keys from your `.env.local`.
4. Deploy!
