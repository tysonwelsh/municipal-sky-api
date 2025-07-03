// /api/chat.js
// Main chat endpoint that calls both Claude and Gemini APIs

const SYSTEM_PROMPT = `The user will input a description of a sound, creature, object, event or some other entity. The assistant will output an onomatopoeia which accurately transcribes the sound made by what is described in the input into text form. The onomatopoeias in the output must be inventive, modernist, and realist in style; influenced by James Joyce. Examples of desired input/output taken from the works of James Joyce include: cat - Mrkgnao, fart - Pprrpffrrppffff, Tram - Tram kran kran kran. Krandlkrankran, Printing press - Sllt. The assistant must include only onomatopoeia in the output, with no additional text or extraneous information.`;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Message too long' });
    }

    // Call both APIs in parallel
    const [claudeResult, geminiResult] = await Promise.allSettled([
      callClaude(message),
      callGemini(message)
    ]);

    const response = {
      claude: claudeResult.status === 'fulfilled' ? claudeResult.value : {
        success: false,
        message: claudeResult.reason?.message || 'Claude API failed'
      },
      gemini: geminiResult.status === 'fulfilled' ? geminiResult.value : {
        success: false,
        message: geminiResult.reason?.message || 'Gemini API failed'
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      claude: { success: false, message: 'Server error' },
      gemini: { success: false, message: 'Server error' }
    });
  }
}

async function callClaude(userMessage) {
  if (!process.env.CLAUDE_API_KEY) {
    return { success: false, message: 'Claude API key not configured' };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', response.status, errorData);
      return { 
        success: false, 
        message: `Claude API error: ${response.status}` 
      };
    }

    const data = await response.json();
    
    if (data.content && data.content.length > 0 && data.content[0].text) {
      return {
        success: true,
        message: data.content[0].text.trim()
      };
    } else {
      return { 
        success: false, 
        message: 'Invalid response from Claude API' 
      };
    }

  } catch (error) {
    console.error('Claude API call failed:', error);
    return { 
      success: false, 
      message: 'Failed to connect to Claude API' 
    };
  }
}

async function callGemini(userMessage) {
  if (!process.env.GEMINI_API_KEY) {
    return { success: false, message: 'Gemini API key not configured' };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${SYSTEM_PROMPT}\n\nUser: ${userMessage}` }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.9
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', response.status, errorData);
      return { 
        success: false, 
        message: `Gemini API error: ${response.status}` 
      };
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && data.candidates[0].content.parts &&
        data.candidates[0].content.parts.length > 0) {
      return {
        success: true,
        message: data.candidates[0].content.parts[0].text.trim()
      };
    } else {
      return { 
        success: false, 
        message: 'Invalid response from Gemini API' 
      };
    }

  } catch (error) {
    console.error('Gemini API call failed:', error);
    return { 
      success: false, 
      message: 'Failed to connect to Gemini API' 
    };
  }
}