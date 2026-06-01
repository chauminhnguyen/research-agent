-- Papers Schema Migration
-- Creates papers table (with inline chunks + index) and wiki_nodes table
-- Schema v2: 4 tables → 2 tables (merge paper_chunks + document_index into papers)

-- papers table: metadata + inline chunks + inline index
CREATE TABLE IF NOT EXISTS papers (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references sessions(id) on delete cascade,
  source          varchar(20) not null,      -- 'arxiv', 'tavily', 'semantic_scholar'
  external_id     varchar(255),              -- arXiv ID, Tavily result ID
  title           text not null,
  authors         text[],
  abstract        text,
  url             text,
  pdf_url         text,
  open_access     boolean default false,
  is_paywall      boolean default false,

  -- Merged from paper_chunks: entire chunk list as single JSONB
  chunks_json     jsonb,                    -- [{idx, text, page, bbox, chunk_type}]

  -- Merged from document_index: full document structure as JSONB
  document_index  jsonb,                    -- {sections, figures, tables, equations, bibliography}

  -- For large papers: offload to Supabase Storage if chunks_json > 800KB
  chunks_url      text,                     -- URL to .json file in storage

  parsed_at       timestamptz,
  created_at      timestamptz default now()
);

-- wiki_nodes table: unified node storage with lineage
CREATE TABLE IF NOT EXISTS wiki_nodes (
  id              uuid primary key default gen_random_uuid(),
  research_id     uuid,                     -- belongs to which research project
  node_type       varchar(20) not null,     -- concept|method|result|insight|question|idea|experiment
  title           text,
  content         text,

  -- Lineage: what this node was built from
  derived_from    jsonb default '{}',        -- {methods: [], concepts: [], insights: []}

  -- Source traceability
  source_paper_id uuid references papers(id),
  raw_highlight   text,
  source_section  text,

  -- Implementation status (for method nodes)
  impl_status     varchar(20),              -- to_implement|in_progress|done|abandoned

  -- Archive instead of delete
  archived        boolean default false,

  created_at      timestamptz default now()
);

-- Indexes for papers
create index if not exists idx_papers_session on papers (session_id);
create index if not exists idx_papers_source on papers (source);
create index if not exists idx_papers_external_id on papers (external_id);

-- Indexes for wiki_nodes
create index if not exists idx_wiki_nodes_research on wiki_nodes (research_id);
create index if not exists idx_wiki_nodes_type on wiki_nodes (node_type);
create index if not exists idx_wiki_nodes_paper on wiki_nodes (source_paper_id);
create index if not exists idx_wiki_nodes_archived on wiki_nodes (archived);

-- RLS disabled for development
alter table papers disable row level security;
alter table wiki_nodes disable row level security;
