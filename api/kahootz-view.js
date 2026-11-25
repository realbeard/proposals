// Posts a Slack alert when a password-protected proposal is opened or left. Shared by every proposal.
// Needs the SLACK_WEBHOOK_URL environment variable. Does nothing if it is not set.
const TOKEN = '646810e1efc62b6bc78aebd7';

function parseUA(ua = '') {
  const b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Unknown browser';
  const o = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'unknown OS';
  return b + ' on ' + o;
}
function dur(s) { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return m ? m + 'm ' + (s % 60) + 's' : s + 's'; }
function place(h) {
  let city = '', cc = '';
  try { city = decodeURIComponent(h['x-vercel-ip-city'] || ''); } catch (e) {}
  cc = h['x-vercel-ip-country'] || '';
  let country = cc;
  try { if (cc) country = new Intl.DisplayNames(['en-GB'], { type: 'region' }).of(cc) || cc; } catch (e) {}
  return [city, country].filter(Boolean).join(', ') || 'location unknown';
}
function ordinal(n) { return n === 1 ? 'first visit' : 'visit ' + n; }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || b.k !== TOKEN) return res.status(204).end();
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return res.status(204).end();
  const name = String(b.p || 'Proposal').replace(/[^\w .&'-]/g, '').slice(0, 40) || 'Proposal';
  const vid = String(b.v || '').replace(/[^a-z0-9]/gi, '').slice(0, 4);
  const n = Math.min(Math.max(parseInt(b.n, 10) || 1, 1), 999);
  const where = place(req.headers || {}), dev = parseUA((req.headers || {})['user-agent']);
  let text;
  if (b.e === 'open') {
    text = ':eyes: *' + name + ' proposal opened* (' + ordinal(n) + ' from this device)\n' + dev + ' · ' + where + ' · device ' + vid;
  } else if (b.e === 'leave') {
    const s = Math.min(Math.max(parseInt(b.s, 10) || 0, 0), 99), N = Math.min(Math.max(parseInt(b.N, 10) || 0, 0), 99);
    text = ':wave: *' + name + ' proposal viewer left* after ' + dur(Number(b.t) || 0) + ', reached slide ' + s + (N ? ' of ' + N : '') +
      '\n' + ordinal(n) + ' · ' + dev + ' · ' + where + ' · device ' + vid;
  } else return res.status(204).end();
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  } catch (e) { console.error('slack post failed', e && e.message); }
  return res.status(204).end();
};
