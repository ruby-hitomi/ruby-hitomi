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

## LINE Messaging API Webhook

Cloudflare Workersで `POST /api/line/webhook` を受け付けます。LINE Developers の Webhook URL には以下を設定します。

```text
https://ruby-hiromi.fortunstudios.jp/api/line/webhook
```

必要な環境変数はCloudflare Workersの `Variables and secrets` にSecretとして登録します。コードやGitには直書きしません。

| 変数名 | 用途 |
| --- | --- |
| `LINE_CHANNEL_SECRET` | LINE Messaging API の Channel secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API の Channel access token |

設定後のデプロイ手順:

```bash
pnpm run build
pnpm dlx wrangler deploy
```

LINE Developers側でWebhookの検証を実行すると、`events: []` のリクエストにHTTP 200を返します。通常メッセージを受信した場合は、現段階では固定文「メッセージを受信しました」を返信します。

## AIひとみ先生の無料占い

`/free-fortune/` はCloudflare Workersの `POST /api/free-fortune` を呼び出し、OpenAI APIで鑑定結果を生成します。生成結果と入力内容はD1に保存し、`/admin/free-fortune-results/` から直近100件を確認できます。

必要なSecret/Variable:

| 変数名 | 種別 | 用途 |
| --- | --- | --- |
| `OPENAI_API_KEY` | Secret | Fortune Studio公式サイトと同じOpenAI APIキー |
| `OPENAI_MODEL` | Variable | 使用モデル。未設定時は `gpt-4o-mini` |

D1設定手順:

```bash
pnpm dlx wrangler d1 create ruby-hitomi
```

作成後、表示された `database_id` を `wrangler.json` に追加します。

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "ruby-hitomi",
    "database_id": "取得したdatabase_id"
  }
]
```

テーブル作成:

```bash
pnpm dlx wrangler d1 migrations apply ruby-hitomi
```

本番デプロイ後はCloudflare Accessで `/admin/*` を保護してください。

## 管理画面の認証設定

管理画面は `/admin/`、ブログ管理画面は `/admin/blog/`、アクセス解析確認画面は `/admin/analytics/` です。サイトは静的配信のため、Googleアカウント認証はCloudflare Accessで `/admin/*` に設定します。

- Application type: Self-hosted
- Application domain: `ruby-hiromi.fortunstudios.jp`
- Path: `/admin/*`
- Identity provider: Google
- Policy action: Allow
- Include: Emails
- Allowed email: `rubye-hitomi@gmail.com`

`/admin/*` は `robots.txt` と `_headers` で検索エンジンに非表示指定しています。実際の閲覧制限はCloudflare Access側の設定で行います。

## ブログ自動投稿の設定

`/admin/blog/` で投稿モードを選べます。

| モード | 動作 |
| --- | --- |
| 半自動 | 記事案を作成し、ブラウザ内の下書きに保存します。人間が内容を確認してからMarkdownを反映します。 |
| 全自動 | 公開APIが設定されている場合、記事MarkdownをAPIへ送信します。API未設定またはエラー時は下書き保存に戻します。 |

全自動公開APIを接続する場合は、Cloudflare Pages / Workers の環境変数に以下を設定します。

| 変数名 | 用途 | 例 |
| --- | --- | --- |
| `PUBLIC_BLOG_AUTOMATION_ENDPOINT` | ブログMarkdownを受け取って公開処理するAPI | `https://example.com/api/blog/publish` |

API未設定でも管理画面は壊れません。全自動を選んだ場合も、安全のため下書き保存に切り替わります。

公開APIを実装する場合は、少なくとも以下のJSONを受け取る想定です。

```json
{
  "slug": "blog-slug",
  "markdown": "---\ntitle: \"...\"\n---\n\n本文",
  "source": "ruby-hitomi-admin"
}
```

現在の静的サイト構成では、ブラウザだけで `src/content/blog/*.md` を直接書き換えて本番公開することはできません。完全自動公開には、GitHubへコミットするAPI、CMS、D1/R2連携、またはCloudflare Workers側の投稿保存・再生成処理が必要です。

## SNSコンテンツ作成機能

`/admin/sns/` でInstagram向けコンテンツを作成できます。

ルビー瞳サイトの仕様では、本人確認なしの完全自動投稿は行いません。AI推奨テーマは編集可能な初期値として表示し、本人が確認してからスライド案を作成します。

主な機能:

- AI推奨テーマの表示
- 別テーマの提案
- 投稿目的、想定読者、形式、枚数、誘導先の設定
- 5〜10枚の縦型スライド案作成
- スライドの編集、追加、削除、並べ替え
- 1080×1920px PNG出力
- キャプションとハッシュタグ作成
- 投稿直前の最終確認
- 投稿履歴のブラウザ保存

Meta公式APIで本人確認後の投稿処理へ接続する場合は、以下の環境変数を設定します。

| 変数名 | 用途 | 例 |
| --- | --- | --- |
| `PUBLIC_INSTAGRAM_PUBLISH_ENDPOINT` | 本人確認後のInstagram投稿API | `https://example.com/api/instagram/publish` |

未設定の場合は、PNGとキャプションを出力し、本人がInstagram公式画面またはアプリから投稿します。
