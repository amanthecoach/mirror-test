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

    const prompt = `You are a world-class psychological coach writing a deep, personal Mirror Test report. This person has answered 12 brutally honest questions. Your job is to write a report so specific, so penetrating, and so human that they feel completely seen — perhaps for the first time. Every word must be earned. Every sentence must land.

Write in warm but direct prose. No bullet points inside sections. No asterisks. No markdown. Just plain text with the exact section labels below.

Write exactly these 7 sections:

THE MIRROR:
Write 7-8 sentences. Describe exactly who this person is in private versus who they show the world. Name the gap precisely. Talk about what they do when no one is watching. Describe the specific self-sabotage patterns visible in their answers. Make them feel like you have been watching them for years. Reference specific things they said.

THE WOUND:
Write 7-8 sentences. Go deep into the origin story. What specific moment, message, or environment created this pattern? How did that wound become a belief? How did that belief become a behaviour? How does that behaviour show up in their fitness life today? Connect the dots clearly and compassionately. This section should make them pause and re-read.

THE HIDDEN FEAR:
Write 5-6 sentences. Name the fear they have never said out loud. Not the surface fear — the real one underneath. The fear that makes success feel dangerous. Explain why this fear makes perfect sense given their history. Then name what it has cost them.

WHAT YOUR ENVIRONMENT DID:
Write 7-8 sentences. Describe the specific programming they received from their parents, their social circle, and their environment. Name the beliefs they inherited without choosing them. Explain how those beliefs became their defaults. Be specific about what their environment rewarded and what it punished. Show them how much of their behaviour is inherited, not chosen.

YOUR IDENTITY STATEMENT:
Write 4-5 sentences. This is not a generic affirmation. This is a specific declaration of who they are becoming based on everything you have found in their answers. Start with "I am..." and then expand it into a full paragraph that captures their emerging identity. Make it feel earned, not generic. Make it something they want to save and read every morning.

3 DAILY IDENTITY VOTES:
Write 3 specific daily practices. Each one must be directly tied to something you found in their answers. For each one write: the action (1 sentence), then why it specifically matters for this person (2-3 sentences explaining the psychological reason behind it). Format as:
1. [Action] — [2-3 sentence explanation]
2. [Action] — [2-3 sentence explanation]
3. [Action] — [2-3 sentence explanation]

THE ONE TRUTH:
Write 4-5 sentences. This is the most important thing they need to hear. Not a motivational quote — a specific truth about this specific person. Start with the hardest thing to say. Then soften it with compassion. Then end with what becomes possible when they accept it. This section should stay with them for weeks.

Here are their answers to the 12 questions:
${JSON.stringify(answers, null, 2)}

Write the full report now. Be specific. Be honest. Be compassionate. Do not be generic. Every sentence should feel like it was written only for this person.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1450,
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
