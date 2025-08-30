# Auralytics - ClickHouse Metadata Extractor

A complete Python web application built with Streamlit to extract metadata from ClickHouse databases and visualize it with AI-generated column definitions.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Python dependencies
pip3 install -r requirements.txt
```

### 2. Run the Streamlit App

```bash
# Start the application
streamlit run streamlit_app.py
```

The application will open in your browser at `http://localhost:8501`

## 🎯 How It Works

### Simple Workflow:

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

### 🔧 What Happens Behind the Scenes:

1. **Streamlit** → Captures form data
2. **Python subprocess** → Executes `clickhouse_metadata_extractor.py`
3. **Real extraction** → Connects to ClickHouse database
4. **JSON generation** → Creates `clickhouse_metadata.json`
5. **Display** → Shows results in organized tables

## 📁 File Structure

```
Auralytics/
├── streamlit_app.py                  # Main Streamlit application
├── clickhouse_metadata_extractor.py  # Metadata extraction script
├── requirements.txt                  # Python dependencies
└── README.md
```

## 🔑 Environment Variables

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

## 🎨 Features

- **Three-page interface:** Database Connection, Schema Viewer, Chat Interface
- **Direct Python execution** - No APIs, no file downloads
- **Real-time metadata extraction** from ClickHouse
- **AI-powered column definitions** using Google Gemini
- **Interactive schema visualization** with expandable sections
- **Advanced chat interface** with voice input using Google Speech-to-Text
- **Form validation** and error handling
- **Beautiful UI** with custom styling

## 🛠️ Troubleshooting

### Common Issues:

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

## 📝 Usage Example

1. Run: `streamlit run streamlit_app.py`
2. Navigate to Database Connection tab
3. Enter your ClickHouse credentials
4. Click "Extract Metadata"
5. Wait for processing (spinner will show progress)
6. View results in Schema Viewer tab
7. Use Chat Interface to ask questions (text or voice input)

## 🎤 Speech-to-Text Setup

For voice input functionality:

1. **Get your service account JSON file** (follow `GOOGLE_CLOUD_SETUP.md`)
2. **Place the JSON file** in the project root as `google-stt-json.json`
3. **Restart the application** - Speech-to-text will be automatically enabled

**Requirements:** Google Cloud Speech-to-Text API
**Free Tier:** 60 minutes per month

## 🎯 Pure Python Solution!

This is a complete Python solution using Streamlit:
- ✅ **No APIs** - Direct Python execution
- ✅ **No file downloads** - Everything happens in the app
- ✅ **No complex setup** - Just run one command
- ✅ **Real data extraction** - Actually connects to ClickHouse
- ✅ **Beautiful interface** - Modern web UI with Streamlit
- ✅ **Interactive** - Expandable sections and chat interface

Perfect for your requirements - simple, direct, and completely Python-based!
