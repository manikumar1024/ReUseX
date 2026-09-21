import { useState } from 'react';
import { Network, Database, Cpu, Globe, Shield, Zap, ChevronRight, X } from 'lucide-react';

interface ArchNode {
  id: string;
  label: string;
  sublabel?: string;
  layer: 'frontend' | 'backend' | 'ai' | 'data' | 'infra';
  description: string;
  tech: string[];
  connections?: string[];
}

const NODES: ArchNode[] = [
  // Frontend
  {
    id: 'react-app',
    label: 'React App',
    sublabel: 'TypeScript + Vite',
    layer: 'frontend',
    description: 'Single-page application built with React 18 and TypeScript. Uses TanStack Query for server state, Zustand for client state, React Router v6 for navigation, and Framer Motion for animations.',
    tech: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'TanStack Query', 'Zustand', 'Recharts'],
    connections: ['api-gateway']
  },
  {
    id: 'landing',
    label: 'Landing Page',
    sublabel: 'Public marketing site',
    layer: 'frontend',
    description: 'Public-facing landing page with hero section, feature highlights, impact stats, and CTA buttons. No authentication required.',
    tech: ['React', 'Tailwind CSS', 'Framer Motion'],
    connections: ['react-app']
  },
  {
    id: 'dashboard',
    label: 'Dashboards',
    sublabel: 'User + Admin views',
    layer: 'frontend',
    description: 'Role-based dashboards: regular users see personal impact, loans, and recent resources. Admin users see campus-wide analytics, circularity score, underutilized resources, and charts.',
    tech: ['Recharts', 'React Query', 'RBAC'],
    connections: ['react-app']
  },
  // Backend
  {
    id: 'api-gateway',
    label: 'Express API',
    sublabel: 'REST + Middleware',
    layer: 'backend',
    description: 'Node.js / Express backend with TypeScript. Handles authentication, RBAC, rate limiting, file uploads (multer), validation, and routes all API requests to appropriate service modules.',
    tech: ['Node.js', 'Express', 'TypeScript', 'JWT', 'Multer', 'express-rate-limit'],
    connections: ['auth-service', 'resource-service', 'loan-service', 'ai-service', 'rag-service']
  },
  {
    id: 'auth-service',
    label: 'Auth Service',
    sublabel: 'JWT + RBAC',
    layer: 'backend',
    description: 'Handles registration, login, and session management using JWT tokens. Role-based access control for STUDENT, FACULTY, DEPT_ADMIN, LAB_MANAGER, CLUB, CAMPUS_ADMIN roles. Passwords hashed with bcrypt.',
    tech: ['JWT', 'bcrypt', 'RBAC', 'Express middleware'],
    connections: ['postgres']
  },
  {
    id: 'resource-service',
    label: 'Resource Service',
    sublabel: 'CRUD + Lifecycle',
    layer: 'backend',
    description: 'Manages the full resource lifecycle: creation, classification, listing, status updates, requests, and soft deletion. Integrates with vector embeddings on resource creation.',
    tech: ['PostgreSQL', 'pgvector', 'multer', 'sharp'],
    connections: ['postgres', 'vector-store', 'ai-service']
  },
  {
    id: 'loan-service',
    label: 'Loan Service',
    sublabel: 'Borrow workflow + QR',
    layer: 'backend',
    description: 'Manages the complete borrow/return lifecycle: request → approve → QR handover → active loan → QR return → impact recording. Generates and validates QR codes for handover and return.',
    tech: ['PostgreSQL', 'QR code', 'nanoid', 'notifications'],
    connections: ['postgres', 'notification-service', 'impact-service']
  },
  {
    id: 'ai-service',
    label: 'AI Service',
    sublabel: 'Multi-provider abstraction',
    layer: 'ai',
    description: 'Modular AI provider abstraction supporting IBM Granite, IBM BOB, and Mock (demo) mode. Handles requirement extraction, resource classification, multimodal image analysis, semantic matching, and project planning.',
    tech: ['IBM Granite', 'IBM BOB', 'Mock AI', 'Provider pattern'],
    connections: ['granite-provider', 'mock-provider', 'vector-store']
  },
  {
    id: 'rag-service',
    label: 'RAG Service',
    sublabel: 'Knowledge base Q&A',
    layer: 'ai',
    description: 'Retrieval-Augmented Generation system for campus policy queries. Chunks campus documents, stores embeddings in pgvector, retrieves relevant chunks for each query, and generates grounded answers using the LLM.',
    tech: ['pgvector', 'text chunking', 'semantic retrieval', 'IBM Granite'],
    connections: ['vector-store', 'granite-provider', 'postgres']
  },
  {
    id: 'matching-engine',
    label: 'Matching Engine',
    sublabel: 'Hybrid scoring',
    layer: 'ai',
    description: 'Hybrid matching algorithm combining semantic similarity (35%), availability (20%), timing (15%), location (10%), condition (10%), reliability (5%), and sustainability value (5%). Fully configurable weights. Generates human-readable explanations for every match.',
    tech: ['pgvector cosine similarity', 'constraint filtering', 'score aggregation'],
    connections: ['vector-store', 'postgres']
  },
  // AI Providers
  {
    id: 'granite-provider',
    label: 'IBM Granite',
    sublabel: 'Primary LLM',
    layer: 'ai',
    description: 'IBM Granite language model integration for requirement extraction, resource classification, project planning, and RAG answer generation. Configured via IBM_GRANITE_API_KEY environment variable.',
    tech: ['IBM Granite 3.x', 'IBM watsonx.ai', 'REST API'],
    connections: []
  },
  {
    id: 'mock-provider',
    label: 'Mock AI',
    sublabel: 'Demo mode (AI_MODE=mock)',
    layer: 'ai',
    description: 'Deterministic mock AI provider for demo/development mode. Returns realistic responses for all AI operations without requiring real API credentials. Enabled by setting AI_MODE=mock.',
    tech: ['TypeScript', 'Deterministic responses', 'No external deps'],
    connections: []
  },
  // Data
  {
    id: 'postgres',
    label: 'PostgreSQL',
    sublabel: 'Primary database',
    layer: 'data',
    description: 'Main relational database with 18 tables: users, departments, resources, resource_images, requirements, matches, loans, reviews, notifications, qr_codes, impact_records, purchase_requests, knowledge_documents, knowledge_chunks, ai_interactions, audit_logs, and more.',
    tech: ['PostgreSQL 14+', 'Foreign keys', 'Indexes', 'Transactions'],
    connections: []
  },
  {
    id: 'vector-store',
    label: 'pgvector',
    sublabel: 'Semantic embeddings',
    layer: 'data',
    description: 'Vector extension for PostgreSQL. Stores 768-dimensional embeddings for resources, requirements, and knowledge chunks. Enables fast cosine similarity search for semantic matching and RAG retrieval.',
    tech: ['pgvector 0.5+', 'IVFFlat index', '768-dim embeddings', 'Cosine similarity'],
    connections: []
  },
  // Infra
  {
    id: 'notification-service',
    label: 'Notifications',
    sublabel: 'In-app + extensible',
    layer: 'infra',
    description: 'In-app notification system with 10+ event types: new match, request received/approved/rejected, loan due, overdue, returned, duplicate purchase alert, underutilized resource. Designed for email/push extension.',
    tech: ['PostgreSQL', 'Real-time polling', 'Toast alerts'],
    connections: ['postgres']
  },
  {
    id: 'impact-service',
    label: 'Impact Engine',
    sublabel: 'Sustainability analytics',
    layer: 'infra',
    description: 'Tracks and calculates sustainability impact: resources reused, loans completed, estimated savings (INR), CO₂ avoided (kg), items diverted from disposal. Uses configurable estimation factors. Values clearly labeled as estimates.',
    tech: ['PostgreSQL aggregates', 'Configurable factors', 'INR + CO₂ estimates'],
    connections: ['postgres']
  },
];

const LAYER_CONFIG = {
  frontend: { label: 'Frontend', color: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-500', icon: <Globe size={14} /> },
  backend:  { label: 'Backend API', color: 'bg-brand/5 border-brand/20 text-brand', dot: 'bg-brand', icon: <Network size={14} /> },
  ai:       { label: 'AI Layer', color: 'bg-accent/20 border-accent/40 text-brand', dot: 'bg-accent', icon: <Cpu size={14} /> },
  data:     { label: 'Data Layer', color: 'bg-purple-50 border-purple-200 text-purple-700', dot: 'bg-purple-500', icon: <Database size={14} /> },
  infra:    { label: 'Services', color: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-400', icon: <Zap size={14} /> },
};

const LAYERS_ORDER: Array<keyof typeof LAYER_CONFIG> = ['frontend', 'backend', 'ai', 'data', 'infra'];

export default function ArchitecturePage() {
  const [selected, setSelected] = useState<ArchNode | null>(null);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  const visibleNodes = activeLayer
    ? NODES.filter(n => n.layer === activeLayer)
    : NODES;

  const layerGroups = LAYERS_ORDER.map(layer => ({
    layer,
    nodes: visibleNodes.filter(n => n.layer === layer)
  })).filter(g => g.nodes.length > 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-page font-bold text-brand mb-1">System Architecture</h1>
        <p className="text-ink-muted text-sm">
          Interactive overview of the ReUseX platform layers — click any node to explore details.
        </p>
      </div>

      {/* Layer filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveLayer(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
            activeLayer === null ? 'bg-brand text-white border-brand' : 'bg-surface text-ink-muted border-border hover:border-brand/30'
          }`}
        >
          All layers
        </button>
        {LAYERS_ORDER.map(layer => {
          const cfg = LAYER_CONFIG[layer];
          return (
            <button
              key={layer}
              onClick={() => setActiveLayer(activeLayer === layer ? null : layer)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                activeLayer === layer ? cfg.color + ' font-semibold' : 'bg-surface text-ink-muted border-border hover:bg-surface-muted'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Architecture layers */}
      <div className="space-y-4">
        {layerGroups.map(({ layer, nodes }) => {
          const cfg = LAYER_CONFIG[layer];
          return (
            <div key={layer}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-3 w-fit text-xs font-semibold ${cfg.color}`}>
                {cfg.icon}
                {cfg.label}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {nodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => setSelected(selected?.id === node.id ? null : node)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      selected?.id === node.id
                        ? 'border-brand bg-brand/5 shadow-sm'
                        : 'border-border bg-surface hover:border-brand/30 hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-brand leading-tight">{node.label}</div>
                        {node.sublabel && (
                          <div className="text-xs text-ink-subtle mt-0.5">{node.sublabel}</div>
                        )}
                      </div>
                      <ChevronRight size={14} className={`text-ink-subtle flex-shrink-0 transition-transform ${selected?.id === node.id ? 'rotate-90' : ''}`} />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {node.tech.slice(0, 2).map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-surface-muted rounded text-[10px] text-ink-subtle border border-border">{t}</span>
                      ))}
                      {node.tech.length > 2 && (
                        <span className="px-1.5 py-0.5 bg-surface-muted rounded text-[10px] text-ink-subtle border border-border">+{node.tech.length - 2}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="card p-6 animate-fade-in border-brand/20 bg-brand/5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2 border ${LAYER_CONFIG[selected.layer].color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${LAYER_CONFIG[selected.layer].dot}`} />
                {LAYER_CONFIG[selected.layer].label}
              </div>
              <h2 className="text-xl font-bold text-brand">{selected.label}</h2>
              {selected.sublabel && <p className="text-ink-subtle text-sm">{selected.sublabel}</p>}
            </div>
            <button onClick={() => setSelected(null)} className="text-ink-subtle hover:text-brand p-1">
              <X size={20} />
            </button>
          </div>

          <p className="text-ink-muted text-sm leading-relaxed mb-4">{selected.description}</p>

          <div className="mb-4">
            <div className="text-xs text-ink-subtle uppercase tracking-wide font-medium mb-2">Technologies</div>
            <div className="flex flex-wrap gap-1.5">
              {selected.tech.map(t => (
                <span key={t} className="px-2.5 py-1 bg-surface rounded-full text-xs text-brand border border-border font-medium">{t}</span>
              ))}
            </div>
          </div>

          {selected.connections && selected.connections.length > 0 && (
            <div>
              <div className="text-xs text-ink-subtle uppercase tracking-wide font-medium mb-2">Connects to</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.connections.map(cid => {
                  const target = NODES.find(n => n.id === cid);
                  if (!target) return null;
                  const tcfg = LAYER_CONFIG[target.layer];
                  return (
                    <button
                      key={cid}
                      onClick={() => setSelected(target)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors hover:opacity-80 ${tcfg.color}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${tcfg.dot}`} />
                      {target.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data flow diagram (text-based) */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-brand mb-4 flex items-center gap-2">
          <Network size={18} />
          Key Data Flows
        </h2>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          {[
            {
              title: 'Resource Match Flow',
              icon: '🎯',
              steps: [
                'User posts a need (natural language)',
                'AI extracts structured requirements',
                'Requirement stored + embedding generated',
                'Hybrid matcher scores all available resources',
                'Top matches ranked with explanations',
                'User selects and requests resource',
              ]
            },
            {
              title: 'Borrow / Return Flow',
              icon: '🔄',
              steps: [
                'Borrower sends request (with notes + duration)',
                'Owner approves / rejects',
                'QR handover code generated',
                'Both parties scan QR to verify handover',
                'Loan becomes active',
                'Borrower scans QR to confirm return',
                'Impact recorded, reviews opened',
              ]
            },
            {
              title: 'RAG Knowledge Flow',
              icon: '📚',
              steps: [
                'Campus documents ingested + chunked',
                'Chunks embedded via AI and stored in pgvector',
                'User asks a policy question',
                'Query embedded + semantically matched to chunks',
                'Top K chunks retrieved as context',
                'LLM generates grounded answer with sources',
              ]
            },
            {
              title: 'AI Provider Flow',
              icon: '🤖',
              steps: [
                'Request arrives at AI service',
                'Provider factory checks AI_MODE env variable',
                'Routes to IBM Granite, IBM BOB, or Mock',
                'Mock mode: deterministic realistic responses',
                'Granite mode: real LLM inference via watsonx.ai',
                'Response normalised to standard schema',
              ]
            },
          ].map(flow => (
            <div key={flow.title}>
              <div className="flex items-center gap-2 font-medium text-brand mb-2">
                <span>{flow.icon}</span>
                {flow.title}
              </div>
              <ol className="space-y-1">
                {flow.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-ink-muted text-xs">
                    <span className="w-4 h-4 bg-surface-muted rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-brand border border-border mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack summary */}
      <div className="card-flat p-6">
        <h2 className="text-lg font-semibold text-brand mb-4 flex items-center gap-2">
          <Shield size={18} />
          Technology Stack
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[
            { cat: 'Frontend', items: ['React 18 + TypeScript', 'Vite', 'Tailwind CSS v3', 'TanStack Query', 'Zustand', 'Recharts', 'Lucide React'] },
            { cat: 'Backend', items: ['Node.js + Express', 'TypeScript', 'JWT Auth', 'Multer (uploads)', 'express-rate-limit', 'bcrypt', 'Vitest'] },
            { cat: 'AI / ML', items: ['IBM Granite (LLM)', 'IBM BOB', 'pgvector (embeddings)', 'Semantic matching', 'RAG pipeline', 'Mock AI mode'] },
            { cat: 'Data & Infra', items: ['PostgreSQL 14+', 'pgvector extension', 'QR codes (nanoid)', 'File storage (disk)', 'In-app notifications', 'Audit logging'] },
          ].map(section => (
            <div key={section.cat}>
              <div className="text-xs font-semibold text-brand uppercase tracking-wide mb-2">{section.cat}</div>
              <ul className="space-y-1">
                {section.items.map(item => (
                  <li key={item} className="text-ink-muted text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
