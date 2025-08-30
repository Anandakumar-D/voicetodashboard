#!/usr/bin/env python3
"""
Test script to verify Gemini API integration.
"""

import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai


def response_to_text(response) -> str:
    """Robustly extract text from google-generativeai responses."""
    texts = []

    # New SDK shape: response.candidates[*].content.parts[*].text
    try:
        if getattr(response, "candidates", None):
            for cand in response.candidates:
                content = getattr(cand, "content", None)
                if content and getattr(content, "parts", None):
                    for p in content.parts:
                        t = getattr(p, "text", None)
                        if isinstance(t, str) and t.strip():
                            texts.append(t.strip())
    except Exception:
        pass
    
    # Fallback for older SDK shapes or different response formats
    if not texts and getattr(response, "parts", None):
        for p in response.parts:
            t = getattr(p, "text", None)
            if isinstance(t, str) and t.strip():
                texts.append(t.strip())

    return "\n".join(texts).strip()


def test_gemini_connection():
    """Test the Gemini API connection."""
    print("Testing Gemini API Connection")
    print("=" * 35)
    
    # Load environment variables
    load_dotenv()
    
    # Check if API key exists
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in .env file!")
        print("Please add your Gemini API key to the .env file")
        return False
    
    try:
        # Configure Gemini
        model_name = os.getenv('GEMINI_MODEL')
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        
        # Test with a simple prompt
        test_prompt = "Hello! Please respond with 'Gemini API is working correctly' if you can see this message."
        response = model.generate_content(test_prompt)
        
        print(f"✅ Gemini API connection successful with model: {model_name}!")
        
        response_text = response_to_text(response)
        print(f"Response: {response_text}")
        
        # Test column definition generation
        print("\nTesting column definition generation...")
        column_prompt = """
        Analyze this database column and provide a clear, concise definition of what this column likely represents.
        
        Database: test_db
        Schema: default
        Table: users
        Column Name: email_address
        Column Type: String
        
        Please provide a brief, professional definition (1-2 sentences) explaining what this column likely stores or represents based on its name and data type. Focus on the business meaning rather than technical details.
        
        Definition:"""
        
        response = model.generate_content(column_prompt)
        print(f"✅ Column definition test successful!")
        
        response_text = response_to_text(response)
        print(f"Generated definition: {response_text}")
        
        return True
        
    except Exception as e:
        print(f"❌ Gemini API connection failed: {e}")
        print("\nTroubleshooting tips:")
        print("1. Check if your API key is correct")
        print("2. Ensure you have sufficient quota")
        print("3. Check your internet connection")
        return False


if __name__ == "__main__":
    success = test_gemini_connection()
    sys.exit(0 if success else 1)
