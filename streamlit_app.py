#!/usr/bin/env python3
"""
Streamlit App for ClickHouse Metadata Extractor
A complete Python solution without APIs or file downloads
"""

import streamlit as st
import subprocess
import json
import os
import sys
from typing import Dict, Any
import pandas as pd
import speech_recognition as sr
import io
import wave
import tempfile

# Page configuration
st.set_page_config(
    page_title="Auralytics",
    page_icon="🗄️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    .section-header {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2c3e50;
        margin-bottom: 1rem;
    }
    .success-box {
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 5px;
        padding: 1rem;
        margin: 1rem 0;
    }
    .error-box {
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 5px;
        padding: 1rem;
        margin: 1rem 0;
    }
    .microphone-button {
        background-color: #1f77b4;
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    .microphone-button:hover {
        background-color: #1565c0;
        transform: scale(1.1);
    }
    .microphone-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    .send-button {
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    .send-button:hover {
        background-color: #218838;
        transform: scale(1.1);
    }
    .send-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    .chat-input-container {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0;
    }
</style>
""", unsafe_allow_html=True)

def main():
    # Main header
    st.markdown('<h1 class="main-header">🗄️ Auralytics</h1>', unsafe_allow_html=True)
    
    # Sidebar for navigation
    st.sidebar.title("Navigation")
    page = st.sidebar.selectbox(
        "Choose a page",
        ["Database Connection", "Schema Viewer", "Chat Interface"]
    )
    
    if page == "Database Connection":
        show_database_connection()
    elif page == "Schema Viewer":
        show_schema_viewer()
    elif page == "Chat Interface":
        show_chat_interface()

def save_credentials(credentials):
    """Save database credentials to session state"""
    st.session_state.saved_credentials = credentials
    st.success("✅ Credentials saved successfully!")

def show_database_connection():
    """Database connection configuration page"""
    st.markdown('<h2 class="section-header">🔗 Database Connection</h2>', unsafe_allow_html=True)
    st.write("Configure your ClickHouse database connection and generate schema metadata")
    
    # Load saved credentials if they exist
    saved_creds = st.session_state.get('saved_credentials', {})
    
    # Create form for database configuration
    with st.form("database_config"):
        st.subheader("ClickHouse Database Credentials")
        
        col1, col2 = st.columns(2)
        
        with col1:
            host = st.text_input("Host", value=saved_creds.get('host', 'localhost'), help="ClickHouse server hostname or IP")
            port = st.text_input("Port", value=saved_creds.get('port', '8123'), help="ClickHouse HTTP port")
            user = st.text_input("Username", value=saved_creds.get('user', 'default'), help="ClickHouse username")
            password = st.text_input("Password", value=saved_creds.get('password', ''), type="password", help="ClickHouse password")
            database = st.text_input("Database", value=saved_creds.get('database', 'default'), help="Default database to connect to")
        
        with col2:
            secure = st.checkbox("Use SSL/TLS", value=saved_creds.get('secure', False), help="Enable secure connection")
            gemini_api_key = st.text_input("Gemini API Key", value=saved_creds.get('gemini_api_key', ''), type="password", help="Google Gemini API key for AI column definitions")
            gemini_model = st.selectbox(
                "Gemini Model",
                ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-2.5-pro"],
                index=["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-2.5-pro"].index(saved_creds.get('gemini_model', 'gemini-1.5-flash')),
                help="Gemini model to use for AI analysis"
            )
            targeted_schemas = st.text_input("Targeted Databases (comma-separated)", value=saved_creds.get('targeted_schemas', ''), help="Optional: specific databases to extract")
            target_tables = st.text_input("Target Tables (comma-separated)", value=saved_creds.get('target_tables', ''), help="Optional: specific tables to extract")
        
        # Action buttons
        col1, col2 = st.columns(2)
        with col1:
            save_creds = st.form_submit_button("💾 Save Credentials", type="secondary")
        with col2:
            submitted = st.form_submit_button("🚀 Extract Metadata", type="primary")
        
            # Handle save credentials
    if save_creds:
        credentials = {
            'host': host,
            'port': port,
            'user': user,
            'password': password,
            'database': database,
            'secure': secure,
            'gemini_api_key': gemini_api_key,
            'gemini_model': gemini_model,
            'targeted_schemas': targeted_schemas,
            'target_tables': target_tables
        }
        save_credentials(credentials)
    
    # Display saved credentials if they exist
    if st.session_state.get('saved_credentials'):
        st.subheader("💾 Saved Credentials")
        saved_creds = st.session_state.saved_credentials
        
        # Create a nice display of saved credentials (hiding sensitive data)
        creds_display = {
            'Host': saved_creds.get('host', ''),
            'Port': saved_creds.get('port', ''),
            'Username': saved_creds.get('user', ''),
            'Database': saved_creds.get('database', ''),
            'SSL/TLS': 'Yes' if saved_creds.get('secure') else 'No',
            'Gemini Model': saved_creds.get('gemini_model', ''),
            'Targeted Databases': saved_creds.get('targeted_schemas', 'All') if saved_creds.get('targeted_schemas') else 'All',
            'Target Tables': saved_creds.get('target_tables', 'All') if saved_creds.get('target_tables') else 'All'
        }
        
        # Display in columns
        cols = st.columns(2)
        for i, (key, value) in enumerate(creds_display.items()):
            with cols[i % 2]:
                st.metric(key, value)
        
        # Clear credentials button
        if st.button("🗑️ Clear Saved Credentials", type="secondary"):
            st.session_state.saved_credentials = {}
            st.rerun()
        
        if submitted:
            # Validate required fields
            if not all([host, port, user, gemini_api_key]):
                st.error("❌ Please fill in all required fields (Host, Port, Username, and Gemini API Key)")
                return
            
            # Show progress
            with st.spinner("🔄 Extracting metadata from ClickHouse database..."):
                try:
                    # Execute the metadata extraction
                    result = execute_metadata_extraction({
                        'host': host,
                        'port': port,
                        'user': user,
                        'password': password,
                        'database': database,
                        'secure': secure,
                        'geminiApiKey': gemini_api_key,
                        'geminiModel': gemini_model,
                        'targetedSchemas': targeted_schemas,
                        'targetTables': target_tables
                    })
                    
                    if result['success']:
                        st.success("✅ Metadata extraction completed successfully!")
                        st.json(result['metadata'])
                        
                        # Store the metadata in session state
                        st.session_state.metadata = result['metadata']
                        st.session_state.extraction_success = True
                        
                        # Show success message with navigation
                        st.markdown("""
                        <div class="success-box">
                            <h4>🎉 Extraction Complete!</h4>
                            <p>Your ClickHouse metadata has been successfully extracted and analyzed with AI-powered column definitions.</p>
                            <p>Navigate to the <strong>Schema Viewer</strong> tab to explore your database structure.</p>
                        </div>
                        """, unsafe_allow_html=True)
                        
                    else:
                        st.error(f"❌ Extraction failed: {result['error']}")
                        
                except Exception as e:
                    st.error(f"❌ An error occurred: {str(e)}")

def execute_metadata_extraction(config: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the metadata extraction Python script"""
    try:
        # Build command line arguments
        args = [
            sys.executable, 'clickhouse_metadata_extractor.py',
            '--host', config['host'],
            '--port', config['port'],
            '--user', config['user'],
            '--password', config['password'],
            '--database', config['database'],
            '--gemini-key', config['geminiApiKey'],
            '--gemini-model', config['geminiModel']
        ]
        
        # Add secure flag only if True
        if config['secure']:
            args.append('--secure')
        
        # Add optional arguments
        if config.get('targetedSchemas'):
            args.extend(['--targeted-schemas', config['targetedSchemas']])
        if config.get('targetTables'):
            args.extend(['--target-tables', config['targetTables']])
        
        # Execute the script
        st.info(f"🔧 Executing: {' '.join(args[:4])} ... [credentials hidden]")
        
        # Debug: Show the full command (without sensitive data)
        debug_args = args.copy()
        debug_args[6] = '[PASSWORD_HIDDEN]'  # Hide password
        debug_args[8] = '[API_KEY_HIDDEN]'   # Hide API key
        st.code(f"Command: {' '.join(debug_args)}", language="bash")
        
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            cwd=os.getcwd()
        )
        
        if result.returncode != 0:
            error_msg = result.stderr.strip()
            if "unrecognized arguments" in error_msg:
                error_msg = "Invalid command line arguments. Please check your configuration."
            return {
                'success': False,
                'error': f"Script execution failed: {error_msg}"
            }
        
        # Read the generated JSON file
        json_file = 'clickhouse_metadata.json'
        if not os.path.exists(json_file):
            return {
                'success': False,
                'error': f"Generated JSON file {json_file} not found"
            }
        
        with open(json_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        return {
            'success': True,
            'metadata': metadata,
            'output': result.stdout
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def save_metadata_changes(metadata):
    """Save the edited metadata back to the JSON file"""
    try:
        with open('clickhouse_metadata.json', 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        st.session_state.metadata_saved = True
        st.success("✅ Metadata changes saved successfully!")
    except Exception as e:
        st.error(f"❌ Error saving metadata: {str(e)}")

def show_schema_viewer():
    """Schema viewer page with editing capabilities"""
    st.markdown('<h2 class="section-header">📊 Schema Viewer</h2>', unsafe_allow_html=True)
    
    # Check if metadata exists
    if 'metadata' not in st.session_state or not st.session_state.get('extraction_success'):
        st.warning("⚠️ No metadata available. Please run metadata extraction first from the Database Connection tab.")
        return
    
    metadata = st.session_state.metadata
    
    # Add save button at the top
    col1, col2 = st.columns([1, 4])
    with col1:
        if st.button("💾 Save Changes", type="primary"):
            save_metadata_changes(metadata)
    
    with col2:
        if st.session_state.get("metadata_saved", False):
            st.success("✅ Metadata saved successfully!")
            st.session_state.metadata_saved = False
    
    # Display metadata in an organized way with editing
    st.subheader("Database Structure")
    
    # Create expandable sections for each database
    for db_name, db_data in metadata.get('databases', {}).items():
        with st.expander(f"🗄️ Database: {db_name}", expanded=True):
            for schema_name, schema_data in db_data.get('schemas', {}).items():
                st.write(f"**Schema:** {schema_name}")
                
                for table_name, table_data in schema_data.get('tables', {}).items():
                    st.write(f"**Table:** {table_name}")
                    
                    # Create a DataFrame for the columns with editing capability
                    columns_data = []
                    for col in table_data.get('columns', []):
                        columns_data.append({
                            'Column Name': col.get('name', ''),
                            'Type': col.get('type', ''),
                            'Default': col.get('default_expression', ''),
                            'Comment': col.get('comment', ''),
                            'AI Definition': col.get('ai_definition', '')
                        })
                    
                    if columns_data:
                        df = pd.DataFrame(columns_data)
                        
                        # Create editable dataframe
                        edited_df = st.data_editor(
                            df,
                            use_container_width=True,
                            key=f"editor_{db_name}_{schema_name}_{table_name}",
                            num_rows="dynamic"
                        )
                        
                        # Update metadata with edited data
                        updated_columns = []
                        for _, row in edited_df.iterrows():
                            updated_columns.append({
                                'name': row['Column Name'],
                                'type': row['Type'],
                                'default_expression': row['Default'],
                                'comment': row['Comment'],
                                'ai_definition': row['AI Definition']
                            })
                        
                        # Update the metadata structure
                        metadata['databases'][db_name]['schemas'][schema_name]['tables'][table_name]['columns'] = updated_columns
                        metadata['databases'][db_name]['schemas'][schema_name]['tables'][table_name]['column_count'] = len(updated_columns)
                        
                    else:
                        st.info("No columns found for this table")
                    
                    st.write(f"**Total Columns:** {table_data.get('column_count', 0)}")
                    st.divider()

def show_chat_interface():
    """Chat interface with speech-to-text functionality"""
    st.markdown('<h2 class="section-header">💬 Chat Interface</h2>', unsafe_allow_html=True)
    st.write("Ask questions about your database and I'll generate ClickHouse SQL queries to answer them!")
    
    # Show helpful examples
    with st.expander("💡 Example Questions", expanded=False):
        st.markdown("""
        **Try asking questions like:**
        - "Show me all tables in the database"
        - "Count the number of records in each table"
        - "What columns are in the users table?"
        - "Show me the first 10 rows from the orders table"
        - "Find all tables that contain 'user' in their name"
        - "What is the data type of the email column in users table?"
        
        **The AI will:**
        1. 🤖 Analyze your question
        2. 📊 Generate appropriate ClickHouse SQL
        3. 🔍 Execute the query against your database
        4. 📋 Display results in a formatted table
        """)
    
    # Initialize chat history
    if "messages" not in st.session_state:
        st.session_state.messages = []
    
    # Display chat messages
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
    
    # Check if Google Cloud service account JSON file exists
    json_file_path = "google-stt-json.json"
    credentials_exist = os.path.exists(json_file_path)
    
    if not credentials_exist:
        st.warning("⚠️ Google Cloud Speech-to-Text API not configured. Please set up your credentials.")
        st.info("""
        **To enable speech-to-text:**
        1. Place your service account JSON file in the project root
        2. Name it: `google-stt-json.json`
        3. Restart the application
        
        **Current Status:**
        - Looking for: `google-stt-json.json`
        - File found: ❌ No
        - Using fallback speech recognition
        """)
    else:
        st.success("✅ Google Cloud Speech-to-Text API configured!")
        st.info(f"**Service Account:** `{json_file_path}` found and ready to use.")
    
    # Display transcribed text if available
    if st.session_state.get("transcribed_text"):
        st.text_area("Transcribed Text:", value=st.session_state.transcribed_text, height=100)
        
        col1, col2 = st.columns([1, 1])
        with col1:
            if st.button("✅ Send Transcribed Text"):
                prompt = st.session_state.transcribed_text
                process_chat_message(prompt)
                # Clear transcribed text
                st.session_state.transcribed_text = None
                st.session_state.audio_data = None
                st.rerun()
        
        with col2:
            if st.button("🗑️ Clear"):
                st.session_state.transcribed_text = None
                st.session_state.audio_data = None
                st.rerun()
    
    # Custom chat input with microphone icon and send button
    st.subheader("💬 Ask Questions")
    
    # Create a modern chat input interface with three elements
    col1, col2, col3 = st.columns([15, 1, 1])
    
    with col1:
        # Text input
        user_input = st.text_input("", placeholder="Ask a question about your database...", label_visibility="collapsed", key="chat_input")
    
    with col2:
        # Microphone icon button
        if st.button("🎤", help="Click to record voice", disabled=not credentials_exist, key="mic_button"):
            st.session_state.recording = True
            st.session_state.audio_data = record_audio()
            
            # Process the recorded audio immediately
            if st.session_state.get("audio_data"):
                transcribed_text = transcribe_audio(st.session_state.audio_data)
                if transcribed_text:
                    st.session_state.transcribed_text = transcribed_text
                    st.session_state.current_input = transcribed_text
                    st.success(f"🎯 Transcribed: '{transcribed_text}'")
                    st.rerun()
                else:
                    st.error("❌ Could not transcribe audio. Please try again.")
        
        # Real-time streaming button
        if st.button("🔄", help="Start real-time voice streaming", disabled=not credentials_exist, key="stream_button"):
            st.session_state.streaming_mode = True
            st.session_state.stream_text = ""
            # Start the streaming in a background thread
            import threading
            stream_thread = threading.Thread(target=start_real_time_streaming)
            stream_thread.start()
            st.rerun()
        
        # Stop streaming button (only show when streaming)
        if st.session_state.get("streaming_mode", False):
            if st.button("⏹️", help="Stop real-time streaming", key="stop_stream_button"):
                st.session_state.streaming_mode = False
                st.rerun()
    
    with col3:
        # Send button (arrow)
        has_input = user_input or st.session_state.get("transcribed_text") or st.session_state.get("current_input")
        if st.button("➤", help="Send message", disabled=not has_input, key="send_button"):
            # Determine what to send
            message_to_send = user_input or st.session_state.get("transcribed_text") or st.session_state.get("current_input")
            if message_to_send:
                process_chat_message(message_to_send)
                # Clear the input and transcribed text
                st.session_state.transcribed_text = None
                st.session_state.current_input = None
                st.rerun()
    
    # Real-time streaming display
    if st.session_state.get("streaming_mode", False):
        st.info("🔄 Real-time voice streaming active...")
        
        # Create a placeholder for real-time transcription
        stream_placeholder = st.empty()
        
        # Show current stream text
        current_stream_text = st.session_state.get("stream_text", "")
        stream_placeholder.text_area("Real-time Transcription:", value=current_stream_text, height=100, key="stream_display")
        
        # Add a button to capture current stream text
        if st.button("📝 Capture Current Text", key="capture_stream"):
            if current_stream_text:
                st.session_state.current_input = current_stream_text
                st.session_state.streaming_mode = False
                st.success(f"📝 Captured: '{current_stream_text}'")
                st.rerun()
    
    # Auto-process text input on Enter key (alternative to send button)
    if user_input and user_input != st.session_state.get("last_input", ""):
        st.session_state.last_input = user_input
        process_chat_message(user_input)

def process_chat_message(prompt: str):
    """Process a chat message and generate response"""
    # Add user message to chat history
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    # Display user message
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # Generate bot response with loading indicator
    with st.chat_message("assistant"):
        with st.spinner("🤖 AI is analyzing your question and generating SQL..."):
            response = generate_chat_response(prompt)
            
            # If response contains SQL, show it first
            if "Generated SQL:" in response:
                # Extract and show SQL first
                sql_start = response.find("```sql")
                if sql_start != -1:
                    sql_end = response.find("```", sql_start + 6)
                    if sql_end != -1:
                        sql_query = response[sql_start + 6:sql_end].strip()
                        st.info(f"**Generated SQL:**\n```sql\n{sql_query}\n```")
                        
                        # Show execution status
                        with st.spinner("🔍 Executing query..."):
                            # Execute the query and show result
                            result = execute_clickhouse_query(sql_query)
                            if isinstance(result, pd.DataFrame):
                                if result.empty:
                                    st.success("✅ Query executed successfully!")
                                    st.info("**Result:** No data found.")
                                else:
                                    st.success("✅ Query executed successfully!")
                                    st.dataframe(result, use_container_width=True)
                            else:
                                st.error(f"❌ Query execution failed: {result}")
                        return
            
        st.markdown(response)
    
    # Add assistant response to chat history
    st.session_state.messages.append({"role": "assistant", "content": response})

def record_audio():
    """Record audio using microphone with real-time feedback"""
    try:
        # Initialize recognizer
        recognizer = sr.Recognizer()
        
        # Use microphone as source
        with sr.Microphone() as source:
            # Create a placeholder for real-time status
            status_placeholder = st.empty()
            status_placeholder.info("🎤 Listening... Speak now!")
            
            # Adjust for ambient noise
            status_placeholder.info("🔧 Adjusting for ambient noise...")
            recognizer.adjust_for_ambient_noise(source, duration=1)
            
            # Listen for audio input with real-time feedback
            status_placeholder.info("🎙️ Recording... Speak clearly!")
            audio = recognizer.listen(
                source, 
                timeout=10, 
                phrase_time_limit=15,
                snowboy_configuration=None
            )
            
            status_placeholder.success("✅ Recording completed!")
            return audio
            
    except sr.WaitTimeoutError:
        st.error("⏰ No speech detected within timeout period")
        return None
    except Exception as e:
        st.error(f"❌ Error recording audio: {str(e)}")
        return None

def start_real_time_streaming():
    """Start real-time voice streaming with continuous transcription"""
    try:
        # Initialize recognizer
        recognizer = sr.Recognizer()
        
        # Use microphone as source
        with sr.Microphone() as source:
            st.info("🔄 Starting real-time voice streaming...")
            
            # Adjust for ambient noise
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            
            # Continuous listening
            while st.session_state.get("streaming_mode", False):
                try:
                    # Listen for audio input
                    audio = recognizer.listen(source, timeout=1, phrase_time_limit=5)
                    
                    # Transcribe the audio
                    transcribed_text = transcribe_audio(audio)
                    if transcribed_text:
                        # Append to existing stream text
                        current_text = st.session_state.get("stream_text", "")
                        st.session_state.stream_text = current_text + " " + transcribed_text
                        st.rerun()
                        
                except sr.WaitTimeoutError:
                    # No speech detected, continue listening
                    continue
                except Exception as e:
                    st.error(f"❌ Error in streaming: {str(e)}")
                    break
                    
    except Exception as e:
        st.error(f"❌ Error starting real-time streaming: {str(e)}")

def transcribe_audio(audio_data):
    """Transcribe audio using Google Cloud Speech-to-Text"""
    try:
        # Initialize recognizer
        recognizer = sr.Recognizer()
        
        # Try Google Cloud Speech-to-Text first
        try:
            # Check if service account JSON file exists
            json_file_path = "google-stt-json.json"
            
            if os.path.exists(json_file_path):
                # Read the JSON file
                with open(json_file_path, 'r') as f:
                    google_credentials = f.read()
                
                # Use Google Cloud Speech-to-Text
                text = recognizer.recognize_google_cloud(
                    audio_data,
                    credentials_json=google_credentials,
                    language="en-US"
                )
                return text
            else:
                # Fallback to regular Google Speech Recognition (limited)
                st.warning("⚠️ Service account JSON file not found. Using fallback speech recognition.")
                text = recognizer.recognize_google(audio_data, language="en-US")
                return text
                
        except sr.UnknownValueError:
            st.error("❌ Could not understand the audio")
            return None
        except sr.RequestError as e:
            st.error(f"❌ Error with speech recognition service: {str(e)}")
            # Try fallback to regular Google Speech Recognition
            try:
                st.info("🔄 Trying fallback speech recognition...")
                text = recognizer.recognize_google(audio_data, language="en-US")
                return text
            except Exception as fallback_error:
                st.error(f"❌ Fallback also failed: {str(fallback_error)}")
                return None
            
    except Exception as e:
        st.error(f"❌ Error transcribing audio: {str(e)}")
        return None

def generate_sql_query(user_question, metadata):
    """Generate ClickHouse SQL query using Gemini LLM"""
    try:
        import google.generativeai as genai
        
        # Configure Gemini
        saved_creds = st.session_state.get('saved_credentials', {})
        print(f"DEBUG: Saved credentials keys: {list(saved_creds.keys())}")
        
        api_key = saved_creds.get('gemini_api_key')
        if not api_key:
            return "❌ Error: Gemini API key not found. Please save your credentials first."
        
        genai.configure(api_key=api_key)
        
        # Get the model
        model_name = saved_creds.get('gemini_model', 'gemini-1.5-flash')
        model = genai.GenerativeModel(model_name)
        
        # Debug: Log model configuration
        print(f"DEBUG: Using model: {model_name}")
        print(f"DEBUG: API key length: {len(api_key) if api_key else 0}")
        print(f"DEBUG: API key preview: {api_key[:10]}..." if api_key else "No API key")
        print(f"DEBUG: Model object: {model}")
        
        # Create a simplified schema info (limit size)
        databases_info = {}
        for db_name, db_data in metadata.get('databases', {}).items():
            databases_info[db_name] = {}
            for schema_name, schema_data in db_data.get('schemas', {}).items():
                databases_info[db_name][schema_name] = {}
                for table_name, table_data in schema_data.get('tables', {}).items():
                    # Only include table name and column count
                    databases_info[db_name][schema_name][table_name] = {
                        'column_count': table_data.get('column_count', 0)
                    }
        
        schema_info = json.dumps(databases_info, indent=2)
        
        # Debug: Log the schema info being sent
        print(f"DEBUG: Schema info length: {len(schema_info)}")
        print(f"DEBUG: Schema keys: {list(metadata.keys())}")
        print(f"DEBUG: Simplified schema preview: {schema_info[:200]}...")
        
        prompt = f"""
Generate a ClickHouse SQL query for this question.

Question: {user_question}

Available tables: {schema_info}

Return only the SQL query, no explanations.

SQL Query:
""".strip()
        
        # Debug: Log the prompt being sent
        print(f"DEBUG: Prompt length: {len(prompt)}")
        print(f"DEBUG: Prompt preview: {prompt[:500]}...")
        print(f"DEBUG: User question: '{user_question}'")
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Debug: Log the raw response
        print(f"DEBUG: Raw response type: {type(response)}")
        print(f"DEBUG: Response attributes: {dir(response)}")
        print(f"DEBUG: Response candidates: {response.candidates if hasattr(response, 'candidates') else 'No candidates'}")
        print(f"DEBUG: Response parts: {response.parts if hasattr(response, 'parts') else 'No parts'}")
        
        # Debug: Check if response has content
        if hasattr(response, 'candidates') and response.candidates:
            for i, candidate in enumerate(response.candidates):
                print(f"DEBUG: Candidate {i}: {candidate}")
                if hasattr(candidate, 'content'):
                    print(f"DEBUG: Candidate {i} content: {candidate.content}")
                    if hasattr(candidate.content, 'parts'):
                        print(f"DEBUG: Candidate {i} parts: {candidate.content.parts}")
                        for j, part in enumerate(candidate.content.parts):
                            print(f"DEBUG: Candidate {i} part {j}: {part}")
                            if hasattr(part, 'text'):
                                print(f"DEBUG: Candidate {i} part {j} text: '{part.text}'")
        
        # Extract the SQL query from response using robust method
        sql_query = ""
        
        try:
            # Use the same response extraction method as the working metadata extractor
            texts = []
            
            # New SDK shape: response.candidates[*].content.parts[*].text
            try:
                if hasattr(response, "candidates") and response.candidates:
                    for cand in response.candidates:
                        content = getattr(cand, "content", None)
                        if content and hasattr(content, "parts") and content.parts:
                            for p in content.parts:
                                t = getattr(p, "text", None)
                                if isinstance(t, str) and t.strip():
                                    texts.append(t.strip())
            except Exception:
                pass
            
            # Fallback for older SDK shapes or different response formats
            if not texts and hasattr(response, "parts") and response.parts:
                for p in response.parts:
                    t = getattr(p, "text", None)
                    if isinstance(t, str) and t.strip():
                        texts.append(t.strip())
            
            sql_query = "\n".join(texts).strip()
            
            # Debug: Log what we extracted
            print(f"DEBUG: Raw extracted text: '{sql_query}'")
            
        except Exception as e:
            print(f"DEBUG: Error in extraction: {str(e)}")
            return f"❌ Error extracting SQL from response: {str(e)}"
        
        # Clean up the SQL query
        sql_query = sql_query.strip()
        
        # Debug: Log the extracted SQL
        print(f"DEBUG: Extracted SQL: '{sql_query}'")
        print(f"DEBUG: SQL length: {len(sql_query)}")
        
        # Remove markdown code blocks if present
        if sql_query.startswith('```sql'):
            sql_query = sql_query[6:]
        if sql_query.startswith('```'):
            sql_query = sql_query[3:]
        if sql_query.endswith('```'):
            sql_query = sql_query[:-3]
        
        # Remove any FORMAT clauses
        if 'FORMAT' in sql_query.upper():
            sql_query = sql_query.split('FORMAT')[0].strip()
        
        # Remove semicolons
        sql_query = sql_query.rstrip(';')
        
        # Remove any extra whitespace and newlines
        sql_query = ' '.join(sql_query.split())
        
        sql_query = sql_query.strip()
        
        # Debug: Log the final SQL
        print(f"DEBUG: Final SQL: '{sql_query}'")
        
        return sql_query
        
    except Exception as e:
        return f"❌ Error generating SQL: {str(e)}"

def execute_clickhouse_query(sql_query):
    """Execute ClickHouse SQL query and return results"""
    try:
        import clickhouse_connect
        
        # Get credentials from session state
        creds = st.session_state.get('saved_credentials', {})
        if not creds:
            return "❌ Error: Database credentials not found. Please save your credentials first."
        
        # Connect to ClickHouse
        client = clickhouse_connect.get_client(
            host=creds.get('host', 'localhost'),
            port=int(creds.get('port', 8123)),
            username=creds.get('user', 'default'),
            password=creds.get('password', ''),
            database=creds.get('database', 'default'),
            secure=creds.get('secure', False)
        )
        
        # Execute query
        result = client.query(sql_query)
        
        # Convert result to DataFrame - handle ClickHouse result properly
        try:
            # Try to get result rows and column names
            if hasattr(result, 'result_rows') and result.result_rows:
                # Get column names
                if hasattr(result, 'column_names') and result.column_names:
                    column_names = [desc[0] for desc in result.column_names]
                else:
                    # Generate column names if not available
                    column_names = [f'col_{i}' for i in range(len(result.result_rows[0]))]
                
                # Create DataFrame
                df = pd.DataFrame(result.result_rows, columns=column_names)
            else:
                # Empty result
                df = pd.DataFrame()
            
            return df
            
        except Exception as df_error:
            # If DataFrame conversion fails, return the raw result
            return f"Query executed successfully but couldn't convert to DataFrame: {str(df_error)}"
        
    except Exception as e:
        return f"❌ Error executing query: {str(e)}"

def generate_chat_response(prompt: str) -> str:
    """Generate a response for the chat interface using LLM-powered SQL generation"""
    # Check if we have metadata and credentials
    if 'metadata' not in st.session_state or not st.session_state.get('extraction_success'):
        return "❌ No database schema available. Please generate schema from the Database Connection tab first."
    
    if not st.session_state.get('saved_credentials'):
        return "❌ No database credentials saved. Please save your credentials in the Database Connection tab first."
    
    # Generate SQL query using LLM
    sql_query = generate_sql_query(prompt, st.session_state.metadata)
    
    if sql_query.startswith("❌"):
        # Error occurred
        return sql_query
    
    if sql_query.startswith("ERROR:"):
        # LLM couldn't generate SQL
        return sql_query
    
    # Debug: Show the metadata structure being sent to LLM
    debug_info = f"""
**Debug Info:**
- Metadata keys: {list(st.session_state.metadata.keys())}
- Databases found: {list(st.session_state.metadata.get('databases', {}).keys())}
- Total databases: {len(st.session_state.metadata.get('databases', {}))}
"""
    
    # Return SQL query with debug info
    return f"{debug_info}\n**Generated SQL:**\n```sql\n{sql_query}\n```"

if __name__ == "__main__":
    main()
