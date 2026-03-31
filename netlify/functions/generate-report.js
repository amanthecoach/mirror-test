exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { answers } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'API error ' + response.status + ': ' + responseText.substring(0, 200) })
      };
    }

    const data = JSON.parse(responseText);
    const reportText = data.content[0].text;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: reportText })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Exception: ' + err.message })
    };
  }
};
