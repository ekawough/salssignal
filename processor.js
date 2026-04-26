/**
 * SalesSignal Processor
 * Claude analyzes an in-person field sales conversation
 * Extracts: deal score, objections + responses, buying signals, next step
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a field sales intelligence specialist for D2D and in-person sales teams.

Your job is to analyze a raw transcript from a field sales rep's conversation with a prospect and extract structured deal intelligence.

This could be: a door-to-door solar pitch, a roofing estimate appointment, an insurance enrollment, a medical device demo, or any in-person business-to-consumer or SMB sale.

The transcript may be rough and conversational. Extract meaning from it, even if the rep is talking over background noise, kids, dogs, or an awkward homeowner.

Return a JSON object with this exact structure:

{
  "conversation_summary": "2-3 sentences describing what happened in the conversation",
  "deal_score": 0-100,
  "deal_score_reason": "Why you gave this score",
  "call_outcome": "pitched | appointment_set | closed | not_home | not_interested | callback_scheduled | demo_done",
  "next_step": "exact next action the rep needs to take",
  "next_step_deadline": "When the next step should happen — e.g. 'tomorrow morning', '3pm Thursday' — null if not mentioned",
  "buying_signals": [
    {
      "signal": "What the prospect said or did that showed interest",
      "strength": "strong | moderate | weak"
    }
  ],
  "objections": [
    {
      "objection": "Exact objection raised by prospect",
      "category": "price | timing | trust | product | competition | not_interested | other",
      "how_handled": "What the rep said in response — null if not handled",
      "resolved": true,
      "suggested_response": "A better response the rep could use next time"
    }
  ],
  "competitor_mentions": [
    "Any competitor or alternative mentioned by prospect"
  ],
  "decision_makers": {
    "present": true,
    "notes": "Who was there, who wasn't, who makes the call"
  },
  "prospect_info": {
    "name": "Prospect name if mentioned",
    "household_size": "Any family context",
    "homeowner": true,
    "pain_points": ["Key pain points the prospect expressed"],
    "timeline": "Any timeline they mentioned for a decision"
  },
  "rep_performance": {
    "strengths": ["Things the rep did well"],
    "improvements": ["Specific coaching notes for this conversation"]
  },
  "follow_up_script": "A short, specific follow-up script or voicemail the rep can use for their next contact with this prospect. Reference specific things from the conversation.",
  "crm_note": "A clean, professional CRM note summarizing this interaction — 2-3 sentences, ready to paste into GoHighLevel or Salesforce"
}

Rules:
- deal_score: 0 = door slammed, 50 = engaged but not moving, 100 = signed on the spot
- objections.resolved should be true only if the prospect ACCEPTED the response
- suggested_response should be tactful, not pushy — match the tone of the conversation
- rep_performance.improvements should be specific and constructive, not harsh
- Return valid JSON only — no markdown, no explanation
`;

async function processSalesConversation(transcript, context = {}) {
  const userMessage = `
Rep: ${context.rep_name}
Prospect: ${context.prospect_name}
Product: ${context.product}
Location: ${context.location || 'Not specified'}

Conversation Transcript:
---
${transcript}
---

Analyze this field sales conversation and return the structured deal signal.
`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  let raw = response.content[0].text.trim();
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

  return JSON.parse(raw);
}

module.exports = { processSalesConversation };
