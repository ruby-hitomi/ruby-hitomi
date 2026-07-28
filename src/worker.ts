type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  DB?: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  LINE_CHANNEL_SECRET?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
};

type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
};

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement;
  run: () => Promise<unknown>;
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
};

type LineWebhookBody = {
  events?: Array<{ type?: string; replyToken?: string }>;
};

const headers = {
  'access-control-allow-origin': 'https://ruby-hitomi.fortunestudios.jp',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

const textResponse = (message: string, status = 200) =>
  new Response(message, { status, headers: { ...headers, 'content-type': 'text/plain; charset=utf-8' } });

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8' } });

const createId = () => crypto.randomUUID();
const sanitizeText = (value: unknown, maxLength: number) =>
  String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);

const toSafeNumber = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
};

const adminUser = 'ruby';
const adminPassword = 'ruby2026';

const unauthorizedResponse = () =>
  new Response('Authentication required', {
    status: 401,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'www-authenticate': 'Basic realm="Ruby Hitomi Admin", charset="UTF-8"',
      'x-robots-tag': 'noindex, nofollow, noarchive'
    }
  });

const isAdminPath = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');

const isAuthorized = (request: Request) => {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return false;

  let decoded = '';
  try {
    decoded = atob(header.slice('Basic '.length));
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) return false;

  return decoded.slice(0, separatorIndex) === adminUser && decoded.slice(separatorIndex + 1) === adminPassword;
};

const timingSafeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
};

const base64ToBytes = (value: string) => {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return new Uint8Array();
  }
};

const verifyLineSignature = async (bodyText: string, signature: string | null, channelSecret?: string) => {
  if (!channelSecret || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText));
  return timingSafeEqual(new Uint8Array(digest), base64ToBytes(signature));
};

const replyToLine = async (replyToken: string, env: Env) => {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) return false;

  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text: '\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u53d7\u4fe1\u3057\u307e\u3057\u305f' }]
    })
  });

  return response.ok;
};

const handleLineWebhook = async (request: Request, env: Env) => {
  if (request.method === 'GET' || request.method === 'HEAD') return textResponse('OK');
  if (request.method !== 'POST') return textResponse('Method Not Allowed', 405);

  const bodyText = await request.text();
  const isValid = await verifyLineSignature(bodyText, request.headers.get('x-line-signature'), env.LINE_CHANNEL_SECRET);
  if (!isValid) return textResponse('Invalid signature', 401);

  let body: LineWebhookBody;
  try {
    body = JSON.parse(bodyText) as LineWebhookBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0) return textResponse('OK');

  await Promise.all(
    events
      .filter((event) => typeof event.replyToken === 'string' && event.replyToken.length > 0)
      .map((event) => replyToLine(event.replyToken as string, env))
  );

  return textResponse('OK');
};

const formatPercent = (value: number) => `${(value * 100).toFixed(value >= 0.1 ? 0 : 1)}%`;

const buildAnalyticsDraftFallback = (data: {
  periodLabel: string;
  visits: number;
  bookingClicks: number;
  lineClicks: number;
  menuViews: number;
  bookingRate: number;
  lineRate: number;
  menuRate: number;
  nextAction: string;
}) => {
  const strongest = [
    { label: '\u4e88\u7d04\u30af\u30ea\u30c3\u30af\u7387', rate: data.bookingRate },
    { label: 'LINE\u30af\u30ea\u30c3\u30af\u7387', rate: data.lineRate },
    { label: '\u30e1\u30cb\u30e5\u30fc\u95b2\u89a7\u7387', rate: data.menuRate }
  ].sort((a, b) => b.rate - a.rate)[0];

  return `${data.periodLabel}\u306e\u30a2\u30af\u30bb\u30b9\u89e3\u6790\u30b5\u30de\u30ea\u30fc\u3067\u3059\u3002\u8a2a\u554f\u6570\u306f${data.visits.toLocaleString('ja-JP')}\u4ef6\u3001\u4e88\u7d04\u30af\u30ea\u30c3\u30af\u306f${data.bookingClicks.toLocaleString('ja-JP')}\u4ef6\uff08${formatPercent(data.bookingRate)}\uff09\u3001LINE\u30af\u30ea\u30c3\u30af\u306f${data.lineClicks.toLocaleString('ja-JP')}\u4ef6\uff08${formatPercent(data.lineRate)}\uff09\u3001\u30e1\u30cb\u30e5\u30fc\u95b2\u89a7\u306f${data.menuViews.toLocaleString('ja-JP')}\u4ef6\uff08${formatPercent(data.menuRate)}\uff09\u3067\u3057\u305f\u3002\n\n\u3082\u3063\u3068\u3082\u53cd\u5fdc\u304c\u51fa\u3066\u3044\u308b\u6307\u6a19\u306f${strongest.label}\u3067\u3059\u3002\u4e00\u65b9\u3067\u3001\u6b21\u306e\u6539\u5584\u3067\u306f\u300c${data.nextAction}\u300d\u3092\u512a\u5148\u3057\u307e\u3059\u3002\u6b21\u56de\u306f\u3001\u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u304b\u3089\u9451\u5b9a\u30e1\u30cb\u30e5\u30fc\u3078\u306e\u9077\u79fb\u3001\u4e88\u7d04\u30dc\u30bf\u30f3\u306e\u30af\u30ea\u30c3\u30af\u3001LINE\u5c0e\u7dda\u306e\u53cd\u5fdc\u3092\u898b\u6bd4\u3079\u3066\u3001\u4e88\u7d04\u306b\u8fd1\u3044\u884c\u52d5\u304c\u5897\u3048\u3066\u3044\u308b\u304b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002`;
};

const handleAnalyticsSummaryDraft = async (request: Request, env: Env) => {
  if (request.method !== 'POST') return textResponse('Method Not Allowed', 405);

  let body: {
    periodLabel?: unknown;
    visits?: unknown;
    bookingClicks?: unknown;
    lineClicks?: unknown;
    menuViews?: unknown;
    bookingRate?: unknown;
    lineRate?: unknown;
    menuRate?: unknown;
    nextAction?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const visits = toSafeNumber(body.visits);
  const bookingClicks = toSafeNumber(body.bookingClicks);
  const lineClicks = toSafeNumber(body.lineClicks);
  const menuViews = toSafeNumber(body.menuViews);
  const data = {
    periodLabel: sanitizeText(body.periodLabel, 80) || '\u4eca\u56de\u306e\u671f\u9593',
    visits,
    bookingClicks,
    lineClicks,
    menuViews,
    bookingRate: visits ? bookingClicks / visits : Number(body.bookingRate ?? 0) || 0,
    lineRate: visits ? lineClicks / visits : Number(body.lineRate ?? 0) || 0,
    menuRate: visits ? menuViews / visits : Number(body.menuRate ?? 0) || 0,
    nextAction: sanitizeText(body.nextAction, 240) || '\u4e88\u7d04\u306b\u3064\u306a\u304c\u308b\u5c0e\u7dda\u3092\u898b\u76f4\u3057\u307e\u3059\u3002'
  };

  if (!visits) {
    return jsonResponse({
      draft: '\u307e\u3060\u5341\u5206\u306a\u30a2\u30af\u30bb\u30b9\u30c7\u30fc\u30bf\u304c\u306a\u3044\u305f\u3081\u3001AI\u30b5\u30de\u30ea\u30fc\u306f\u4e0b\u66f8\u304d\u6bb5\u968e\u3067\u3059\u3002\u307e\u305a\u306f\u8a2a\u554f\u6570\u3001\u4e88\u7d04\u30af\u30ea\u30c3\u30af\u3001LINE\u30af\u30ea\u30c3\u30af\u3001\u9451\u5b9a\u30e1\u30cb\u30e5\u30fc\u95b2\u89a7\u306e\u6570\u5024\u3092\u96c6\u3081\u3001\u4e88\u7d04\u306b\u3064\u306a\u304c\u308b\u5c0e\u7dda\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
      source: 'fallback'
    });
  }

  const fallback = buildAnalyticsDraftFallback(data);
  if (!env.OPENAI_API_KEY) return jsonResponse({ draft: fallback, source: 'fallback' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: '\u3042\u306a\u305f\u306f\u604b\u611b\u5360\u3044\u5e2b\u306e\u516c\u5f0f\u30b5\u30a4\u30c8\u3092\u6539\u5584\u3059\u308bWeb\u30de\u30fc\u30b1\u30bf\u30fc\u3067\u3059\u3002\u30a2\u30af\u30bb\u30b9\u89e3\u6790\u30c7\u30fc\u30bf\u3092\u8aad\u307f\u89e3\u304d\u3001\u7ba1\u7406\u753b\u9762\u306e\u4e0b\u66f8\u304d\u30e1\u30e2\u3068\u3057\u3066\u305d\u306e\u307e\u307e\u8cbc\u308c\u308b\u65e5\u672c\u8a9e\u6587\u3092\u4f5c\u308a\u307e\u3059\u3002\u65ad\u5b9a\u3057\u3059\u304e\u305a\u3001\u6570\u5b57\u3001\u89e3\u91c8\u3001\u6b21\u306e\u4e00\u624b\u3092\u7c21\u6f54\u306b\u307e\u3068\u3081\u3066\u304f\u3060\u3055\u3044\u3002'
          },
          {
            role: 'user',
            content: JSON.stringify({
              period: data.periodLabel,
              visits: data.visits,
              bookingClicks: data.bookingClicks,
              bookingRate: formatPercent(data.bookingRate),
              lineClicks: data.lineClicks,
              lineRate: formatPercent(data.lineRate),
              menuViews: data.menuViews,
              menuRate: formatPercent(data.menuRate),
              recommendedNextAction: data.nextAction,
              output: '300\u5b57\u4ee5\u5185\u30021\u6bb5\u843d\u76ee\u306b\u6570\u5024\u30b5\u30de\u30ea\u30fc\u30012\u6bb5\u843d\u76ee\u306b\u8aad\u307f\u89e3\u304d\u30013\u6bb5\u843d\u76ee\u306b\u6b21\u306e\u4e00\u624b\u3002\u898b\u51fa\u3057\u4e0d\u8981\u3002'
            })
          }
        ]
      })
    });

    if (!response.ok) return jsonResponse({ draft: fallback, source: 'fallback' });
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const draft = sanitizeText(payload.choices?.[0]?.message?.content, 1200);
    return jsonResponse({ draft: draft || fallback, source: draft ? 'openai' : 'fallback' });
  } catch {
    return jsonResponse({ draft: fallback, source: 'fallback' });
  }
};

const handleAnalyticsSummaries = async (request: Request, env: Env) => {
  if (!env.DB) return jsonResponse({ error: 'D1 database binding DB is not configured' }, 500);

  if (request.method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT id, created_at, period_label, visits, booking_clicks, line_clicks, menu_views,
        booking_rate, line_rate, menu_rate, next_action, note
        FROM analytics_summaries
        ORDER BY created_at DESC
        LIMIT 52`
    ).all();
    return jsonResponse({ results: rows.results ?? [] });
  }

  if (request.method !== 'POST') return textResponse('Method Not Allowed', 405);
  const body = (await request.json().catch(() => null)) as null | {
    periodLabel?: unknown;
    visits?: unknown;
    bookingClicks?: unknown;
    lineClicks?: unknown;
    menuViews?: unknown;
    nextAction?: unknown;
    note?: unknown;
  };
  if (!body) return jsonResponse({ error: 'Invalid JSON' }, 400);

  const visits = toSafeNumber(body.visits);
  const bookingClicks = toSafeNumber(body.bookingClicks);
  const lineClicks = toSafeNumber(body.lineClicks);
  const menuViews = toSafeNumber(body.menuViews);
  const bookingRate = visits ? bookingClicks / visits : 0;
  const lineRate = visits ? lineClicks / visits : 0;
  const menuRate = visits ? menuViews / visits : 0;
  const id = createId();

  await env.DB.prepare(
    `INSERT INTO analytics_summaries
      (id, created_at, period_label, visits, booking_clicks, line_clicks, menu_views,
        booking_rate, line_rate, menu_rate, next_action, note)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      sanitizeText(body.periodLabel, 80) || 'period',
      visits,
      bookingClicks,
      lineClicks,
      menuViews,
      bookingRate,
      lineRate,
      menuRate,
      sanitizeText(body.nextAction, 240),
      sanitizeText(body.note, 500)
    )
    .run();

  return jsonResponse({ ok: true, id });
};

const handleFreeFortuneResults = async (env: Env) => {
  if (!env.DB) return jsonResponse({ error: 'D1 database binding DB is not configured' }, 500);
  const rows = await env.DB.prepare(
    `SELECT id, created_at, theme, situation, question, result_title, result_card, result_reading, result_advice, result_next_step
      FROM free_fortune_readings
      ORDER BY created_at DESC
      LIMIT 100`
  ).all();
  return jsonResponse({ results: rows.results ?? [] });
};

const handleFreeFortune = async (request: Request, env: Env) => {
  if (!env.DB) return jsonResponse({ error: 'D1 database binding DB is not configured' }, 500);
  const body = (await request.json().catch(() => ({}))) as { theme?: unknown; situation?: unknown; question?: unknown };
  const id = createId();
  const result = {
    title: '\u4eca\u306e\u604b\u3078\u306e\u30e1\u30c3\u30bb\u30fc\u30b8',
    card: '\u6708',
    reading: '\u4eca\u306f\u7126\u3089\u305a\u3001\u76f8\u624b\u306e\u72b6\u6cc1\u3068\u81ea\u5206\u306e\u6c17\u6301\u3061\u3092\u5206\u3051\u3066\u898b\u3064\u3081\u308b\u6642\u671f\u3067\u3059\u3002',
    advice: '\u77ed\u3044\u9023\u7d61\u3084\u8efd\u3044\u78ba\u8a8d\u304b\u3089\u3001\u7121\u7406\u306a\u304f\u8ddd\u96e2\u3092\u7e2e\u3081\u3066\u307f\u307e\u3057\u3087\u3046\u3002',
    nextStep: '\u4eca\u65e5\u3067\u304d\u308b\u5c0f\u3055\u306a\u4e00\u6b69\u3092\u4e00\u3064\u9078\u3073\u307e\u3057\u3087\u3046\u3002'
  };

  await env.DB.prepare(
    `INSERT INTO free_fortune_readings
      (id, created_at, theme, situation, question, result_title, result_card, result_reading, result_advice, result_next_step)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      sanitizeText(body.theme, 40) || '\u76f8\u624b\u306e\u6c17\u6301\u3061',
      sanitizeText(body.situation, 500),
      sanitizeText(body.question, 160),
      result.title,
      result.card,
      result.reading,
      result.advice,
      result.nextStep
    )
    .run();

  return jsonResponse({ id, ...result });
};

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return textResponse('OK');

    if (url.pathname === '/api/line/webhook') return handleLineWebhook(request, env);

    if (isAdminPath(url.pathname) && !isAuthorized(request)) return unauthorizedResponse();

    if (url.pathname === '/api/admin/analytics-summary-draft') return handleAnalyticsSummaryDraft(request, env);
    if (url.pathname === '/api/admin/analytics-summaries') return handleAnalyticsSummaries(request, env);
    if (request.method === 'POST' && url.pathname === '/api/free-fortune') return handleFreeFortune(request, env);
    if (url.pathname === '/api/free-fortune') return textResponse('Method Not Allowed', 405);
    if (request.method === 'GET' && url.pathname === '/api/admin/free-fortune-results') return handleFreeFortuneResults(env);
    if (url.pathname.startsWith('/api/')) return textResponse('Not Found', 404);

    return env.ASSETS.fetch(request);
  }
};