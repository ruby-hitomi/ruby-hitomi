# ルビー瞳 公式サイト

恋愛・復縁専門の占い師「ルビー瞳」の公式ホームページです。Astro + TypeScript + Tailwind CSS で構築し、Cloudflare Pages に静的配信できます。

## セットアップ

```bash
pnpm install
pnpm dev
```

## ビルド

```bash
pnpm build
```

生成先は `dist/` です。Cloudflare Pages では以下を設定してください。

- Build command: `pnpm build`
- Build output directory: `dist`
- Node.js version: 22 以上推奨

## 公開前に差し替える項目

- `src/data/site.ts` のLINE、STORES予約、SNS、メールアドレス
- `astro.config.mjs` と `src/data/site.ts` の本番ドメイン
- `src/pages/tokushoho.astro` の事業者情報、所在地、電話番号、キャンセル規定
- 実際のお客様の声、ココナラ評価の引用可否、プロフィール画像

## 拡張しやすい箇所

- ブログ記事: `src/content/blog/*.md`
- 鑑定メニュー: `src/data/site.ts`
- AIチャット、AI占い、会員機能: `/contact/` や `/booking/` の導線から段階導入

## アクセス解析の設定

Cloudflare Pages の `Settings` → `Environment variables` で以下を設定してください。

| 変数名 | 用途 | 例 |
| --- | --- | --- |
| `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` | Cloudflare Web Analytics の Site token | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 の測定ID | `G-4XTSPYTHR7` |
| `PUBLIC_CLARITY_PROJECT_ID` | Microsoft Clarity の Project ID | `xxxxxxxxxx` |

設定後に再デプロイすると、全ページに Cloudflare Web Analytics、GA4、Microsoft Clarity のタグが出力されます。未設定の変数がある場合、そのサービスのタグだけ出力されません。

GA4 では以下のイベントをクリック時に送信します。

| 計測内容 | GA4イベント名 |
| --- | --- |
| LINE登録クリック | `line_click` |
| STORES予約クリック | `stores_booking_click` |
| 電話鑑定クリック | `phone_reading_click` |
| Zoom鑑定クリック | `zoom_reading_click` |
| お問い合わせクリック | `contact_click` |

イベントには `link_text`、`link_url`、`page_path` も付与します。ただし `mailto:` のURL、氏名、メールアドレス、相談内容などの個人情報は送信しません。GA4のリアルタイムレポートまたは DebugView で公開直後に発火確認できます。
