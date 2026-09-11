// 「今日の経済ニュース」枠(カテゴリ: kyounonews)専用の公開スクリプト。
// generate_article.js(claude CLIをサブプロセスで呼ぶ多人格レビューの重い仕組み)は使わず、
// このスクリプトを呼び出す側(クラウドルーティン等)が自分自身のWebSearch/Writeツールで
// 当日のニュースを調べて書いた記事本文を、そのままJSONで渡して公開する軽量版。
//
// 使い方:
//   node content_team/publish_daily_news.js path/to/article.json
//
// article.json の形式:
// {
//   "title": "記事タイトル",
//   "meta": "120字程度のメタディスクリプション",
//   "keywords": "キーワード1, キーワード2",
//   "bodyMarkdown": "## 見出し\n本文...(Markdown)",
//   "note": "内部管理用メモ(任意)"
// }
// slug・createdAtはこのスクリプト側で日付から自動生成する(例: news-2026-09-12)。
const fs = require("fs");
const path = require("path");
const { publishArticle } = require("./publish_article");

function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("使い方: node content_team/publish_daily_news.js path/to/article.json");
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(path.resolve(jsonPath), "utf8"));
  if (!raw.title || !raw.meta || !raw.bodyMarkdown) {
    console.error("[エラー] title, meta, bodyMarkdown は必須だよ");
    process.exit(1);
  }

  const now = new Date();
  const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const y = jstDate.getFullYear();
  const m = String(jstDate.getMonth() + 1).padStart(2, "0");
  const d = String(jstDate.getDate()).padStart(2, "0");
  const slug = `news-${y}-${m}-${d}`;

  const article = {
    topic: `今日の経済ニュース ${y}-${m}-${d}`,
    title: raw.title,
    meta: raw.meta,
    keywords: raw.keywords || "",
    slug,
    note: raw.note || "",
    bodyMarkdown: raw.bodyMarkdown,
    category: "kyounonews",
    createdAt: now.toISOString(),
  };

  const rawDir = path.join(__dirname, "..", "data", "articles_raw");
  fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(path.join(rawDir, `${slug}.json`), JSON.stringify(article, null, 2), "utf8");

  const filePath = publishArticle(article);
  console.log(`[完了] 今日の経済ニュースを書き出しました: ${filePath}`);
  console.log(`  タイトル: ${article.title}`);
  console.log(`  スラッグ: ${article.slug}`);
}

main();
