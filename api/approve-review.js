const crypto = require('crypto');

function fromB64u(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

module.exports = async function handler(req, res) {
  const { token } = req.query;

  if (!token) return res.status(400).send('Missing token.');

  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return res.status(400).send('Invalid token format.');

  const payload = token.slice(0, lastDot);
  const sig     = token.slice(lastDot + 1);

  const secret   = process.env.APPROVE_SECRET || 'fallback-secret';
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (sig !== expected) return res.status(403).send('Invalid or tampered token.');

  let review;
  try {
    review = JSON.parse(fromB64u(payload));
  } catch {
    return res.status(400).send('Could not decode token data.');
  }

  const repo   = 'jur9526/Taskboost-ai';
  const apiUrl = `https://api.github.com/repos/${repo}/contents/reviews.js`;
  const ghHeaders = {
    'Authorization':        `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept':               'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {
    const fileRes = await fetch(apiUrl, { headers: ghHeaders });
    if (!fileRes.ok) {
      const err = await fileRes.text();
      console.error('GitHub fetch error:', err);
      return res.status(500).send('Failed to read reviews.js from GitHub.');
    }

    const fileData       = await fileRes.json();
    const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');

    const lines = [`  {`, `    name: ${JSON.stringify(review.name)},`];
    if (review.company) lines.push(`    company: ${JSON.stringify(review.company)},`);
    if (review.role)    lines.push(`    role: ${JSON.stringify(review.role)},`);
    lines.push(
      `    stars: ${review.stars},`,
      `    text: ${JSON.stringify(review.text)},`,
      `    date: ${JSON.stringify(review.date)}`,
      `  },`,
    );
    const entry = lines.join('\n');

    const insertAt = currentContent.lastIndexOf('\n];');
    if (insertAt === -1) return res.status(500).send('Could not find insertion point in reviews.js.');

    const newContent = currentContent.slice(0, insertAt) + '\n' + entry + '\n];';

    const commitRes = await fetch(apiUrl, {
      method:  'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `approve review: ${review.name}`,
        content: Buffer.from(newContent).toString('base64'),
        sha:     fileData.sha,
      }),
    });

    if (!commitRes.ok) {
      const err = await commitRes.text();
      console.error('GitHub commit error:', err);
      return res.status(500).send('Failed to publish review. Check GITHUB_TOKEN permissions.');
    }

    // Close the GitHub issue if issue_number is in the token (best-effort)
    if (review.issue_number) {
      await fetch(`https://api.github.com/repos/jur9526/Taskboost-ai/issues/${review.issue_number}`, {
        method:  'PATCH',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'closed' }),
      }).catch(() => {});
    }

    const siteUrl = (process.env.SITE_URL || 'https://taskboost.ai').replace(/\/$/, '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="5;url=${siteUrl}/#reviews">
  <title>Review Published</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,-apple-system,sans-serif;background:#f5f3ff;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:20px;padding:3rem 2.5rem;text-align:center;max-width:440px;width:90%;box-shadow:0 8px 32px rgba(91,33,182,.12)}
    .icon{font-size:3.5rem;margin-bottom:1.25rem}
    h1{color:#5b21b6;font-size:1.5rem;margin-bottom:.6rem}
    p{color:#6b7280;line-height:1.6;margin-bottom:1.5rem}
    a{display:inline-block;background:#5b21b6;color:#fff;padding:.75rem 1.75rem;border-radius:50px;text-decoration:none;font-weight:600}
    .note{font-size:.78rem;color:#9ca3af;margin-top:1rem;margin-bottom:0}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Review Published!</h1>
    <p><strong>${review.name}</strong>'s review is now live.<br>Vercel will deploy in ~30 seconds.</p>
    <a href="${siteUrl}/#reviews">View Reviews →</a>
    <p class="note">Redirecting in 5 seconds…</p>
  </div>
</body>
</html>`);

  } catch (err) {
    console.error('approve-review error:', err);
    return res.status(500).send('Server error: ' + err.message);
  }
};
