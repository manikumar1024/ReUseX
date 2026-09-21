# AI CampusLoop
### AI Campus Resource Reuse Matcher

> *"Don't buy what your campus already has."*

AI CampusLoop is an intelligent circular-campus resource reuse platform that uses AI semantic matching, RAG, and agentic workflows to connect unused campus resources with the people who need them.

---

## 🎯 Problem

Campus resources are fragmented. One department may have unused equipment while another purchases the same item. Students and faculty frequently buy textbooks, electronics, and tools that already exist somewhere on campus. Existing discovery methods — WhatsApp groups, spreadsheets, email — are disconnected and inefficient.

**The problem is not resource scarcity. The problem is lack of intelligent visibility.**

---

## 💡 Solution

CampusLoop is an AI-powered web platform that:

- **Semantically understands** both resource supply and user demand
- **Intelligently matches** resources with people who need them
- **Explains every recommendation** — why a resource was matched, and what its limitations are
- **Tracks sustainability impact** — money saved, purchases avoided, CO₂ avoided
- **Prevents duplicate purchases** through an AI-powered campus check
- **Supports the full borrow lifecycle** — request → approval → QR handover → return → impact

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **Semantic Matching** | Natural language search with AI-powered vector similarity matching |
| 📋 **Requirement Extraction** | Structured understanding of user needs from free text |
| 🔍 **AI Resource Classification** | Auto-classify resources from text or image using AI |
| 🌱 **Project Planner** | Describe a project, AI generates component list and finds campus resources |
| 🏛️ **RAG Knowledge Base** | Ask campus policy questions, AI answers from official documents |
| 📦 **Borrow Workflow** | Request → Approve → QR Handover → Return → Review |
| 🔒 **Purchase Check** | Prevent duplicate purchases by checking campus resources first |
| 📊 **Impact Analytics** | Track sustainability metrics with clear "estimate" labeling |
| 🔔 **Notifications** | Real-time in-app alerts for matches, requests, returns |
| 👑 **Admin Dashboard** | Campus-wide analytics, underutilized asset detection, circularity score |
| ♻️ **Responsible AI** | Transparent explanations, confidence scores, human oversight |

---

## 🏗️ Architecture

```
campusloop/
├── frontend/          # React + TypeScript + Tailwind CSS (Vite)
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/    # REST API endpoints
│   │   ├── ai/        # AI provider abstraction layer
│   │   ├── services/  # Matching engine, business logic
│   │   ├── middleware/ # Auth, upload, error handling
│   │   └── config/    # Database config
│   └── tests/         # Jest test suites
├── database/          # SQL schema
├── docs/             # Documentation
└── tests/            # Integration tests
```

---

## 🤖 AI Architecture

### Provider Abstraction

```
AIProvider (interface)
├── MockAIProvider      → Deterministic, always works in demo mode
└── GraniteProvider     → IBM Watsonx / Granite-13B integration
```

Set `AI_MODE=mock` (default) or `AI_MODE=granite` in `.env`.

### AI Capabilities

1. **Requirement Extraction** — Parse free-text needs into structured JSON
2. **Resource Classification** — Classify resources from text or image
3. **Hybrid Matching** — Semantic similarity + hard constraints + availability
4. **Match Explanation** — Human-readable reasoning for every recommendation
5. **Project Planning** — Component list generation with campus resource search
6. **RAG Answering** — Policy Q&A grounded in campus documents
7. **Underutilization Detection** — Identify idle assets with demand elsewhere
8. **Embedding Generation** — Vector embeddings for semantic search

### Matching Weights (configurable)

| Factor | Default Weight |
|--------|---------------|
| Functional compatibility | 35% |
| Availability | 20% |
| Timing | 15% |
| Location | 10% |
| Condition | 10% |
| Reliability | 5% |
| Sustainability value | 5% |

### RAG Pipeline

```
User Question → Embedding → Vector Search → Relevant Chunks → LLM → Grounded Answer → Sources
```

---

## 🗄️ Database Schema (PostgreSQL + pgvector)

Key tables:
- `users` — Multi-role users (student, faculty, admin, lab_manager, etc.)
- `departments` — Campus departments
- `resources` — Listed campus resources with lifecycle tracking
- `resource_embeddings` — Vector embeddings for semantic search (pgvector)
- `requirements` — User needs with AI-extracted structure
- `matches` — AI-generated resource-requirement matches
- `loans` — Full borrow lifecycle tracking
- `knowledge_documents` + `knowledge_chunks` — RAG knowledge base
- `impact_records` — Sustainability impact tracking
- `purchase_requests` — Duplicate purchase prevention
- `notifications` — In-app notification system
- `audit_logs` — AI recommendation audit trail

---

## 🛠️ Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite + Tailwind CSS v3
- React Router v6, TanStack Query, Zustand
- Recharts (data visualization)
- Framer Motion, Lucide React

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL + pgvector (vector similarity search)
- JWT Authentication, bcrypt, Zod validation
- Multer (file uploads), QRCode generation
- Morgan, Helmet, express-rate-limit

**AI:**
- IBM Watsonx / Granite-13B (granite mode)
- Mock provider for demo mode (always works)
- pgvector for embedding storage and similarity search

**Testing:**
- Jest + ts-jest
- 36 unit tests across AI, matching, and sustainability modules

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- (Optional) IBM Watsonx API credentials

### 1. Clone and Install

```bash
# Install backend dependencies
cd campusloop/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend
cp campusloop/backend/.env.example campusloop/backend/.env
# Edit .env — set DATABASE_URL and JWT_SECRET at minimum

# Frontend
cp campusloop/frontend/.env.example campusloop/frontend/.env
```

### 3. Database Setup

```bash
# Create database
createdb campusloop

# Run migrations (requires PostgreSQL with pgvector)
cd campusloop/backend
npm run db:migrate

# Seed demo data
npm run db:seed
```

**Note:** pgvector is optional — the app falls back to keyword search if vector operations fail.

### 4. Run the Application

```bash
# Terminal 1: Backend
cd campusloop/backend
npm run dev
# API runs on http://localhost:4000

# Terminal 2: Frontend
cd campusloop/frontend
npm run dev
# App runs on http://localhost:3000
```

---

## 🎭 Demo Mode

The application works **immediately** without any AI API keys:

```env
AI_MODE=mock
```

Demo mode provides:
- Deterministic, realistic AI responses
- Working semantic search (hash-based embeddings)
- Full match explanations
- Project planning with real component lists
- All workflows functional

### Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Student | arjun@campusloop.edu | Demo@1234 |
| Admin | admin@campusloop.edu | Demo@1234 |
| Faculty | faculty.cs@campusloop.edu | Demo@1234 |
| Lab Manager | lab.manager@campusloop.edu | Demo@1234 |

---

## 🌐 API Documentation

### Authentication
```
POST /api/auth/register    Register new user
POST /api/auth/login       Login
GET  /api/auth/me          Get current user
PATCH /api/auth/me         Update profile
```

### Resources
```
GET    /api/resources              List resources (paginated, filterable)
POST   /api/resources              Create listing (multipart + JSON)
GET    /api/resources/:id          Get resource detail
PATCH  /api/resources/:id          Update resource
DELETE /api/resources/:id          Retire resource
POST   /api/resources/:id/request  Request to borrow
GET    /api/resources/:id/qr       Get QR code
```

### Search & Matching
```
GET  /api/search              Hybrid search (semantic + keyword)
POST /api/search/semantic     Semantic vector search
```

### Requirements & AI Matching
```
POST /api/requirements              Create requirement + find matches
GET  /api/requirements              List user's requirements
GET  /api/requirements/:id/matches  Get matches for requirement
```

### AI Services
```
POST /api/ai/extract-requirement    Extract structured data from natural language
POST /api/ai/classify-resource      Classify resource from text/image
POST /api/ai/project-plan           Generate project component plan + campus search
POST /api/ai/match                  Get match explanation for resource+requirement
```

### Loans & Workflow
```
GET   /api/loans            List loans (type: borrowing|lending)
GET   /api/loans/:id        Get loan detail
PATCH /api/loans/:id        Approve/reject/cancel
POST  /api/loans/:id/handover  Verify handover QR
POST  /api/loans/:id/return    Verify return QR
```

### RAG Knowledge Base
```
POST /api/rag/query         Ask campus policy question (RAG)
```

### Impact & Analytics
```
GET /api/impact         Campus-wide sustainability impact
GET /api/impact/my      Personal impact dashboard
GET /api/impact/trend   Monthly trend data
```

### Purchase Check
```
POST /api/purchases/check   Check campus resources before purchasing
GET  /api/purchases         List purchase requests
```

### Admin (campus_admin / department_admin only)
```
GET   /api/admin/analytics          Full analytics dashboard
GET   /api/admin/underutilized      Underutilized asset detection
GET   /api/admin/users              User management
PATCH /api/admin/users/:id          Update user role/status
GET   /api/admin/circularity-score  Campus sustainability score
GET   /api/admin/knowledge-base     List documents
POST  /api/admin/knowledge-base     Add RAG document
```

### Notifications
```
GET   /api/notifications          List notifications
PATCH /api/notifications/:id/read  Mark as read
PATCH /api/notifications/read-all  Mark all read
```

---

## 🧪 Testing

```bash
cd campusloop/backend
npm test
```

Tests cover:
- AI requirement extraction
- AI resource classification  
- AI project planning
- RAG response generation
- Embedding generation and normalization
- Matching score calculation
- Hard constraint filtering
- Match explanation generation
- Sustainability calculations
- Duplicate purchase detection logic

```
Test Suites: 3 passed
Tests: 36 passed
```

---

## 🔐 Security

- JWT authentication with 7-day expiry
- Bcrypt password hashing (12 rounds)
- Role-based access control (6 roles)
- Input validation with Zod
- Helmet.js security headers
- Rate limiting (500 req/15min general, 20 req/15min auth)
- File type and size validation for uploads
- Server-side authorization on all mutation endpoints
- Secure error messages (no stack traces in production)
- AI interaction audit logging
- Admin action audit trail

---

## 🌿 Responsible AI

| Principle | Implementation |
|-----------|----------------|
| **Transparency** | Every AI recommendation includes a human-readable explanation |
| **Explainability** | Score breakdowns across 7 weighted factors |
| **Human Oversight** | AI recommends; humans approve institutional actions |
| **Uncertainty** | Confidence scores shown for image classification |
| **Non-hallucination** | RAG answers only from retrieved documents; says "not found" if no source |
| **Safety** | Hazardous resources flagged; restricted categories require approval |
| **Fairness** | Matching based only on functional compatibility, not user demographics |
| **Auditability** | AI interactions logged with model, confidence, and duration |
| **Privacy** | Minimum necessary data collection |
| **Estimates labeled** | All sustainability/CO₂ figures clearly labeled as estimates |

---

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd campusloop/frontend
npm run build
# Deploy dist/ to Vercel
```

Set environment variable: `VITE_API_URL=https://your-api.domain.com/api`

### Backend (Railway / Render / Docker)
```bash
cd campusloop/backend
npm run build
npm start
```

Set environment variables from `.env.example`.

### Database
- Use Supabase, Neon, or Railway PostgreSQL
- Enable the pgvector extension: `CREATE EXTENSION pgvector;`
- Run migrations: `npm run db:migrate`

### Docker (optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci --production
COPY dist/ dist/
CMD ["node", "dist/index.js"]
```

---

## 🔮 Future Scope

- Mobile app (React Native)
- Real-time WebSocket notifications
- Email/push notification integration
- Google Calendar integration for availability
- Campus SSO / LDAP authentication
- Barcode scanning for physical resource tagging
- Advanced analytics with ML-based demand forecasting
- Department-to-department automated transfer workflows
- Multi-campus federation
- API webhooks for ERP/inventory system integration

---

## ⚠️ Known Limitations

- pgvector must be installed for full semantic search (falls back to keyword)
- Image classification uses mock AI in demo mode (visual identification is illustrative)
- CO₂/material savings are rough estimates based on proxy factors
- Embeddings in mock mode are deterministic but not true semantic embeddings

---

## 📸 Screenshots

See `/docs/screenshots/` for UI screenshots (add after running locally).

---

## 👥 Contributors

Built for the AI hackathon. Contributions welcome.

---

*AI CampusLoop — Close the campus resource loop.*
