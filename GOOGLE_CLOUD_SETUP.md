# Google Cloud Speech-to-Text API Setup Guide

This guide will help you set up Google Cloud Speech-to-Text API for the Auralytics application.

## 🚀 Step-by-Step Setup

### 1. Create a Google Cloud Project

1. **Go to Google Cloud Console:**
   - Visit [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create a new project:**
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter a project name (e.g., "auralytics-speech")
   - Click "Create"

### 2. Enable Speech-to-Text API

1. **Navigate to APIs & Services:**
   - In the left sidebar, click "APIs & Services" > "Library"

2. **Search for Speech-to-Text:**
   - Search for "Cloud Speech-to-Text API"
   - Click on it and then click "Enable"

### 3. Create a Service Account

1. **Go to IAM & Admin:**
   - In the left sidebar, click "IAM & Admin" > "Service Accounts"

2. **Create Service Account:**
   - Click "Create Service Account"
   - Enter a name (e.g., "auralytics-speech-service")
   - Add description: "Service account for Auralytics Speech-to-Text"
   - Click "Create and Continue"

3. **Grant Access:**
   - Click "Select a role"
   - Search for "Cloud Speech-to-Text"
   - Select "Cloud Speech-to-Text User"
   - Click "Continue"

4. **Finish Creation:**
   - Click "Done"

### 4. Generate Service Account Key

1. **Find your service account:**
   - In the Service Accounts list, click on the one you just created

2. **Create key:**
   - Click the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Click "Create"

3. **Download the key:**
   - The JSON file will automatically download
   - Keep this file secure - it contains sensitive credentials

### 5. Configure Streamlit Secrets

1. **Create .streamlit directory:**
   ```bash
   mkdir -p .streamlit
   ```

2. **Create secrets.toml file:**
   ```bash
   touch .streamlit/secrets.toml
   ```

3. **Add your credentials:**
   - Open the downloaded JSON file
   - Copy the entire content
   - Paste it into `.streamlit/secrets.toml` like this:

   ```toml
   GOOGLE_CLOUD_CREDENTIALS = '''
   {
     "type": "service_account",
     "project_id": "your-actual-project-id",
     "private_key_id": "your-actual-private-key-id",
     "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
     "client_email": "your-actual-service-account@your-project-id.iam.gserviceaccount.com",
     "client_id": "your-actual-client-id",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project-id.iam.gserviceaccount.com"
   }
   '''
   ```

### 6. Set Up Billing (Required)

1. **Enable billing:**
   - In Google Cloud Console, go to "Billing"
   - Link a billing account to your project
   - **Note:** Google Cloud Speech-to-Text has a free tier, but billing must be enabled

### 7. Install Dependencies

```bash
pip3 install -r requirements.txt
```

### 8. Test the Application

```bash
streamlit run streamlit_app.py
```

## 🔑 API Pricing & Limits

### Free Tier (First 60 minutes per month):
- **Standard Speech Recognition:** 60 minutes free
- **Enhanced Speech Recognition:** 60 minutes free

### Paid Tier (After free tier):
- **Standard Speech Recognition:** $0.006 per 15 seconds
- **Enhanced Speech Recognition:** $0.009 per 15 seconds

### Rate Limits:
- **Requests per minute:** 1,000
- **Requests per 100 seconds:** 5,000

## 🛠️ Troubleshooting

### Common Issues:

1. **"Permission denied" error:**
   - Ensure the service account has "Cloud Speech-to-Text User" role
   - Check that the API is enabled

2. **"Invalid credentials" error:**
   - Verify the JSON credentials are correctly copied to `secrets.toml`
   - Check that the service account email matches

3. **"Quota exceeded" error:**
   - Check your billing status
   - Monitor usage in Google Cloud Console

4. **Microphone not working:**
   - Ensure microphone permissions are granted to the browser
   - Check if PyAudio is properly installed

### Testing the API:

You can test the API directly in Google Cloud Console:
1. Go to "APIs & Services" > "Speech-to-Text"
2. Click "Try this API"
3. Upload an audio file to test transcription

## 🔒 Security Best Practices

1. **Never commit credentials to version control:**
   - Add `.streamlit/secrets.toml` to `.gitignore`
   - Use environment variables in production

2. **Limit service account permissions:**
   - Only grant necessary roles
   - Use principle of least privilege

3. **Monitor usage:**
   - Set up billing alerts
   - Monitor API usage in Google Cloud Console

4. **Rotate keys regularly:**
   - Generate new service account keys periodically
   - Delete old keys

## 📝 Environment Variables (Alternative)

If you prefer using environment variables instead of Streamlit secrets:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

Then modify the code to use:
```python
import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/path/to/your/service-account-key.json"
```

## 🎯 Next Steps

Once set up, you can:
1. Use voice input in the chat interface
2. Ask questions about your database using speech
3. Get real-time transcription of your voice
4. Enjoy hands-free interaction with the application

The speech-to-text functionality will enhance the user experience by allowing natural voice interaction with your ClickHouse metadata explorer!
