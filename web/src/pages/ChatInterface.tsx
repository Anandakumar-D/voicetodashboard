import { useState, useRef } from 'react'
import { Send, MessageSquare, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

interface ChatMessage {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Hello! I can help you query your data using natural language. You can type your questions or use the microphone button for voice input. Try asking something like "Show me the top 10 users by activity"',
      isUser: false,
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState('')
  
  // Speech recognition setup
  const recognitionRef = useRef<any>(null)
  
  // Initialize speech recognition
  const initSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'
      
      recognitionRef.current.onstart = () => {
        setIsListening(true)
        setTranscript('')
      }
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        setTranscript(finalTranscript + interimTranscript)
      }
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
        if (transcript.trim()) {
          setInputText(transcript)
          setTranscript('')
        }
      }
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      // Call the MindsDB MCP agent function
      const response = await fetch('/.netlify/functions/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          naturalLanguageQuery: inputText,
          connectionId: '1', // TODO: Get from selected connection
          organizationId: 'demo-org',
          userId: 'demo-user'
        })
      })

      if (response.ok) {
        const result = await response.json()
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `✅ Query executed successfully!\n\n**Generated SQL:**\n\`\`\`sql\n${result.sql}\n\`\`\`\n\n**Results:** ${result.rowCount} rows returned\n\n${result.result.length > 0 ? 'First few rows:\n' + JSON.stringify(result.result.slice(0, 3), null, 2) : 'No data returned'}`,
          isUser: false,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        const error = await response.json()
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `❌ Error: ${error.error || 'Failed to process query'}\n\nThis might be because:\n- No data source connections are configured\n- The connection is not working\n- The query couldn't be converted to SQL\n\nTry adding a data source connection first!`,
          isUser: false,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `❌ Connection error: ${error}\n\nMake sure:\n1. MindsDB is running (http://localhost:47334)\n2. You have added data source connections\n3. The Netlify functions are deployed`,
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      initSpeechRecognition()
    }
    
    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      recognitionRef.current?.start()
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Chat Interface</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ask questions about your data in natural language
        </p>
      </div>

      <div className="card">
        <div className="card-content">
          <div className="flex flex-col h-96">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isUser
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.isUser ? 'text-primary-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your data..."
                  className="input pr-20"
                  disabled={isLoading}
                />
                
                {/* Speech-to-text indicator */}
                {isListening && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    <div className="animate-pulse flex space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <span className="text-xs text-gray-500">Listening...</span>
                  </div>
                )}
                
                {/* Transcript preview */}
                {transcript && (
                  <div className="absolute -top-8 left-0 right-0 bg-blue-50 border border-blue-200 rounded px-2 py-1 text-xs text-blue-700">
                    {transcript}
                  </div>
                )}
              </div>
              
              {/* Voice input button */}
              <button
                onClick={toggleSpeechRecognition}
                disabled={isLoading}
                className={`btn ${isListening ? 'btn-primary' : 'btn-secondary'} px-3`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
              
              {/* Mute/Unmute button */}
              <button
                onClick={toggleMute}
                className={`btn btn-secondary px-3`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              
              {/* Send button */}
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputText.trim()}
                className="btn btn-primary"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Example queries */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Example Queries</h3>
          <p className="card-description">
            Try these natural language queries
          </p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Show me the top 10 users by activity',
              'What are the most common event types?',
              'How many users signed up last month?',
              'Find users with high engagement scores'
            ].map((query, index) => (
              <button
                key={index}
                onClick={() => setInputText(query)}
                className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm text-gray-900">{query}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
