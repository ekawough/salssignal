/**
 * GoHighLevel CRM Integration
 * Updates a contact note + pipeline stage based on SalesSignal output
 */

const GHL_BASE = 'https://rest.gohighlevel.com/v1';

/**
 * Push signal data to a GHL contact
 * - Adds a conversation note
 * - Updates custom fields (deal_score, call_outcome, next_step)
 */
async function pushToGHL(signal, meta = {}) {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) throw new Error('GHL_API_KEY not set');
  if (!meta.contact_id) throw new Error('contact_id required');

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // 1. Add conversation note
  const noteBody = {
    body: `[SalesSignal — ${new Date().toLocaleString()}]\n\n${signal.crm_note}\n\nDeal Score: ${signal.deal_score}/100\nOutcome: ${signal.call_outcome}\nNext Step: ${signal.next_step}`,
  };

  const noteRes = await fetch(`${GHL_BASE}/contacts/${meta.contact_id}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify(noteBody),
  });

  if (!noteRes.ok) {
    const err = await noteRes.text();
    throw new Error(`GHL note failed: ${noteRes.status} ${err}`);
  }

  // 2. Update custom fields if they exist in your GHL account
  // Customize field keys to match your GHL custom field IDs
  const customFields = [
    { key: 'deal_score',   field_value: String(signal.deal_score) },
    { key: 'call_outcome', field_value: signal.call_outcome },
    { key: 'next_step',    field_value: signal.next_step || '' },
  ];

  const updateRes = await fetch(`${GHL_BASE}/contacts/${meta.contact_id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ customField: customFields }),
  });

  if (!updateRes.ok) {
    console.warn('GHL custom field update failed (fields may not exist yet):', updateRes.status);
  }

  return { success: true, contact_id: meta.contact_id };
}

module.exports = { pushToGHL };
