-- Auralytics Database Schema
-- This script sets up the initial database structure for the modern architecture
-- Supports multiple data sources via MindsDB MCP

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations table for multi-tenancy
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization members
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Data source connections (flexible for any type)
CREATE TABLE IF NOT EXISTS public.data_source_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'clickhouse', 'mysql', 'postgresql', 'mongodb', 'api', etc.
    description TEXT,
    connection_config JSONB NOT NULL, -- Flexible config for any data source
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data source schemas
CREATE TABLE IF NOT EXISTS public.data_source_schemas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    connection_id UUID REFERENCES public.data_source_connections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'database', 'collection', 'api_endpoint', etc.
    description TEXT,
    metadata JSONB, -- Additional metadata specific to the data source type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, name)
);

-- Data source tables/collections/endpoints
CREATE TABLE IF NOT EXISTS public.data_source_objects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    schema_id UUID REFERENCES public.data_source_schemas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'table', 'collection', 'endpoint', 'view', etc.
    description TEXT,
    row_count BIGINT,
    size_bytes BIGINT,
    metadata JSONB, -- Additional metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(schema_id, name)
);

-- Columns/fields with comprehensive metadata (works for any data source)
CREATE TABLE IF NOT EXISTS public.data_source_fields (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    object_id UUID REFERENCES public.data_source_objects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    is_nullable BOOLEAN DEFAULT TRUE,
    default_type TEXT, -- For ClickHouse: DEFAULT, MATERIALIZED, ALIAS, etc.
    default_expression TEXT, -- The actual default value expression
    comment TEXT, -- Original column comment from database
    codec_expression TEXT, -- Compression codec (ClickHouse specific)
    ttl_expression TEXT, -- TTL expression (ClickHouse specific)
    description TEXT, -- Human-readable description
    ai_description TEXT, -- AI-generated description
    business_definition TEXT, -- Business meaning and purpose
    data_quality_score DECIMAL(3,2),
    is_primary_key BOOLEAN DEFAULT FALSE,
    is_indexed BOOLEAN DEFAULT FALSE,
    sample_values JSONB, -- Sample data values for analysis
    metadata JSONB, -- Additional field metadata (position, constraints, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(object_id, name)
);

-- Field semantics history (for versioning)
CREATE TABLE IF NOT EXISTS public.field_semantics_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    field_id UUID REFERENCES public.data_source_fields(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    ai_description TEXT,
    business_definition TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboards
CREATE TABLE IF NOT EXISTS public.dashboards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    layout JSONB,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard widgets
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config JSONB NOT NULL,
    position JSONB,
    data_source_connection_id UUID REFERENCES public.data_source_connections(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query history
CREATE TABLE IF NOT EXISTS public.query_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    data_source_connection_id UUID REFERENCES public.data_source_connections(id),
    natural_language_query TEXT,
    sql_query TEXT NOT NULL,
    execution_time_ms INTEGER,
    row_count INTEGER,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data source sync history
CREATE TABLE IF NOT EXISTS public.data_source_sync_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    connection_id UUID REFERENCES public.data_source_connections(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL, -- 'schema', 'data', 'full'
    status TEXT NOT NULL, -- 'success', 'failed', 'partial'
    objects_synced INTEGER,
    fields_synced INTEGER,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metadata extraction jobs
CREATE TABLE IF NOT EXISTS public.metadata_extraction_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    connection_id UUID REFERENCES public.data_source_connections(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    progress_percentage INTEGER DEFAULT 0,
    total_databases INTEGER DEFAULT 0,
    total_tables INTEGER DEFAULT 0,
    total_columns INTEGER DEFAULT 0,
    processed_databases INTEGER DEFAULT 0,
    processed_tables INTEGER DEFAULT 0,
    processed_columns INTEGER DEFAULT 0,
    ai_analysis_enabled BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB, -- Job configuration and results
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI analysis cache (to avoid re-analyzing same columns)
CREATE TABLE IF NOT EXISTS public.ai_analysis_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    connection_id UUID REFERENCES public.data_source_connections(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    column_name TEXT NOT NULL,
    column_type TEXT NOT NULL,
    database_name TEXT,
    schema_name TEXT,
    ai_definition TEXT,
    model_used TEXT, -- Which AI model was used
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, table_name, column_name, column_type)
);

-- Row Level Security (RLS) Policies

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Organizations RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view organization" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = organizations.id
            AND user_id = auth.uid()
        )
    );
CREATE POLICY "Admins can update organization" ON public.organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = organizations.id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Organization members RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view organization members" ON public.organization_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
        )
    );

-- Data source connections RLS
ALTER TABLE public.data_source_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view connections" ON public.data_source_connections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = data_source_connections.organization_id
            AND user_id = auth.uid()
        )
    );
CREATE POLICY "Admins can manage connections" ON public.data_source_connections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = data_source_connections.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Data source schemas RLS
ALTER TABLE public.data_source_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view schemas" ON public.data_source_schemas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            JOIN public.data_source_connections dsc ON dsc.organization_id = om.organization_id
            WHERE dsc.id = data_source_schemas.connection_id
            AND om.user_id = auth.uid()
        )
    );

-- Data source objects RLS
ALTER TABLE public.data_source_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view objects" ON public.data_source_objects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            JOIN public.data_source_connections dsc ON dsc.organization_id = om.organization_id
            JOIN public.data_source_schemas dss ON dss.connection_id = dsc.id
            WHERE dss.id = data_source_objects.schema_id
            AND om.user_id = auth.uid()
        )
    );

-- Data source fields RLS
ALTER TABLE public.data_source_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view fields" ON public.data_source_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            JOIN public.data_source_connections dsc ON dsc.organization_id = om.organization_id
            JOIN public.data_source_schemas dss ON dss.connection_id = dsc.id
            JOIN public.data_source_objects dso ON dso.schema_id = dss.id
            WHERE dso.id = data_source_fields.object_id
            AND om.user_id = auth.uid()
        )
    );

-- Functions and triggers

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_source_connections_updated_at BEFORE UPDATE ON public.data_source_connections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_source_schemas_updated_at BEFORE UPDATE ON public.data_source_schemas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_source_objects_updated_at BEFORE UPDATE ON public.data_source_objects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_source_fields_updated_at BEFORE UPDATE ON public.data_source_fields
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON public.dashboards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at BEFORE UPDATE ON public.dashboard_widgets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for testing
INSERT INTO public.organizations (name, slug, description) 
VALUES ('Demo Organization', 'demo', 'Demo organization for testing')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample ClickHouse connection
INSERT INTO public.data_source_connections (
    organization_id,
    name,
    type,
    description,
    connection_config
) VALUES (
    (SELECT id FROM public.organizations WHERE slug = 'demo'),
    'Sample ClickHouse',
    'clickhouse',
    'Sample ClickHouse connection for testing',
    '{
        "host": "localhost",
        "port": 8123,
        "database": "default",
        "username": "default",
        "password": "password",
        "secure": false
    }'
) ON CONFLICT DO NOTHING;
