const crypto = require('crypto');

function toB64u(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { name, company, role, stars, message } = body;

  if (!name || !stars || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const starNum = parseInt(stars);
  if (isNaN(starNum) || starNum < 1 || starNum > 5) {
    return res.status(400).json({ error: 'Invalid star rating' });
  }

  const review = {
    name:    String(name).trim(),
    company: String(company || '').trim(),
    role:    String(role    || '').trim(),
    stars:   starNum,
    text:    String(message).trim(),
    date:    new Date().toISOString().slice(0, 7),
  };

  const secret     = process.env.APPROVE_SECRET || 'fallback-secret';
  const payload    = toB64u(JSON.stringify(review));
  const sig        = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token      = `${payload}.${sig}`;
  const siteUrl    = (process.env.SITE_URL || 'https://taskboost.ai').replace(/\/$/, '');
  const approveUrl = `${siteUrl}/api/approve-review?token=${token}`;

  const stars_display = '★'.repeat(review.stars) + '☆'.repeat(5 - review.stars);
  const meta = [review.name, review.company, review.role].filter(Boolean).join(' · ');

  try {
    const emailRes = await fetch('https://api.web3forms.com/submit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: 'fc8de293-5f94-4d3d-b1f8-0367aea00aa3',
        subject:    `New review from ${review.name} — ${review.stars}/5 stars`,
        from_name:  'Taskboost.ai Reviews',
        message: [
          `New review awaiting your approval`,
          ``,
          `From:  ${meta}`,
          `Stars: ${stars_display} (${review.stars}/5)`,
          ``,
          `"${review.text}"`,
          ``,
          `APPROVE AND PUBLISH:`,
          `${approveUrl}`,
          ``,
          `Ignore this email to reject the review.`,
        ].join('\n'),
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Web3Forms error:', emailRes.status, err);
      return res.status(500).json({ error: `Email error ${emailRes.status}` });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('submit-review error:', err);
    return res.status(500).json({ error: err.message });
  }
};
