// Cloudflare Pages Function: POST /api/submit
// Validates a tool submission and opens a GitHub issue labelled `submission`.
// The triage workflow picks the issue up from there.
//
// Environment (Pages > Settings > Variables and secrets):
//   GITHUB_TOKEN      secret   fine-grained token, Issues: read and write on the repository
//   GITHUB_REPO       variable owner/name, default kausalflow/tools
//   TURNSTILE_SECRET  secret   optional; when set, the Turnstile token is required

const SINGLE = {
  submitted_by: 120,
  'tool-name': 120,
  'tool-summary': 2000,
  'tool-features': 3000,
  'tool-link': 500,
  'tool-link-alt': 500,
  'tool-tags-other': 300,
};
const MULTI = ['tool-categories', 'tool-tags', 'tool-platforms', 'tool-fields'];

const html = (status, title, message) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${title}</title><body style="font:16px system-ui;max-width:36rem;margin:4rem auto;padding:0 1rem">` +
      `<h1>${title}</h1><p>${message}</p><p><a href="/submit/">Back to the form</a></p>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );

const clean = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const isHttp = (u) => {
  try {
    const p = new URL(u);
    return p.protocol === 'http:' || p.protocol === 'https:';
  } catch {
    return false;
  }
};
// keep @mentions and #refs from pinging people or linking issues
const defang = (s) => s.replace(/@/g, '@​').replace(/#(\d)/g, '#​$1');

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return html(400, 'Invalid submission', 'The form data could not be read.');
  }

  // honeypot: bots fill every field, people never see this one
  if (form.get('company')) return Response.redirect(new URL('/submit/thanks/', request.url), 303);

  const data = {};
  for (const [key, max] of Object.entries(SINGLE)) data[key] = clean(form.get(key), max);
  for (const key of MULTI) {
    const values = [...form.getAll(key), ...form.getAll(`${key}[]`)].map((v) => clean(v, 80)).filter(Boolean);
    data[key] = [...new Set(values)].slice(0, 20);
  }

  const problems = [];
  if (!data['tool-name']) problems.push('the tool name');
  if (data['tool-summary'].length < 40) problems.push('a summary of at least 40 characters');
  if (!isHttp(data['tool-link'])) problems.push('a link starting with http:// or https://');
  if (data['tool-link-alt'] && !isHttp(data['tool-link-alt'])) problems.push('a valid alternative link');
  if (problems.length) return html(400, 'Please check the form', `Missing or invalid: ${problems.join(', ')}.`);

  if (env.TURNSTILE_SECRET) {
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: String(form.get('cf-turnstile-response') || ''),
      remoteip: request.headers.get('CF-Connecting-IP') || '',
    });
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const out = await r.json().catch(() => ({}));
    if (!out.success) return html(400, 'Verification failed', 'The spam check did not pass. Please go back and try again.');
  }

  if (!env.GITHUB_TOKEN) return html(500, 'Not configured', 'Submissions are not available right now.');
  const repo = env.GITHUB_REPO || 'kausalflow/tools';

  const lines = [
    `**Submitted by:** ${defang(data.submitted_by || 'anonymous')}`,
    `**Tool:** ${defang(data['tool-name'])}`,
    `**Link:** ${data['tool-link']}`,
    data['tool-link-alt'] ? `**Alternative link:** ${data['tool-link-alt']}` : '',
    '',
    defang(data['tool-summary']),
    '',
    data['tool-features'] ? `**Features**\n\n${defang(data['tool-features'])}` : '',
    '',
    `**Categories:** ${defang(data['tool-categories'].join(', ')) || '-'}`,
    `**Fields:** ${defang(data['tool-fields'].join(', ')) || '-'}`,
    `**Platforms:** ${defang(data['tool-platforms'].join(', ')) || '-'}`,
    `**Tags:** ${defang([...data['tool-tags'], data['tool-tags-other']].filter(Boolean).join(', ')) || '-'}`,
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '');
  // machine readable copy for the triage workflow; "--" is escaped so the comment cannot end early
  const json = JSON.stringify(data).replace(/--/g, '\\u002d\\u002d').replace(/>/g, '\\u003e');
  const body = `${lines.join('\n')}\n\n<!-- kf-submission\n${json}\n-->`;

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'kausalflow-tools-submit',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      title: `New tool: ${defang(data['tool-name'])}`.slice(0, 120),
      body,
      labels: ['submission'],
    }),
  });
  if (!res.ok) return html(502, 'Could not save the submission', 'Please try again later or open an issue on GitHub.');

  return Response.redirect(new URL('/submit/thanks/', request.url), 303);
}

export async function onRequest() {
  return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
}
