/**
 * SalesSignal HTML Formatter
 * Sales-focused deal card with score, objections, coaching notes
 */

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function scoreMeter(score) {
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#f97316' : '#dc2626';
  const label = score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold';
  return `
    <div class="score-meter">
      <div class="score-number" style="color:${color}">${score}</div>
      <div class="score-label">Deal Score</div>
      <div class="score-bar-track">
        <div class="score-bar-fill" style="width:${score}%;background:${color}"></div>
      </div>
      <div class="score-tag" style="background:${color}">${label}</div>
    </div>`;
}

function outcomeBadge(outcome) {
  const map = {
    closed:               { c: '#16a34a', l: '✅ Closed' },
    appointment_set:      { c: '#2563eb', l: '📅 Appt Set' },
    pitched:              { c: '#7c3aed', l: '📢 Pitched' },
    demo_done:            { c: '#0ea5e9', l: '🎯 Demo Done' },
    callback_scheduled:   { c: '#f97316', l: '📞 Callback Scheduled' },
    not_interested:       { c: '#6b7280', l: '❌ Not Interested' },
    not_home:             { c: '#9ca3af', l: '🚪 Not Home' },
  };
  const s = map[outcome] || { c: '#6b7280', l: outcome };
  return `<span style="background:${s.c};color:#fff;padding:5px 14px;border-radius:9999px;font-size:13px;font-weight:700">${s.l}</span>`;
}

function strengthDot(strength) {
  return strength === 'strong' ? '🟢' : strength === 'moderate' ? '🟡' : '🔴';
}

function section(title, content) {
  if (!content) return '';
  return `<div class="section"><div class="section-title">${title}</div>${content}</div>`;
}

function formatSignal(signal, meta = {}) {
  const now = new Date().toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  // Buying signals
  const buyingSignalsHtml = (signal.buying_signals || []).length > 0
    ? `<ul class="signal-list">${signal.buying_signals.map((s) =>
        `<li>${strengthDot(s.strength)} ${esc(s.signal)}</li>`).join('')}</ul>`
    : null;

  // Objections
  const objectionsHtml = (signal.objections || []).length > 0
    ? signal.objections.map((o) => `
      <div class="objection-card">
        <div class="objection-header">
          <span class="obj-cat">${esc(o.category)}</span>
          <span class="obj-resolved" style="color:${o.resolved ? '#16a34a' : '#dc2626'}">${o.resolved ? '✓ Handled' : '✗ Unresolved'}</span>
        </div>
        <div class="obj-text">"${esc(o.objection)}"</div>
        ${o.how_handled ? `<div class="obj-handled">Rep said: <em>${esc(o.how_handled)}</em></div>` : ''}
        ${o.suggested_response ? `<div class="obj-suggest">💡 Better response: ${esc(o.suggested_response)}</div>` : ''}
      </div>`).join('')
    : null;

  // Rep coaching
  const repHtml = (signal.rep_performance && (signal.rep_performance.strengths?.length || signal.rep_performance.improvements?.length))
    ? `<div class="coaching-grid">
        ${signal.rep_performance.strengths?.length ? `
        <div>
          <div class="coaching-label" style="color:#16a34a">✅ What worked</div>
          <ul class="coaching-list">${signal.rep_performance.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </div>` : ''}
        ${signal.rep_performance.improvements?.length ? `
        <div>
          <div class="coaching-label" style="color:#f97316">📈 Improve next time</div>
          <ul class="coaching-list">${signal.rep_performance.improvements.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        </div>` : ''}
      </div>`
    : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SalesSignal — ${esc(meta.prospect_name)} — ${esc(meta.session_id)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #faf5ff; color: #1e293b; padding: 24px; }
    .page { max-width: 860px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #1e1b4b; color: #fff; padding: 28px 36px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .header p { color: #a5b4fc; font-size: 13px; }
    .meta-bar { background: #312e81; padding: 14px 36px; display: flex; gap: 32px; flex-wrap: wrap; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-label { color: #a5b4fc; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
    .meta-value { color: #e0e7ff; font-size: 13px; font-weight: 600; }
    .body { padding: 32px 36px; }
    .top-row { display: grid; grid-template-columns: auto 1fr; gap: 28px; align-items: start; margin-bottom: 28px; }
    .score-meter { text-align: center; min-width: 110px; }
    .score-number { font-size: 48px; font-weight: 800; line-height: 1; }
    .score-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin: 4px 0 8px; }
    .score-bar-track { background: #e5e7eb; border-radius: 9999px; height: 8px; width: 100%; }
    .score-bar-fill { height: 8px; border-radius: 9999px; transition: width 0.3s; }
    .score-tag { display: inline-block; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 9999px; margin-top: 8px; }
    .top-right { display: flex; flex-direction: column; gap: 14px; }
    .status-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .summary-box { background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 14px 18px; border-radius: 0 8px 8px 0; font-size: 14px; color: #374151; line-height: 1.6; }
    .next-step-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; }
    .next-step-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
    .next-step-text { font-size: 15px; font-weight: 600; color: #15803d; }
    .next-step-deadline { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
    .signal-list { list-style: none; }
    .signal-list li { padding: 8px 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f1f5f9; }
    .signal-list li:last-child { border-bottom: none; }
    .objection-card { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
    .objection-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .obj-cat { background: #78716c; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
    .obj-resolved { font-size: 12px; font-weight: 600; }
    .obj-text { font-size: 14px; color: #1c1917; font-style: italic; margin-bottom: 8px; }
    .obj-handled { font-size: 13px; color: #57534e; margin-bottom: 6px; }
    .obj-suggest { font-size: 13px; color: #2563eb; background: #eff6ff; border-radius: 6px; padding: 8px 10px; }
    .coaching-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .coaching-label { font-size: 12px; font-weight: 700; margin-bottom: 8px; }
    .coaching-list { list-style: none; }
    .coaching-list li { padding: 6px 0; font-size: 13px; color: #374151; border-bottom: 1px solid #f1f5f9; }
    .coaching-list li:last-child { border-bottom: none; }
    .script-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 18px; font-size: 14px; color: #1e3a5f; line-height: 1.7; white-space: pre-wrap; }
    .crm-note-box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; font-size: 13px; color: #374151; line-height: 1.6; }
    .prospect-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
    .info-card .label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
    .info-card .value { font-size: 13px; color: #374151; }
    .pain-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .pain-tag { border: 1.5px solid #dc2626; color: #dc2626; border-radius: 9999px; padding: 3px 10px; font-size: 12px; }
    .footer { border-top: 1px solid #e5e7eb; padding: 16px 36px; display: flex; justify-content: space-between; color: #9ca3af; font-size: 11px; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <h1>SalesSignal</h1>
      <p>Field conversation analysis · Powered by Omi AI + Claude</p>
    </div>
    <div style="text-align:right">
      <div style="font-family:monospace;color:#a5b4fc;font-size:12px">Session: ${esc(meta.session_id)}</div>
      <div style="color:#a5b4fc;font-size:12px;margin-top:4px">${esc(now)}</div>
    </div>
  </div>

  <div class="meta-bar">
    <div class="meta-item"><span class="meta-label">Rep</span><span class="meta-value">${esc(meta.rep_name)}</span></div>
    <div class="meta-item"><span class="meta-label">Prospect</span><span class="meta-value">${esc(meta.prospect_name)}</span></div>
    ${meta.product ? `<div class="meta-item"><span class="meta-label">Product</span><span class="meta-value">${esc(meta.product)}</span></div>` : ''}
    ${meta.location ? `<div class="meta-item"><span class="meta-label">Location</span><span class="meta-value">${esc(meta.location)}</span></div>` : ''}
  </div>

  <div class="body">
    <!-- Score + Summary -->
    <div class="top-row">
      ${scoreMeter(signal.deal_score || 0)}
      <div class="top-right">
        <div class="status-row">${outcomeBadge(signal.call_outcome)}</div>
        ${signal.conversation_summary ? `<div class="summary-box">${esc(signal.conversation_summary)}</div>` : ''}
      </div>
    </div>

    <!-- Next step -->
    ${signal.next_step ? `
    <div class="next-step-box" style="margin-bottom:28px">
      <div class="next-step-label">⚡ Next Step</div>
      <div class="next-step-text">${esc(signal.next_step)}</div>
      ${signal.next_step_deadline ? `<div class="next-step-deadline">📅 ${esc(signal.next_step_deadline)}</div>` : ''}
    </div>` : ''}

    <!-- Buying signals -->
    ${buyingSignalsHtml ? section('📈 Buying Signals', buyingSignalsHtml) : ''}

    <!-- Objections -->
    ${objectionsHtml ? section('🛑 Objections', objectionsHtml) : ''}

    <!-- Prospect info -->
    ${signal.prospect_info ? section('👤 Prospect Profile', `
      <div class="prospect-grid">
        ${signal.prospect_info.timeline ? `<div class="info-card"><div class="label">Decision Timeline</div><div class="value">${esc(signal.prospect_info.timeline)}</div></div>` : ''}
        ${signal.decision_makers?.notes ? `<div class="info-card"><div class="label">Decision Makers</div><div class="value">${esc(signal.decision_makers.notes)}</div></div>` : ''}
        ${signal.prospect_info.household_size ? `<div class="info-card"><div class="label">Household</div><div class="value">${esc(signal.prospect_info.household_size)}</div></div>` : ''}
        ${signal.competitor_mentions?.length ? `<div class="info-card"><div class="label">Competitor Mentions</div><div class="value">${signal.competitor_mentions.map(esc).join(', ')}</div></div>` : ''}
      </div>
      ${signal.prospect_info.pain_points?.length ? `
      <div style="margin-top:12px">
        <div class="info-card"><div class="label">Pain Points</div>
          <div class="pain-tags">${signal.prospect_info.pain_points.map((p) => `<span class="pain-tag">${esc(p)}</span>`).join('')}</div>
        </div>
      </div>` : ''}
    `) : ''}

    <!-- Rep coaching -->
    ${repHtml ? section('🎯 Coaching Notes', repHtml) : ''}

    <!-- Follow-up script -->
    ${signal.follow_up_script ? section('📞 Follow-Up Script / Voicemail', `<div class="script-box">${esc(signal.follow_up_script)}</div>`) : ''}

    <!-- CRM note -->
    ${signal.crm_note ? section('📋 CRM Note (ready to paste into GHL)', `<div class="crm-note-box">${esc(signal.crm_note)}</div>`) : ''}
  </div>

  <div class="footer">
    <span>SalesSignal · Powered by Omi AI + Claude</span>
    <span>salssignal.app</span>
  </div>
</div>
</body>
</html>`;
}

module.exports = { formatSignal };
