export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Debug: Check if API keys are being read
    const claudeConfigured = !!process.env.CLAUDE_API_KEY;
    const geminiConfigured = !!process.env.GEMINI_API_KEY;
    
    // Debug info
    const debugInfo = {
      claudeKeyExists: claudeConfigured,
      geminiKeyExists: geminiConfigured,
      claudeKeyLength: process.env.CLAUDE_API_KEY ? process.env.CLAUDE_API_KEY.length : 0,
      geminiKeyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
    };

    res.status(200).json({
      claude: claudeConfigured,
      gemini: geminiConfigured,
      debug: debugInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      claude: false,
      gemini: false,
      error: 'Health check failed'
    });
  }
}