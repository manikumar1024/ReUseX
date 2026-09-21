-- AI CampusLoop Database Schema
-- Run this migration to set up the full schema

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  contact_email VARCHAR(200),
  building VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('student','faculty','department_admin','lab_manager','club_org','campus_admin')),
  department_id UUID REFERENCES departments(id),
  avatar_url VARCHAR(500),
  bio TEXT,
  contact_number VARCHAR(30),
  building VARCHAR(100),
  room_number VARCHAR(50),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  reliability_score NUMERIC(4,2) DEFAULT 5.0,
  total_loans INTEGER DEFAULT 0,
  successful_returns INTEGER DEFAULT 0,
  response_rate NUMERIC(4,2) DEFAULT 100.0,
  cancellation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource categories
CREATE TABLE IF NOT EXISTS resource_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id UUID REFERENCES resource_categories(id),
  icon VARCHAR(50),
  requires_approval BOOLEAN DEFAULT false,
  is_hazardous BOOLEAN DEFAULT false,
  description TEXT
);

-- Resources
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES resource_categories(id),
  resource_type VARCHAR(100),
  owner_id UUID NOT NULL REFERENCES users(id),
  department_id UUID REFERENCES departments(id),
  condition VARCHAR(50) NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent','good','fair','poor')),
  quantity INTEGER NOT NULL DEFAULT 1,
  available_quantity INTEGER NOT NULL DEFAULT 1,
  location VARCHAR(200),
  building VARCHAR(100),
  room_number VARCHAR(50),
  mode VARCHAR(50) NOT NULL DEFAULT 'borrow' CHECK (mode IN ('borrow','give','exchange','low_cost_sale','department_transfer')),
  price NUMERIC(10,2),
  status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available','borrowed','reserved','unavailable','retired','under_review')),
  lifecycle_stage VARCHAR(50) DEFAULT 'listed' CHECK (lifecycle_stage IN ('purchased','assigned','in_use','underutilized','listed','matched','borrowed','returned','reassigned','retired')),
  is_hazardous BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  available_from DATE,
  available_until DATE,
  specifications JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  ai_classification JSONB,
  view_count INTEGER DEFAULT 0,
  borrow_count INTEGER DEFAULT 0,
  last_borrowed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource images
CREATE TABLE IF NOT EXISTS resource_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  ai_identified BOOLEAN DEFAULT false,
  ai_confidence NUMERIC(4,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource embeddings (for semantic search)
CREATE TABLE IF NOT EXISTS resource_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  embedding vector(1536),
  embedding_text TEXT,
  model_used VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Requirements (what users need)
CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  raw_query TEXT NOT NULL,
  structured_data JSONB NOT NULL DEFAULT '{}',
  category VARCHAR(100),
  resource_type VARCHAR(100),
  purpose TEXT,
  duration_days INTEGER,
  urgency VARCHAR(50) DEFAULT 'normal' CHECK (urgency IN ('low','normal','high','urgent')),
  budget_max NUMERIC(10,2),
  preferred_location VARCHAR(200),
  required_from DATE,
  required_until DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','matched','fulfilled','expired','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Requirement embeddings
CREATE TABLE IF NOT EXISTS requirement_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  embedding vector(1536),
  embedding_text TEXT,
  model_used VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches (AI-generated resource recommendations)
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_id UUID NOT NULL REFERENCES requirements(id),
  resource_id UUID NOT NULL REFERENCES resources(id),
  score NUMERIC(5,2) NOT NULL,
  score_breakdown JSONB DEFAULT '{}',
  explanation TEXT,
  explanation_points TEXT[] DEFAULT '{}',
  limitations TEXT[] DEFAULT '{}',
  ai_model VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id),
  borrower_id UUID NOT NULL REFERENCES users(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  requirement_id UUID REFERENCES requirements(id),
  match_id UUID REFERENCES matches(id),
  status VARCHAR(50) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','active','returned','overdue','cancelled')),
  quantity INTEGER NOT NULL DEFAULT 1,
  requested_from DATE,
  requested_until DATE,
  actual_start DATE,
  actual_end DATE,
  pickup_location VARCHAR(200),
  notes TEXT,
  borrower_notes TEXT,
  owner_notes TEXT,
  qr_handover_code VARCHAR(100),
  qr_return_code VARCHAR(100),
  handover_verified_at TIMESTAMPTZ,
  return_verified_at TIMESTAMPTZ,
  due_reminder_sent BOOLEAN DEFAULT false,
  overdue_reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES loans(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewee_id UUID NOT NULL REFERENCES users(id),
  resource_id UUID NOT NULL REFERENCES resources(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  condition_accuracy INTEGER CHECK (condition_accuracy >= 1 AND condition_accuracy <= 5),
  type VARCHAR(30) DEFAULT 'borrower_review' CHECK (type IN ('borrower_review','owner_review')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(300) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR codes
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id),
  loan_id UUID REFERENCES loans(id),
  code VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('resource','handover','return')),
  data JSONB DEFAULT '{}',
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impact records
CREATE TABLE IF NOT EXISTS impact_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES loans(id),
  resource_id UUID REFERENCES resources(id),
  user_id UUID REFERENCES users(id),
  department_id UUID REFERENCES departments(id),
  type VARCHAR(50) NOT NULL,
  estimated_value NUMERIC(10,2),
  estimated_co2_kg NUMERIC(10,4),
  estimated_material_kg NUMERIC(10,4),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase requests (for duplicate purchase check)
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id),
  requested_by UUID NOT NULL REFERENCES users(id),
  item_name VARCHAR(300) NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  estimated_cost NUMERIC(10,2),
  purpose TEXT,
  status VARCHAR(50) DEFAULT 'checking' CHECK (status IN ('checking','alternatives_found','approved','cancelled','purchased')),
  alternatives_found JSONB DEFAULT '[]',
  estimated_savings NUMERIC(10,2),
  campus_check_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campus knowledge base documents
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'policy',
  department_id UUID REFERENCES departments(id),
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge chunks (for RAG)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI interactions log (auditability)
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(100) NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  model_used VARCHAR(100),
  confidence NUMERIC(4,2),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resources_owner ON resources(owner_id);
CREATE INDEX IF NOT EXISTS idx_resources_department ON resources(department_id);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category_id);
CREATE INDEX IF NOT EXISTS idx_resources_mode ON resources(mode);
CREATE INDEX IF NOT EXISTS idx_resources_created ON resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requirements_user ON requirements(user_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_owner ON loans(owner_id);
CREATE INDEX IF NOT EXISTS idx_loans_resource ON loans(resource_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_matches_requirement ON matches(requirement_id);
CREATE INDEX IF NOT EXISTS idx_matches_resource ON matches(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Vector indexes (requires pgvector)
CREATE INDEX IF NOT EXISTS idx_resource_embeddings_vector 
  ON resource_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_vector 
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER requirements_updated_at BEFORE UPDATE ON requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER loans_updated_at BEFORE UPDATE ON loans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER purchase_requests_updated_at BEFORE UPDATE ON purchase_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER knowledge_documents_updated_at BEFORE UPDATE ON knowledge_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
