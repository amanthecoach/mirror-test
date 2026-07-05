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

    // Clean native fetch request structured specifically for Anthropic security verification
    const response = await fetch('https://anthropic.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'User-Agent': 'NetlifyServerlessFunction/1.0' // Prevents Anthropic from routing to marketing HTML
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`🔴 ANTHROPIC API REJECTION [Status ${response.status}]:`, responseText);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'API error ' + response.status + ': ' + responseText.substring(0, 200) })
      };
    }

    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('🔴 REDIRECTION DETECTED: Still received HTML page:', responseText.substring(0, 500));
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'System redirected to HTML landing page.' })
      };
    }

    const data = JSON.parse(responseText);
    
    // Explicit array element extraction layout matching the schema
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('🔴 SCHEMATIC PAYLOAD ERROR: Formatting mismatch:', JSON.stringify(data));
      throw new Error('Unexpected JSON schema return layout.');
    }

    const reportText = data.content[0].text.replace(/\*\*/g, '').replace(/\*/g, '');

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
