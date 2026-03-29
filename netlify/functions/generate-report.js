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

    const prompt = `You are a world-class psychological coach writing a personal Mirror Test report. Write in warm, direct prose. No asterisks. No markdown. No bullet points inside sections. Use only "you" and "your" — never assume gender.

Write exactly these 7 sections with these exact labels:

THE MIRROR:
4-5 sentences. Describe who this person is in private versus who they show the world. Name the gap. Reference specific things they said. Make them feel seen.

THE WOUND:
4-5 sentences. Name the specific origin of this pattern. How did it become a belief? How does it show up in their fitness life today? Be compassionate but precise.

THE HIDDEN FEAR:
3-4 sentences. Name the real fear underneath — not the surface one. The fear that makes success feel dangerous. Name what it has cost them.

WHAT YOUR ENVIRONMENT DID:
4-5 sentences. Name the specific beliefs inherited from their upbringing and social circle. What did their environment reward and punish? Show how much of their behaviour is inherited, not chosen.

YOUR IDENTITY STATEMENT:
2-3 sentences starting with "I am..." Capture exactly who they are becoming. Make it specific to their answers, not generic. Something they want to read every morning.

3 DAILY IDENTITY VOTES:
Three practices tied directly to their answers. Format exactly as:
1. [One sentence action] — [One sentence why it matters for them specifically]
2. [One sentence action] — [One sentence why it matters for them specifically]
3. [One sentence action] — [One sentence why it matters for them specifically]

THE ONE TRUTH:
2-3 sentences. The most important thing they need to hear. Start with the hardest truth. End with what becomes possible when they accept it.

Their answers:
${JSON.stringify(answers, null, 2)}

Write the complete report now. Be specific. Be honest. Be compassionate.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
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
