// /api/feedback.js
// Endpoint to collect user feedback on AI responses

import { kv } from '@vercel/kv';

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
    const { user_message, claude_response, gemini_response, preference_rating } = req.body;

    // Validate input
    if (!user_message || !preference_rating) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: user_message, preference_rating' 
      });
    }

    if (!Number.isInteger(preference_rating) || preference_rating < 1 || preference_rating > 7) {
      return res.status(400).json({ 
        success: false, 
        error: 'preference_rating must be an integer between 1 and 7' 
      });
    }

    // Create feedback record
    const feedbackRecord = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      user_message: user_message.substring(0, 500), // Limit length
      claude_response: claude_response ? claude_response.substring(0, 200) : null,
      gemini_response: gemini_response ? gemini_response.substring(0, 200) : null,
      preference_rating: preference_rating,
      // Add some basic analytics
      session_id: req.headers['x-forwarded-for'] || 'unknown', // Simple session tracking
    };

    // Store in Vercel KV (if available) or just log
    try {
      if (typeof kv !== 'undefined') {
        await kv.lpush('feedback', JSON.stringify(feedbackRecord));
        await kv.expire('feedback', 60 * 60 * 24 * 30); // 30 days retention
      } else {
        // Fallback: just log to console (for development)
        console.log('Feedback received:', feedbackRecord);
      }
    } catch (kvError) {
      // If KV fails, still log the feedback
      console.log('KV storage failed, logging feedback:', feedbackRecord);
    }

    // Also maintain simple analytics
    try {
      if (typeof kv !== 'undefined') {
        // Increment counters
        await kv.incr('analytics:total_feedback');
        await kv.incr(`analytics:rating_${preference_rating}`);
        
        // Track preferences
        if (preference_rating <= 3) {
          await kv.incr('analytics:prefer_claude');
        } else if (preference_rating >= 5) {
          await kv.incr('analytics:prefer_gemini');
        } else {
          await kv.incr('analytics:neutral');
        }
      }
    } catch (analyticsError) {
      console.log('Analytics update failed:', analyticsError);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Feedback recorded successfully',
      id: feedbackRecord.id
    });

  } catch (error) {
    console.error('Feedback API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}