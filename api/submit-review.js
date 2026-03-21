const crypto = require('crypto');

function toB64u(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const { name, company, role, stars, message } = body;
  if (!name || !stars || !message) return res.status(400).json({ error: 'Missing required fields' });

  const starNum = parseInt(stars);
  if (isNaN(starNum) || starNum < 1 || starNum > 5) return res.status(400).json({ error: 'Invalid rating' });

  const id = Date.now().toString();
  const review = {
    id,
    name:    String(name).trim(),
    company: String(company || '').trim(),
    role:    String(role    || '').trim(),
    stars:   starNum,
    text:    String(message).trim(),
    date:    new Date().toISOString().slice(0, 7),
  };

  // Fetch current reviews.js from GitHub
  const apiUrl = `https://api.github.com/repos/jur9526/Taskboost-ai/contents/reviews.js`;
  const ghHeaders = {
    'Authorization':        `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept':               'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const fileRes = await fetch(apiUrl, { headers: ghHeaders });
  if (!fileRes.ok) {
    const err = await fileRes.text();
    return res.status(500).json({ error: `GitHub ${fileRes.status}: ${err}` });
  }

  const fileData      = await fileRes.json();
  const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');

  // Build new entry
  const lines = [`  {`, `    name: ${JSON.stringify(review.name)},`];
  if (review.company) lines.push(`    company: ${JSON.stringify(review.company)},`);
  if (review.role)    lines.push(`    role: ${JSON.stringify(review.role)},`);
  lines.push(
    `    stars: ${review.stars},`,
    `    text: ${JSON.stringify(review.text)},`,
    `    date: ${JSON.stringify(review.date)},`,
    `    id: "${review.id}"`,
    `  },`,
  );

  const insertAt = currentContent.lastIndexOf('\n];');
  if (insertAt === -1) return res.status(500).json({ error: 'reviews.js format error' });

  const newContent = currentContent.slice(0, insertAt) + '\n' + lines.join('\n') + '\n];';

  // Commit to GitHub
  const commitRes = await fetch(apiUrl, {
    method:  'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `add review: ${review.name}`,
      content: Buffer.from(newContent).toString('base64'),
      sha:     fileData.sha,
    }),
  });

  if (!commitRes.ok) {
    const err = await commitRes.text();
    return res.status(500).json({ error: `GitHub commit ${commitRes.status}: ${err}` });
  }

  // Generate delete token
  const secret      = process.env.APPROVE_SECRET || 'fallback-secret';
  const payload     = toB64u(JSON.stringify({ id: review.id, name: review.name }));
  const sig         = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const deleteToken = `${payload}.${sig}`;
  const siteUrl     = (process.env.SITE_URL || 'https://taskboost.ai').replace(/\/$/, '');

  return res.status(200).json({
    ok: true,
    deleteUrl:   `${siteUrl}/api/delete-review?token=${deleteToken}`,
    reviewName:  review.name,
    stars:       review.stars,
    text:        review.text,
  });
};
