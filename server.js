/**
 * SalesSignal — Omi Webhook Server
 * In-person field sales conversation capture → objection analysis → CRM push
 *
 * Built for: D2D solar, roofing, insurance, medical device reps
 * Primary CRM: GoHighLevel (GHL) — also supports generic webhook push
 *
 * Pipeline:
 *   Omi mic → transcript_processed webhook → accumulate → /signal →
 *   Claude analysis → GHL contact update → manager report
 */

const express = require('express');
const { processSalesConversation } = require('./processor');
const { formatSignal } = require('./formatter');
const { pushToGHL } = require('./ghl');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// session store: sessionId → { uid, segments[], startedAt, repName? }
const sessions = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'SalesSignal',
    version: '1.0.0',
    status: 'online',
    activeSessions: sessions.size,
    ghlConnected: !!process.env.GHL_API_KEY,
  });
});

/**
 * Omi webhook — transcript_processed
 * Fires every 5-10s of speech. Accumulate by session_id.
 */
app.post('/webhook', (req, res) => {
  res.status(200).json({ received: true });

  try {
    const { uid, session_id, segments = [], transcript } = req.body;
    if (!session_id) return;

    const text = transcript || segments.map((s) => s.text).join(' ');
    if (!text.trim()) return;

    if (!sessions.has(session_id)) {
      sessions.set(session_id, {
        uid,
        segments: [],
        startedAt: new Date().toISOString(),
      });
    }

    sessions.get(session_id).segments.push({
      text: text.trim(),
      ts: new Date().toISOString(),
    });

    console.log(`[${session_id}] +segment (${sessions.get(session_id).segments.length} total)`);
  } catch (err) {
    console.error('Webhook error:', err.message);
  }
});

/**
 * Generate signal report — HTML output + optional GHL push
 * Body: {
 *   session_id,
 *   rep_name?,
 *   prospect_name?,
 *   product?,          // "solar" | "roofing" | "insurance" | free text
 *   location?,         // city/state helps with localization
 *   ghl_contact_id?,   // GHL contact to update if provided
 *   crm_webhook?       // fallback generic webhook URL
 * }
 */
app.post('/signal', async (req, res) => {
  const {
    session_id,
    rep_name,
    prospect_name,
    product,
    location,
    ghl_contact_id,
    crm_webhook,
  } = req.body;

  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  const session = sessions.get(session_id);
  if (!session || session.segments.length === 0) {
    return res.status(404).json({ error: 'No transcript for this session' });
  }

  const transcript = session.segments.map((s) => s.text).join('\n');

  try {
    const signal = await processSalesConversation(transcript, {
      rep_name: rep_name || 'Rep',
      prospect_name: prospect_name || 'Prospect',
      product: product || 'product',
      location: location || '',
    });

    // Push to GHL if contact ID and API key provided
    if (ghl_contact_id && process.env.GHL_API_KEY) {
      try {
        await pushToGHL(signal, {
          contact_id: ghl_contact_id,
          rep_name,
          prospect_name,
          product,
          session_id,
        });
        console.log(`[${session_id}] GHL push complete`);
      } catch (ghlErr) {
        console.error(`[${session_id}] GHL push failed:`, ghlErr.message);
      }
    }

    // Generic CRM webhook fallback
    if (crm_webhook) {
      try {
        await fetch(crm_webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'salssignal-omi',
            session_id,
            rep: rep_name,
            prospect: prospect_name,
            product,
            outcome: signal.call_outcome,
            next_step: signal.next_step,
            deal_score: signal.deal_score,
            objections: signal.objections?.map((o) => o.objection),
            summary: signal.conversation_summary,
            generated_at: new Date().toISOString(),
          }),
        });
      } catch (webhookErr) {
        console.error(`[${session_id}] CRM webhook failed:`, webhookErr.message);
      }
    }

    const html = formatSignal(signal, {
      session_id,
      rep_name: rep_name || 'Rep',
      prospect_name: prospect_name || 'Prospect',
      product: product || '',
      location: location || '',
      started_at: session.startedAt,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Signal error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * JSON output for custom CRM integrations
 */
app.post('/signal/json', async (req, res) => {
  const { session_id, rep_name, prospect_name, product, location } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  const session = sessions.get(session_id);
  if (!session || session.segments.length === 0) {
    return res.status(404).json({ error: 'No transcript for this session' });
  }

  const transcript = session.segments.map((s) => s.text).join('\n');

  try {
    const signal = await processSalesConversation(transcript, {
      rep_name: rep_name || 'Rep',
      prospect_name: prospect_name || 'Prospect',
      product: product || 'product',
      location: location || '',
    });
    res.json({ session_id, generated_at: new Date().toISOString(), signal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Manager report — aggregates all sessions for a rep across a day
 * Body: { rep_name, date? }   date defaults to today
 */
app.post('/manager-report', async (req, res) => {
  const { rep_name, date } = req.body;
  // In production this would pull from a database
  // For now, returns summary of in-memory sessions
  const repSessions = [];
  for (const [id, data] of sessions.entries()) {
    repSessions.push({
      session_id: id,
      segment_count: data.segments.length,
      started_at: data.startedAt,
    });
  }
  res.json({
    rep_name,
    date: date || new Date().toISOString().split('T')[0],
    sessions_today: repSessions.length,
    sessions: repSessions,
    note: 'Add database persistence for full manager reporting',
  });
});

app.get('/sessions', (req, res) => {
  const list = [];
  for (const [id, data] of sessions.entries()) {
    list.push({ session_id: id, segment_count: data.segments.length, started_at: data.startedAt });
  }
  res.json(list);
});

app.delete('/sessions/:id', (req, res) => {
  res.json({ deleted: sessions.delete(req.params.id) });
});

app.listen(PORT, () => console.log(`SalesSignal running on port ${PORT}`));
