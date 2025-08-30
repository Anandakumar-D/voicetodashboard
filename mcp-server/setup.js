const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setupMCP() {
  console.log('🚀 MindsDB MCP Server Setup\n')
  console.log('This script will help you configure the MindsDB MCP server.\n')

  // Check if .env file exists
  const envPath = path.join(__dirname, '.env')
  const envExists = fs.existsSync(envPath)

  if (envExists) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ')
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.')
      rl.close()
      return
    }
  }

  console.log('\n📋 Please provide the following information:\n')

  // Get MindsDB API key
  const apiKey = await question('1. MindsDB API Key (get from https://cloud.mindsdb.com): ')
  
  if (!apiKey.trim()) {
    console.log('❌ API key is required. Setup cancelled.')
    rl.close()
    return
  }

  // Get MindsDB host (optional)
  const host = await question('2. MindsDB Host (press Enter for default https://cloud.mindsdb.com): ')
  const mindsdbHost = host.trim() || 'https://cloud.mindsdb.com'

  // Get environment
  const env = await question('3. Environment (development/production) [development]: ')
  const nodeEnv = env.trim() || 'development'

  // Get port
  const port = await question('4. Server Port [3001]: ')
  const serverPort = port.trim() || '3001'

  // Get log level
  const logLevel = await question('5. Log Level (error/warn/info/debug) [info]: ')
  const logLevelValue = logLevel.trim() || 'info'

  // Create .env content
  const envContent = `# MindsDB Configuration
MINDSDB_HOST=${mindsdbHost}
MINDSDB_API_KEY=${apiKey}

# Server Configuration
NODE_ENV=${nodeEnv}
PORT=${serverPort}

# Logging
LOG_LEVEL=${logLevelValue}
`

  // Write .env file
  try {
    fs.writeFileSync(envPath, envContent)
    console.log('\n✅ .env file created successfully!')
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message)
    rl.close()
    return
  }

  // Install dependencies
  console.log('\n📦 Installing dependencies...')
  const { execSync } = require('child_process')
  
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname })
    console.log('✅ Dependencies installed successfully!')
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message)
    rl.close()
    return
  }

  // Test connection
  console.log('\n🧪 Testing MindsDB connection...')
  try {
    const { testMindsDBConnection } = require('./test.js')
    const testResult = await testMindsDBConnection()
    
    if (testResult) {
      console.log('\n🎉 Setup completed successfully!')
      console.log('\n📝 Next steps:')
      console.log('1. Start the server: npm start')
      console.log('2. Test the server: node test.js')
      console.log('3. Integrate with Auralytics frontend')
    } else {
      console.log('\n⚠️  Setup completed but connection test failed.')
      console.log('Please check your MindsDB API key and try again.')
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
  }

  rl.close()
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupMCP().catch(console.error)
}

module.exports = { setupMCP }
