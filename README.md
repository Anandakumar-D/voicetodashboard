# Auralytics - ClickHouse Metadata Extractor

A complete Python web application built with Streamlit to extract metadata from ClickHouse databases and visualize it with AI-generated column definitions.

## 🏗️ Architecture Overview

This project is currently undergoing a migration to a modern architecture while maintaining the existing Streamlit application:

### Current System (Streamlit)
- **Status**: ✅ Fully functional and maintained
- **Technology**: Python + Streamlit
- **Location**: Root directory files (`streamlit_app.py`, etc.)

### New System (React + Netlify + Supabase)
- **Status**: 🚧 Under development
- **Technology**: React/TypeScript + Netlify Functions + Supabase + MindsDB
- **Location**: `web/` and `netlify/functions/` directories

### Migration Strategy
- **Both UIs coexist** during the transition period
- **Streamlit remains the primary interface** until new system is complete
- **Progressive feature migration** from Streamlit to React
- **No disruption** to current workflows

## 🚀 Quick Start

### Option 1: Streamlit App (Current Primary)

#### 1. Install Dependencies

```bash
# Install Python dependencies
pip3 install -r requirements.txt
```

#### 2. Run the Streamlit App

```bash
# Start the application
streamlit run streamlit_app.py
```

The application will open in your browser at `http://localhost:8501`

### Option 2: React App (Under Development)

```bash
# Navigate to web directory
cd web

# Install dependencies (when ready)
npm install

# Start development server (when ready)
npm run dev
```

## 🎯 How It Works

### Streamlit Workflow (Current):

1. **Open the app** at `http://localhost:8501`
2. **Go to "Database Connection" tab**
3. **Fill in your ClickHouse credentials:**
   - Host, Port, Username, Password
   - Database name
   - Gemini API Key and Model
   - Optional: Targeted databases/tables for filtering
4. **Click "Extract Metadata"**
5. **The system will:**
   - Directly execute the Python metadata extractor
   - Generate `clickhouse_metadata.json` with real data
   - Display results immediately in the app
   - Show organized schema structure

### React Workflow (Future):

1. **Authentication** via Supabase Auth
2. **Schema Management** with versioned column semantics
3. **Natural Language Queries** via MindsDB MCP
4. **Dashboard Creation** with interactive widgets
5. **Voice Input** using Google Speech-to-Text

## 📁 File Structure

```
Auralytics/
├── streamlit_app.py                  # Main Streamlit application (CURRENT)
├── clickhouse_metadata_extractor.py  # Metadata extraction script
├── requirements.txt                  # Python dependencies
├── web/                              # React/TypeScript frontend (NEW)
├── netlify/                          # Serverless functions (NEW)
│   └── functions/
├── scripts/                          # DB/admin tasks and docs (NEW)
└── README.md
```

## 🔑 Environment Variables

### Streamlit (Current)
Create a `.env` file in the root directory (optional, for direct Python script usage):

```env
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_password
CLICKHOUSE_DATABASE=default
CLICKHOUSE_SECURE=false
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
TARGETED_SCHEMAS=database1,database2
TARGET_TABLES=table1,table2
```

### React/Netlify (Future)
Environment variables will be configured in Netlify and Supabase for:
- Supabase authentication
- MindsDB MCP connections
- Google Cloud services
- LLM API keys

## 🎨 Features

### Streamlit (Current):
- **Three-page interface:** Database Connection, Schema Viewer, Chat Interface
- **Direct Python execution** - No APIs, no file downloads
- **Real-time metadata extraction** from ClickHouse
- **AI-powered column definitions** using Google Gemini
- **Interactive schema visualization** with expandable sections
- **Advanced chat interface** with voice input using Google Speech-to-Text
- **Form validation** and error handling
- **Beautiful UI** with custom styling

### React/Netlify (Future):
- **Modern React interface** with TypeScript
- **Supabase authentication** and user management
- **Schema versioning** with column semantics history
- **Natural language to SQL** via MindsDB MCP
- **Interactive dashboards** with configurable widgets
- **Real-time collaboration** features
- **Advanced voice input** with transcription
- **Multi-tenant architecture** with Row Level Security

## 🛠️ Troubleshooting

### Streamlit Issues:

1. **Streamlit not starting:**
   - Check if port 8501 is available
   - Ensure all Python dependencies are installed

2. **Python script execution fails:**
   - Verify ClickHouse credentials
   - Check if `clickhouse_metadata_extractor.py` exists
   - Ensure Gemini API key is valid

3. **JSON file not found:**
   - Check if the Python script generated `clickhouse_metadata.json`
   - Verify file permissions

4. **Speech-to-Text not working:**
   - Follow the setup guide in `GOOGLE_CLOUD_SETUP.md`
   - Ensure Google Cloud credentials are properly configured
   - Check microphone permissions in your browser

### React/Netlify Issues (Future):
- Will be documented as the new system develops

## 📝 Usage Example

### Streamlit (Current):
1. Run: `streamlit run streamlit_app.py`
2. Navigate to Database Connection tab
3. Enter your ClickHouse credentials
4. Click "Extract Metadata"
5. Wait for processing (spinner will show progress)
6. View results in Schema Viewer tab
7. Use Chat Interface to ask questions (text or voice input)

### React (Future):
1. Authenticate via Supabase
2. Connect to ClickHouse via MindsDB
3. Browse and edit column semantics
4. Ask natural language questions
5. Create and share dashboards

## 🎤 Speech-to-Text Setup

For voice input functionality:

1. **Get your service account JSON file** (follow `GOOGLE_CLOUD_SETUP.md`)
2. **Place the JSON file** in the project root as `google-stt-json.json`
3. **Restart the application** - Speech-to-text will be automatically enabled

**Requirements:** Google Cloud Speech-to-Text API
**Free Tier:** 60 minutes per month

## 🎯 Migration Status

### Phase 0: ✅ Repository Structure
- [x] Create new branch for migration
- [x] Add new folder structure
- [x] Update documentation

### Phase 1: 🚧 Supabase Setup
- [ ] Create Supabase project
- [ ] Set up database schema
- [ ] Configure authentication

### Phase 2: 🚧 MindsDB Integration
- [ ] Deploy MindsDB instance
- [ ] Configure ClickHouse connection
- [ ] Set up MCP server

### Phase 3: 🚧 React Frontend
- [ ] Initialize React/TypeScript app
- [ ] Set up Supabase client
- [ ] Create authentication flow

### Phase 4: 🚧 Netlify Functions
- [ ] Deploy serverless functions
- [ ] Implement API endpoints
- [ ] Configure environment variables

## 🎯 Pure Python Solution!

The current Streamlit implementation is a complete Python solution:
- ✅ **No APIs** - Direct Python execution
- ✅ **No file downloads** - Everything happens in the app
- ✅ **No complex setup** - Just run one command
- ✅ **Real data extraction** - Actually connects to ClickHouse
- ✅ **Beautiful interface** - Modern web UI with Streamlit
- ✅ **Interactive** - Expandable sections and chat interface

Perfect for your requirements - simple, direct, and completely Python-based!

The new React/Netlify architecture will provide additional features while maintaining the same core functionality.
