// 使い方: node content_team/generate_article.js [--fresh] "記事テーマ"
// 途中経過は data/drafts/ に段階ごとに残る。同じテーマで再実行すると続きから(--freshで最初から)。
// Claude Code CLI(Kさんのサブスクリプション経由、追加のAPI課金なし)で記事を
// 作り、docs/articles/にHTMLとして書き出す。git commit・pushは別途行うこと。
const fs = require("fs");
const path = require("path");
const { generateArticle, generateMarketing } = require("./content_team");
const { publishArticle, readArticleIndex, CATEGORIES } = require("./publish_article");

const RAW_DIR = path.join(__dirname, "..", "data", "articles_raw");
const PENDING_DIR = path.join(__dirname, "..", "data", "pending");
const REPORT_DIR = path.join(__dirname, "..", "data", "check_reports");
const MARKETING_DIR = path.join(__dirname, "..", "marketing", "articles");

async function main() {
  // --category=fx のようにカテゴリを明示できる(「NISAの外側の投資」の記事は必ず指定する)
  const args = process.argv.slice(2);
  const categoryArg = args.find((a) => a.startsWith("--category="));
  const category = categoryArg ? categoryArg.slice("--category=".length) : null;
  const fresh = args.includes("--fresh");
  const topic = args.filter((a) => a !== categoryArg && a !== "--no-marketing" && a !== "--fresh").join(" ").trim();
  if (!topic) {
    console.error("使い方: node content_team/generate_article.js [--category=fudousan|fx|crypto] \"記事テーマ\"");
    process.exit(1);
  }
  if (category && !CATEGORIES.some((c) => c.key === category)) {
    console.error(`[エラー] 不明なカテゴリ: ${category}`);
    process.exit(1);
  }
  const highRisk = Boolean(category && CATEGORIES.find((c) => c.key === category).highRisk);

  console.log(`[開始] テーマ: ${topic}`);
  console.log("[課金] Claude Code CLI(サブスクリプション)経由。追加のAPI課金は発生しません。");

  const article = await generateArticle(topic, (label) => {
    console.log(`[進行中] ${label}`);
  }, { highRisk, fresh });
  if (category) article.category = category;

  // チェック報告(ハルシネーションチェック部門・最終チェック部門)は、合否に関係なく残す。
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, `${article.slug}.md`),
    `# チェック報告: ${article.title}\n\n判定: **${article.verdict}**(${article.createdAt})\n\n${article.hallucinationReport}\n\n${article.finalCheckReport}\n`, "utf8");

  // 最終チェック部門が不合格にした記事は公開しない(data/pending/ に置いて、Kさんの判断を待つ)。
  if (article.verdict !== "PASS") {
    fs.mkdirSync(PENDING_DIR, { recursive: true });
    fs.writeFileSync(path.join(PENDING_DIR, `${article.slug}.json`), JSON.stringify(article, null, 2), "utf8");
    console.error(`[不合格] 最終チェック部門が公開を止めました。記事は data/pending/${article.slug}.json、報告は data/check_reports/${article.slug}.md`);
    process.exit(2);
  }

  // 生成元データ(本文Markdown等)を保存しておく。テンプレートやスタイルを
  // 直したいだけの時に、CLIを再実行せず再描画できるようにするため。
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.writeFileSync(path.join(RAW_DIR, `${article.slug}.json`), JSON.stringify(article, null, 2), "utf8");

  const filePath = publishArticle(article);
  console.log(`[完了] 記事を書き出しました: ${filePath}`);
  console.log(`  タイトル: ${article.title}`);
  console.log(`  スラッグ: ${article.slug}`);
  console.log(`  メタ: ${article.meta}`);

  // マーケティング部門: SNS投稿案などの下書きを作る(投稿はKさんの確認後に行う。自動投稿はしない)。
  if (!process.argv.includes("--no-marketing")) {
    try {
      console.log("[進行中] マーケティング部門(5人分)");
      const md = await generateMarketing(article, readArticleIndex().filter((a) => a.category !== "kyounonews"));
      const url = `https://jibetanoai.github.io/invest-media/articles/${article.slug}.html`;
      fs.mkdirSync(MARKETING_DIR, { recursive: true });
      fs.writeFileSync(path.join(MARKETING_DIR, `${article.slug}.md`),
        `# マーケティング案(下書き): ${article.title}\n\n記事URL: ${url}\n※投稿はKさんの確認後に行う。\n\n${md.replace(/\{URL\}/g, url)}\n`, "utf8");
      console.log(`[完了] マーケティング案: marketing/articles/${article.slug}.md`);
    } catch (err) {
      console.error(`[注意] マーケティング部門は失敗しました(記事の公開には影響なし): ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error("[エラー] 記事生成に失敗しました:", err.message);
  process.exit(1);
});
