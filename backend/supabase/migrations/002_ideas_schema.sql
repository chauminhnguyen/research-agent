-- Ideas Workspace Schema
-- Research Paper Explorer & LLM Wiki
-- Node types: concept, method, result, insight, research_question, idea, experiment

-- Node type enum
create type node_type as enum ('concept', 'method', 'result', 'insight', 'research_question', 'idea', 'experiment');

-- Status enums
create type question_status as enum ('open', 'in_progress', 'answered', 'closed');
create type idea_status as enum ('draft', 'active', 'implemented', 'archived');
create type method_status as enum ('to_implement', 'in_progress', 'done', 'abandoned');
create type experiment_status as enum ('planned', 'running', 'completed', 'failed');
create type result_role as enum ('baseline', 'sota', 'comparison');
create type insight_origin as enum ('paper', 'self', 'synthesis');

-- Concepts: Theory / definitions from papers
drop table if exists concepts cascade;
create table concepts (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references sessions on delete cascade not null,
  title           text not null,
  definition      text,
  source_paper    text,
  source_authors  text,
  source_year     int,
  source_section  text,
  raw_highlight   text,
  search_text     text generated always as (
    coalesce(title, '') || ' ' || coalesce(definition, '') || ' ' || coalesce(source_paper, '')
  ) stored,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Methods: Techniques that can be adapted or implemented
drop table if exists methods cascade;
create table methods (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid references sessions on delete cascade not null,
  title               text not null,
  algorithm_sketch    text,
  complexity          text,
  implementation_status method_status default 'to_implement',
  source_paper        text,
  source_authors      text,
  source_year         int,
  source_section      text,
  raw_highlight       text,
  adapt_notes         text,
  search_text         text generated always as (
    coalesce(title, '') || ' ' || coalesce(algorithm_sketch, '') || ' ' || coalesce(source_paper, '')
  ) stored,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Results: Benchmarks and metrics from papers
drop table if exists results cascade;
create table results (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references sessions on delete cascade not null,
  metric_name     text not null,
  metric_value    text,
  dataset         text,
  role            result_role default 'baseline',
  source_paper    text,
  source_authors  text,
  source_year     int,
  source_section  text,
  raw_highlight   text,
  search_text     text generated always as (
    coalesce(metric_name, '') || ' ' || coalesce(dataset, '') || ' ' || coalesce(source_paper, '')
  ) stored,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Insights: Observations, gaps, research notes
drop table if exists insights cascade;
create table insights (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references sessions on delete cascade not null,
  content         text not null,
  origin          insight_origin not null,
  source_paper    text,
  source_authors  text,
  source_year     int,
  source_section  text,
  raw_highlight   text,
  search_text     text generated always as (
    coalesce(content, '') || ' ' || coalesce(source_paper, '')
  ) stored,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Research Questions: Open questions formed from insights
drop table if exists research_questions cascade;
create table research_questions (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references sessions on delete cascade not null,
  question        text not null,
  hypothesis      text,
  status          question_status default 'open',
  search_text     text generated always as (coalesce(question, '') || ' ' || coalesce(hypothesis, '')) stored,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Ideas: User's own ideas synthesised from nodes
drop table if exists ideas cascade;
create table ideas (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references sessions on delete cascade not null,
  title           text not null,
  contribution    text,
  status          idea_status default 'draft',
  search_text     text generated always as (
    coalesce(title, '') || ' ' || coalesce(contribution, '')
  ) stored,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Experiments: Planned or completed experiments
drop table if exists experiments cascade;
create table experiments (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references sessions on delete cascade not null,
  idea_id         uuid references ideas on delete set null,
  title           text not null,
  description     text,
  status          experiment_status default 'planned',
  code_entry      text,
  config_path     text,
  notes           text,
  results_json    jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Idea Dependencies: Lineage tracking (what nodes an idea was built from)
drop table if exists idea_dependencies cascade;
create table idea_dependencies (
  id              uuid primary key default gen_random_uuid(),
  idea_id         uuid references ideas on delete cascade not null,
  node_type       node_type not null,
  node_id         uuid not null,
  adapt_notes     text,
  created_at      timestamptz default now(),
  unique(idea_id, node_type, node_id)
);

-- Question Insights: Link insights to research questions
drop table if exists question_insights cascade;
create table question_insights (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid references research_questions on delete cascade not null,
  insight_id      uuid references insights on delete cascade not null,
  created_at      timestamptz default now(),
  unique(question_id, insight_id)
);

-- Method Dependencies: Methods used in experiments
drop table if exists experiment_methods cascade;
create table experiment_methods (
  id              uuid primary key default gen_random_uuid(),
  experiment_id   uuid references experiments on delete cascade not null,
  method_id       uuid references methods on delete cascade not null,
  adapt_notes     text,
  created_at      timestamptz default now(),
  unique(experiment_id, method_id)
);

-- Experiment Baselines: Results used as baselines
drop table if exists experiment_baselines cascade;
create table experiment_baselines (
  id              uuid primary key default gen_random_uuid(),
  experiment_id   uuid references experiments on delete cascade not null,
  result_id       uuid references results on delete cascade not null,
  created_at      timestamptz default now(),
  unique(experiment_id, result_id)
);

-- Concept Methods: Link concepts to methods
drop table if exists concept_methods cascade;
create table concept_methods (
  id              uuid primary key default gen_random_uuid(),
  concept_id      uuid references concepts on delete cascade not null,
  method_id       uuid references methods on delete cascade not null,
  created_at      timestamptz default now(),
  unique(concept_id, method_id)
);

-- Disable RLS for development
alter table concepts disable row level security;
alter table methods disable row level security;
alter table results disable row level security;
alter table insights disable row level security;
alter table research_questions disable row level security;
alter table ideas disable row level security;
alter table experiments disable row level security;
alter table idea_dependencies disable row level security;
alter table question_insights disable row level security;
alter table experiment_methods disable row level security;
alter table experiment_baselines disable row level security;
alter table concept_methods disable row level security;

-- Indexes for performance
create index if not exists idx_concepts_session on concepts (session_id);
create index if not exists idx_concepts_search on concepts using gin(to_tsvector('english', search_text));
create index if not exists idx_methods_session on methods (session_id);
create index if not exists idx_methods_status on methods (implementation_status);
create index if not exists idx_methods_search on methods using gin(to_tsvector('english', search_text));
create index if not exists idx_results_session on results (session_id);
create index if not exists idx_results_dataset on results (dataset);
create index if not exists idx_results_search on results using gin(to_tsvector('english', search_text));
create index if not exists idx_insights_session on insights (session_id);
create index if not exists idx_insights_origin on insights (origin);
create index if not exists idx_insights_search on insights using gin(to_tsvector('english', search_text));
create index if not exists idx_research_questions_session on research_questions (session_id);
create index if not exists idx_research_questions_status on research_questions (status);
create index if not exists idx_ideas_session on ideas (session_id);
create index if not exists idx_ideas_status on ideas (status);
create index if not exists idx_ideas_search on ideas using gin(to_tsvector('english', search_text));
create index if not exists idx_experiments_session on experiments (session_id);
create index if not exists idx_experiments_idea on experiments (idea_id);
create index if not exists idx_idea_dependencies_idea on idea_dependencies (idea_id);
create index if not exists idx_idea_dependencies_node on idea_dependencies (node_type, node_id);
