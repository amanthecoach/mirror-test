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
        body: JSON.stringify({ error: 'API key not found in environment variables' })
      };
    }

    const QUESTIONS = [
      'If a stranger followed you silently for one week and watched how you treat your body — what would they honestly say about you?',
      'Think about the last time you quit a fitness routine or health goal. Walk me through the 48 hours before you stopped.',
      'What does the private version of you do — the one nobody sees — that the public version would be embarrassed to admit?',
      'Describe the earliest memory you have of feeling like fitness, health, or your body was something that was not for people like you.',
      'If you became completely fit and healthy — what would you actually lose? Think about your relationships, your social life, your identity.',
      'What have you been tolerating about your body or health for so long that you have stopped noticing it?',
      'What messages about health, fitness, or bodies did you absorb from your parents before you were 10 years old?',
      'Name the person in your current life who — without being cruel — makes it hardest for you to stay consistent with your health.',
      'Think of a time in your life when you were most consistent with your health. What did you believe about yourself then that you do not believe now?',
      'Write two sentences: first, what you hope people say at your funeral about how you lived in your body. Second, what they would honestly say if you died today.',
      'Name 3 things your future fully-healthy self would never do. Now honestly answer: did you do any of them in the last 7 days?',
      'Complete this sentence honestly: The real reason I keep stopping is not ___, it is ___.',
    ];

    const phases = [
      'Phase 1 — The Honest Audit',
      'Phase 1 — The Honest Audit',
      'Phase 1 — The Honest Audit',
      'Phase 2 — The Root Cause',
      'Phase 2 — The Root Cause',
      'Phase 2 — The Root Cause',
      'Phase 3 — The Environment Audit',
      'Phase 3 — The Environment Audit',
      'Phase 3 — The Environment Audit',
      'Phase 4 — The Identity Vision',
      'Phase 4 — The Identity Vision',
      'Phase 4 — The Identity Vision',
    ];

    const answersText = QUESTIONS.map((q, i) =>
      'Q' + (i+1) + ' [' + phases[i] + ']: ' + q + '\nAnswer: ' + (answers[i] || '(skipped)')
    ).join('\n\n');

    const prompt = `You are a deep psychological coach writing a personal Mirror Test report. A person has answered 12 honest questions about their relationship with fitness and their body. Write their personal report — specific, penetrating, built entirely from their actual answers. Not a template.

THE MIRROR: What you see in this person — their private vs public self, the gap between who they present and who they are. 3-4 sentences.

THE WOUND: The specific root cause — the moment, belief, or experience that started this pattern. How it connects to their behaviour today. 3-4 sentences.

THE HIDDEN FEAR: What they are actually afraid of — almost certainly not failure. Name it precisely. 2-3 sentences.

WHAT YOUR ENVIRONMENT DID: How their parents and current social circle shaped their relationship with their body. 3-4 sentences.

YOUR IDENTITY STATEMENT: A single powerful "I am" statement specific to their answers.

3 DAILY IDENTITY VOTES: Three specific daily actions. Format: 1. [action] — [why]. One line each.

THE ONE TRUTH: The single most important thing they need to hear. 1-2 sentences. Make it land.

Their answers:

${answersText}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Anthropic error ' + response.status + ': ' + responseText })
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
