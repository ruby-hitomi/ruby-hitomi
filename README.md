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

- `src/data/site.ts` の公式LINE、STORES予約、SNS、メールアドレス
- `astro.config.mjs` と `src/data/site.ts` の本番ドメイン
- `src/pages/tokushoho.astro` の事業者情報、所在地、電話番号、キャンセル規定
- 実際のお客様の声、ココナラ評価の引用可否、プロフィール画像

## 拡張しやすい箇所

- ブログ記事: `src/content/blog/*.md`
- 鑑定メニュー: `src/data/site.ts`
- AIチャット、AI占い、会員機能: `/contact/` や `/booking/` の導線から段階導入
