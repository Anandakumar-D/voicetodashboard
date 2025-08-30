# Auralytics - Modern Data Analytics Platform

A modern web application for ClickHouse metadata extraction and analysis using React, Netlify Functions, Supabase, and MindsDB MCP.

## 🏗️ Architecture

```
Auralytics/
├── web/                    # React/TypeScript frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   └── ...
│   └── package.json
├── mcp-server/            # MindsDB MCP Server
│   ├── server.js          # MCP server implementation
│   ├── test.js           # Test scripts
│   └── setup.js          # Setup script
├── netlify/
│   └── functions/        # Serverless functions
├── scripts/              # Database and deployment scripts
└── README.md
```

## 🚀 Features

### ✅ Completed
- **Modern React Frontend** with TypeScript and Tailwind CSS
- **Responsive UI** with sidebar navigation
- **Authentication System** (bypassed for demo)
- **Login Page** as entry point
- **Dashboard** with stats and quick actions
- **Data Sources Management** with connection modal
- **Schema Explorer** with expandable tree
- **Chat Interface** with speech-to-text functionality
- **Settings Page** with tabs
- **MindsDB MCP Server** implementation
- **Netlify Functions** for backend API
- **Supabase Schema** for data storage

### 🔄 In Progress
- **MindsDB Cloud Integration** - API key setup and testing
- **Supabase Cloud Project** - Database setup and configuration
- **Real Data Source Connections** - ClickHouse, MySQL, PostgreSQL, etc.

### 📋 Pending Tasks

#### 1. **MindsDB Setup** 🔧
- [x] Set up local MindsDB with Docker
- [x] Configure MCP server for local MindsDB
- [ ] Test MCP server connection
- [ ] Configure data source connections
- [ ] Test natural language to SQL conversion

#### 2. **Supabase Cloud Setup** ☁️
- [ ] Create Supabase project
- [ ] Run database schema setup
- [ ] Configure authentication
- [ ] Set up Row Level Security (RLS)
- [ ] Test database connections

#### 3. **Environment Configuration** ⚙️
- [ ] Set up `.env` files for all components
- [ ] Configure MindsDB API keys
- [ ] Set up Supabase credentials
- [ ] Configure Google Cloud for Speech-to-Text

#### 4. **Data Source Integration** 🔗
- [ ] Connect ClickHouse database
- [ ] Test schema synchronization
- [ ] Implement real query execution
- [ ] Add more data source types

#### 5. **Deployment** 🚀
- [ ] Deploy to Netlify
- [ ] Configure production environment
- [ ] Set up CI/CD pipeline
- [ ] Configure custom domain

#### 6. **Advanced Features** 🎯
- [ ] Real-time data updates
- [ ] Advanced analytics dashboards
- [ ] Data visualization charts
- [ ] Export functionality
- [ ] User management and permissions

## 🛠️ Setup Instructions

### 1. Frontend Setup

```bash
cd web
npm install
npm run dev
```

### 2. MindsDB MCP Server Setup

#### Option A: Local MindsDB (Recommended)

```bash
# Start MindsDB locally using Docker
./scripts/setup-mindsdb-local.sh

# Configure MCP server for local MindsDB
cd mcp-server
cp env.example .env
# Edit .env to use local settings (already configured by default)

# Test the connection
node test.js

# Start the MCP server
npm start
```

#### Option B: MindsDB Cloud

```bash
cd mcp-server
node setup.js  # Interactive setup
npm install
npm start
```

### 3. Environment Variables

#### For Local MindsDB Setup

```bash
# MindsDB Configuration (Local)
MINDSDB_HOST=http://localhost:47334
MINDSDB_USERNAME=mindsdb
MINDSDB_PASSWORD=mindsdb

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Frontend Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### For MindsDB Cloud Setup

```bash
# MindsDB Configuration (Cloud)
MINDSDB_HOST=https://cloud.mindsdb.com
MINDSDB_API_KEY=your_mindsdb_api_key

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Frontend Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

```bash
# Run Supabase schema setup
psql -h your-supabase-host -U postgres -d postgres -f scripts/setup-supabase.sql
```

## 🧪 Testing

### Test MindsDB MCP Server

#### Local MindsDB
```bash
# First start MindsDB locally
./scripts/setup-mindsdb-local.sh

# Then test the MCP server
cd mcp-server
node test.js
```

#### MindsDB Cloud
```bash
cd mcp-server
node test.js
```

### Test Frontend
```bash
cd web
npm run dev
# Open http://localhost:3000
```

## 📚 API Documentation

### MindsDB MCP Server Tools

1. **convert_natural_language_to_sql**
   - Converts natural language queries to SQL
   - Parameters: `naturalLanguageQuery`, `schemaContext`, `dataSourceType`, `connectionConfig`

2. **execute_sql_query**
   - Executes SQL queries against data sources
   - Parameters: `sqlQuery`, `dataSourceType`, `connectionConfig`

3. **get_schema_info**
   - Retrieves schema information from data sources
   - Parameters: `dataSourceType`, `connectionConfig`

4. **test_connection**
   - Tests data source connections
   - Parameters: `dataSourceType`, `connectionConfig`

### Netlify Functions

1. **/api/agent** - Natural language query processing
2. **/api/schema-sync** - Schema synchronization

## 🔧 Development

### Project Structure
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Netlify Functions + Node.js
- **Database**: Supabase (PostgreSQL)
- **AI/ML**: MindsDB MCP
- **Authentication**: Supabase Auth
- **Deployment**: Netlify

### Key Technologies
- **React 18** - Frontend framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Netlify Functions** - Serverless backend
- **Supabase** - Database and auth
- **MindsDB** - AI/ML platform
- **MCP** - Model Context Protocol

## 🚀 Deployment

### Netlify Deployment
1. Connect GitHub repository to Netlify
2. Configure build settings:
   - Build command: `cd web && npm run build`
   - Publish directory: `web/dist`
3. Set environment variables
4. Deploy

### Environment Variables for Production
```bash
# Set in Netlify dashboard
MINDSDB_API_KEY=your_production_key
SUPABASE_URL=your_production_url
SUPABASE_SERVICE_ROLE_KEY=your_production_key
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
1. Check the documentation
2. Review the test files
3. Open an issue on GitHub

---

**Next Steps**: Complete the pending tasks in order, starting with MindsDB setup and Supabase configuration.
