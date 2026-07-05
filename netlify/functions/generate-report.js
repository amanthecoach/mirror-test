exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { answers } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('🔴 CONFIGURATION ERROR: ANTHROPIC_API_KEY variable is missing in Netlify.');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No API key found' })
      };
    }

    const prompt = `Write a personal psychological fitness report. Use only "you/your", never assume gender. Plain text only, no asterisks.

Write these 7 sections:

THE MIRROR:
4 sentences about their private vs public self.

THE WOUND:
4 sentences about the root cause of their pattern.

THE HIDDEN FEAR:
3 sentences about their real underlying fear.

WHAT YOUR ENVIRONMENT DID:
4 sentences about inherited beliefs from upbringing.

YOUR IDENTITY STATEMENT:
Start with "I am..." — 2 sentences capturing who they are becoming.

3 DAILY IDENTITY VOTES:
1. [action] — [why]
2. [action] — [why]
3. [action] — [why]

THE ONE TRUTH:
2 sentences. The hardest truth and what becomes possible.

Answers: ${answers.map((a,i) => `Q${i+1}: ${a}`).join(' | ')}`;

    // Using OpenRouter as an unblocked routing proxy endpoint
    const response = await fetch('https://openrouter.ai', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://netlify.com', 
        'X-Title': 'Psychological Report Generator'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`🔴 API CONNECTOR ERROR [Status ${response.status}]:`, responseText);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Endpoint Error ' + response.status + ': ' + responseText.substring(0, 200) })
      };
    }

    const data = JSON.parse(responseText);
    
    // Fixed: Correctly checking OpenRouter's nested text data path array format
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('🔴 DATA SCHEMA ERROR: Unexpected response format:', JSON.stringify(data));
      throw new Error('Unexpected JSON schema return layout.');
    }

    const reportText = data.choices[0].message.content.replace(/\*\*/g, '').replace(/\*/g, '');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: reportText })
    };

  } catch (err) {
    console.error('🔴 EXCEPTION CAUGHT IN NETLIFY HANDLER:', err.stack || err.message || err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Exception: ' + err.message })
    };
  }
};
