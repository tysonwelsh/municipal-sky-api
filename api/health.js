// /api/health.js
// Health check endpoint to verify API connections

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
    // Check if API keys are configured
    const claudeConfigured = !!process.env.CLAUDE_API_KEY;
    const geminiConfigured = !!process.env.GEMINI_API_KEY;

    // Simple connection test for Claude
    let claudeWorking = false;
    if (claudeConfigured) {
      try {
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }]
          })
        });
        
        claudeWorking = claudeResponse.status === 200;
      } catch (error) {
        console.error('Claude health check failed:', error);
        claudeWorking = false;
      }
    }

    // Simple connection test for Gemini
    let geminiWorking = false;
    if (geminiConfigured) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hi' }] }],
              generationConfig: { maxOutputTokens: 10 }
            })
          }
        );
        
        geminiWorking = geminiResponse.status === 200;
      } catch (error) {
        console.error('Gemini health check failed:', error);
        geminiWorking = false;
      }
    }

    res.status(200).json({
      claude: claudeWorking,
      gemini: geminiWorking,
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