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

  try {
    const secret     = process.env.APPROVE_SECRET || 'fallback-secret';
    const payload    = toB64u(JSON.stringify(review));
    const sig        = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const token      = `${payload}.${sig}`;
    const siteUrl    = (process.env.SITE_URL || 'https://taskboost.ai').replace(/\/$/, '');
    const approveUrl = `${siteUrl}/api/approve-review?token=${token}`;

    const stars_display = '★'.repeat(review.stars) + '☆'.repeat(5 - review.stars);
    const meta = [review.name, review.company, review.role].filter(Boolean).join(' · ');

    // Create a GitHub issue — GitHub emails you automatically
    const issueRes = await fetch('https://api.github.com/repos/jur9526/Taskboost-ai/issues', {
      method:  'POST',
      headers: {
        'Authorization':        `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept':               'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type':         'application/json',
      },
      body: JSON.stringify({
        title: `New review: ${review.name} — ${stars_display}`,
        body: [
          `## New review awaiting approval`,
          ``,
          `**From:** ${meta}`,
          `**Stars:** ${stars_display} (${review.stars}/5)`,
          ``,
          `> ${review.text}`,
          ``,
          `---`,
          ``,
          `## ✅ [Click here to approve and publish](${approveUrl})`,
          ``,
          `Clicking the link above will instantly publish this review on taskboost.ai and close this issue.`,
          `To reject: simply close this issue without clicking the link.`,
        ].join('\n'),
      }),
    });

    if (!issueRes.ok) {
      const err = await issueRes.text();
      console.error('GitHub issue error:', err);
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    // Rebuild token with issue_number so approve can close the issue
    const issueData = await issueRes.json();
    const reviewWithIssue = { ...review, issue_number: issueData.number };
    const payload2    = toB64u(JSON.stringify(reviewWithIssue));
    const sig2        = crypto.createHmac('sha256', secret).update(payload2).digest('hex');
    const token2      = `${payload2}.${sig2}`;
    const approveUrl2 = `${siteUrl}/api/approve-review?token=${token2}`;

    // Update the issue body with the correct approve link
    await fetch(`https://api.github.com/repos/jur9526/Taskboost-ai/issues/${issueData.number}`, {
      method:  'PATCH',
      headers: {
        'Authorization':        `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept':               'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type':         'application/json',
      },
      body: JSON.stringify({
        body: [
          `## New review awaiting approval`,
          ``,
          `**From:** ${meta}`,
          `**Stars:** ${stars_display} (${review.stars}/5)`,
          ``,
          `> ${review.text}`,
          ``,
          `---`,
          ``,
          `## ✅ [Click here to approve and publish](${approveUrl2})`,
          ``,
          `Clicking the link above will instantly publish this review on taskboost.ai and close this issue.`,
          `To reject: simply close this issue without clicking the link.`,
        ].join('\n'),
      }),
    }).catch(() => {});

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('submit-review error:', err);
    return res.status(500).json({ error: err.message });
  }
};
