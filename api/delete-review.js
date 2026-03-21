const crypto = require('crypto');

function fromB64u(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

module.exports = async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token.');

  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return res.status(400).send('Invalid token.');

  const payload  = token.slice(0, lastDot);
  const sig      = token.slice(lastDot + 1);
  const secret   = process.env.APPROVE_SECRET || 'fallback-secret';
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (sig !== expected) return res.status(403).send('Invalid token.');

  let data;
  try { data = JSON.parse(fromB64u(payload)); } catch { return res.status(400).send('Bad token data.'); }

  const apiUrl = `https://api.github.com/repos/jur9526/Taskboost-ai/contents/reviews.js`;
  const ghHeaders = {
    'Authorization':        `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept':               'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {
    const fileRes = await fetch(apiUrl, { headers: ghHeaders });
    if (!fileRes.ok) return res.status(500).send('Failed to read reviews.js.');

    const fileData       = await fileRes.json();
    const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');

    // Remove the review block that contains the matching id
    const idStr  = `    id: "${data.id}"`;
    const blocks = currentContent.split(/(?=\n  \{)/);
    const filtered = blocks.filter(block => !block.includes(idStr));

    if (filtered.length === blocks.length) {
      return res.status(404).send('Review not found (may already be deleted).');
    }

    const newContent = filtered.join('');

    const commitRes = await fetch(apiUrl, {
      method:  'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `delete review: ${data.name}`,
        content: Buffer.from(newContent).toString('base64'),
        sha:     fileData.sha,
      }),
    });

    if (!commitRes.ok) {
      const err = await commitRes.text();
      return res.status(500).send('Failed to delete review: ' + err);
    }

    const siteUrl = (process.env.SITE_URL || 'https://taskboost.ai').replace(/\/$/, '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="4;url=${siteUrl}/#reviews">
  <title>Review Deleted</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,-apple-system,sans-serif;background:#f5f3ff;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:20px;padding:3rem 2.5rem;text-align:center;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(91,33,182,.12)}
    .icon{font-size:3rem;margin-bottom:1rem}
    h1{color:#5b21b6;font-size:1.4rem;margin-bottom:.5rem}
    p{color:#6b7280;margin-bottom:1.5rem}
    a{color:#5b21b6;font-weight:600;text-decoration:none}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🗑️</div>
    <h1>Review Deleted</h1>
    <p><strong>${data.name}</strong>'s review has been removed. Site updates in ~30 seconds.</p>
    <a href="${siteUrl}/#reviews">Go back →</a>
  </div>
</body>
</html>`);

  } catch (err) {
    console.error('delete-review error:', err);
    return res.status(500).send('Server error: ' + err.message);
  }
};
