// api/submit-review.js
// Receives review form data, creates a signed approval token,
// and sends an approval email via Web3Forms.

const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, company, role, stars, message } = req.body || {};

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
    date:    new Date().toISOString().slice(0, 7), // YYYY-MM
  };

  // Sign review data → one-click token
  const secret  = process.env.APPROVE_SECRET;
  const payload = Buffer.from(JSON.stringify(review)).toString('base64url');
  const sig     = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const token   = `${payload}.${sig}`;

  const siteUrl    = (process.env.SITE_URL || 'https://taskboost.ai').replace(/\/$/, '');
  const approveUrl = `${siteUrl}/api/approve-review?token=${token}`;

  const stars_display = '★'.repeat(review.stars) + '☆'.repeat(5 - review.stars);
  const meta = [
    review.name,
    review.company,
    review.role,
  ].filter(Boolean).join(' · ');

  // Send approval email via Web3Forms (already set up, no new service needed)
  await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: 'fc8de293-5f94-4d3d-b1f8-0367aea00aa3',
      subject:    `⭐ New review from ${review.name} — ${review.stars}/5 stars`,
      from_name:  'Taskboost.ai Reviews',
      message: [
        `New review awaiting your approval`,
        ``,
        `From:   ${meta}`,
        `Stars:  ${stars_display} (${review.stars}/5)`,
        ``,
        `"${review.text}"`,
        ``,
        `══════════════════════════════════════`,
        `✅  CLICK TO APPROVE AND PUBLISH:`,
        ``,
        `${approveUrl}`,
        ``,
        `══════════════════════════════════════`,
        ``,
        `Clicking the link above will instantly publish this review on taskboost.ai.`,
        `If you don't want to publish it, simply ignore this email.`,
      ].join('\n'),
    }),
  });

  return res.status(200).json({ ok: true });
};
