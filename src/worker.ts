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

  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  return user === adminUser && password === adminPassword;
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
    { label: '予約クリック率', rate: data.bookingRate },
    { label: 'LINEクリック率', rate: data.lineRate },
    { label: 'メニュー閲覧率', rate: data.menuRate }
  ].sort((a, b) => b.rate - a.rate)[0];

  return `${data.periodLabel}のアクセス解析サマリーです。訪問数は${data.visits.toLocaleString('ja-JP')}件、予約クリックは${data.bookingClicks.toLocaleString('ja-JP')}件（${formatPercent(data.bookingRate)}）、LINEクリックは${data.lineClicks.toLocaleString('ja-JP')}件（${formatPercent(data.lineRate)}）、メニュー閲覧は${data.menuViews.toLocaleString('ja-JP')}件（${formatPercent(data.menuRate)}）でした。\n\nもっとも反応が出ている指標は${strongest.label}です。一方で、次の改善では「${data.nextAction}」を優先します。次回は、トップページから鑑定メニューへの遷移、予約ボタンのクリック、LINE導線の反応を見比べて、予約に近い行動が増えているか確認してください。`;
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
    periodLabel: sanitizeText(body.periodLabel, 80) || '今回の期間',
    visits,
    bookingClicks,
    lineClicks,
    menuViews,
    bookingRate: visits ? bookingClicks / visits : Number(body.bookingRate ?? 0) || 0,
    lineRate: visits ? lineClicks / visits : Number(body.lineRate ?? 0) || 0,
    menuRate: visits ? menuViews / visits : Number(body.menuRate ?? 0) || 0,
    nextAction: sanitizeText(body.nextAction, 240) || '予約につながる導線を見直します。'
  };

  if (!visits) return jsonResponse({ draft: '' });

  const fallback = buildAnalyticsDraftFallback(data);
  if (!env.OPENAI_API_KEY) return jsonResponse({ draft: fallback, source: 'fallback' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'あなたは恋愛占い師の公式サイトを改善するWebマーケターです。アクセス解析データを読み解き、管理画面の下書きメモとしてそのまま貼れる日本語文を作ります。断定しすぎず、数字、解釈、次の一手を簡潔にまとめてください。'
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
              output: '300字以内。1段落目に数値サマリー、2段落目に読み解き、3段落目に次の一手。見出し不要。'
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

  let body: {
    periodLabel?: unknown;
    visits?: unknown;
    bookingClicks?: unknown;
    lineClicks?: unknown;
    menuViews?: unknown;
    nextAction?: unknown;
    note?: unknown;
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

    if (isAdminPath(url.pathname) && !isAuthorized(request)) {
      return unauthorizedResponse();
    }
if (url.pathname === '/api/admin/analytics-summary-draft') {
      return handleAnalyticsSummaryDraft(request, env);
    }

    if (url.pathname === '/api/admin/analytics-summaries') {
      return handleAnalyticsSummaries(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/api/free-fortune') {
      return handleFreeFortune(request, env);
    }

    if (url.pathname === '/api/free-fortune') {
      return textResponse('Method Not Allowed', 405);
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/free-fortune-results') {
      return handleFreeFortuneResults(env);
    }

    if (url.pathname.startsWith('/api/')) {
      return textResponse('Not Found', 404);
    }

    return env.ASSETS.fetch(request);
  }
};
