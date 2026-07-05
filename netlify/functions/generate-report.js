exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { answers } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('🔴 CONFIGURATION ERROR: ANTHROPIC_API_KEY environment variable is completely missing or blank in the Netlify Dashboard.');
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

    const response = await fetch('https://anthropic.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`🔴 ANTHROPIC API ERROR [Status ${response.status}]:`, responseText);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'API error ' + response.status + ': ' + responseText.substring(0, 200) })
      };
    }

    // 🔥 SAFE CHECK: See if the response is secretly HTML before parsing
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('🔴 INTERCEPTION WARNING: Received HTML instead of JSON. Printing the raw intercepted payload summary below:');
      console.error(responseText.substring(0, 1000)); // Logs the first 1000 characters of the HTML page
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Interception Error: Network returned HTML instead of API data.' })
      };
    }

    const data = JSON.parse(responseText);
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('🔴 RESPONSE STRUCTURING ERROR: Received unexpected format from Anthropic:', JSON.stringify(data));
      throw new Error('Unexpected Anthropic API response format structure.');
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
