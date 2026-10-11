// 公開済みの記事に、あとから「ハルシネーションチェック部門」と「最終チェック部門」をかける。
// 使い方: node content_team/check_article.js スラッグ [--apply]
//   報告は data/check_reports/<スラッグ>.md に保存する。
//   --apply を付けると、最終チェックが PASS のときだけ修正済みの本文で articles_raw を更新して再描画する
//   (pushは別途。FAILのときは本文を変えず、報告だけ残す)。
const fs = require("fs");
const path = require("path");
const { runClaudeCLI } = require("./claude_cli");
const { buildHallucinationPrompt, buildFinalCheckPrompt, parseVerdict, reportPart, HIGH_RISK_POLICY } = require("./content_team");
const { publishArticle, CATEGORIES } = require("./publish_article");

const RAW_DIR = path.join(__dirname, "..", "data", "articles_raw");
const REPORT_DIR = path.join(__dirname, "..", "data", "check_reports");

function parse(text) {
  const idx = text.indexOf("<<<BODY>>>");
  const header = idx >= 0 ? text.slice(0, idx) : text;
  const get = (k) => { const m = header.match(new RegExp(`^${k}:\\s*(.+)$`, "m")); return m ? m[1].trim() : null; };
  return { title: get("TITLE"), meta: get("META"), body: idx >= 0 ? text.slice(idx + 10).trim() : "" };
}

async function main() {
  const slug = process.argv[2];
  const apply = process.argv.includes("--apply");
  const file = path.join(RAW_DIR, `${slug}.json`);
  if (!slug || !fs.existsSync(file)) {
    console.error("使い方: node content_team/check_article.js スラッグ [--apply]");
    process.exit(1);
  }
  const article = JSON.parse(fs.readFileSync(file, "utf8"));
  const cat = CATEGORIES.find((c) => c.key === article.category);
  const extraPolicy = cat && cat.highRisk ? HIGH_RISK_POLICY : "";
  const topic = article.topic || article.title;

  console.log(`[開始] ${article.title}`);
  console.log("[課金] Claude Code CLI(サブスクリプション)経由。追加のAPI課金は発生しません。");
  console.log("[進行中] ハルシネーションチェック部門(4人分)");
  const hcText = await runClaudeCLI({
    ...buildHallucinationPrompt(topic, `TITLE: ${article.title}\nMETA: ${article.meta}\n<<<BODY>>>\n${article.bodyMarkdown}`, extraPolicy),
    tools: "WebSearch,WebFetch", timeoutMs: 15 * 60 * 1000,
  });
  const hcReport = reportPart(hcText);
  const checked = parse(hcText);
  if (!checked.body) throw new Error("ハルシネーションチェック後の本文が取れなかったよ");

  console.log("[進行中] 最終チェック部門(4人分)");
  const fcText = await runClaudeCLI({
    ...buildFinalCheckPrompt(topic, `TITLE: ${checked.title || article.title}\nMETA: ${checked.meta || article.meta}\n<<<BODY>>>\n${checked.body}`, hcReport, extraPolicy),
    tools: "",
  });
  const verdict = parseVerdict(fcText);
  const approved = parse(fcText);

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportFile = path.join(REPORT_DIR, `${slug}.md`);
  fs.writeFileSync(reportFile, `# チェック報告: ${article.title}\n\n判定: **${verdict}**(${new Date().toISOString()})\n\n${hcReport}\n\n${reportPart(fcText)}\n`, "utf8");
  console.log(`[判定] ${verdict} / 報告: data/check_reports/${slug}.md`);

  if (apply && verdict === "PASS") {
    article.title = approved.title || checked.title || article.title;
    article.meta = approved.meta || checked.meta || article.meta;
    article.bodyMarkdown = approved.body || checked.body;
    article.updatedAt = new Date().toISOString();
    article.hallucinationReport = hcReport;
    article.finalCheckReport = reportPart(fcText);
    article.verdict = verdict;
    fs.writeFileSync(file, JSON.stringify(article, null, 2), "utf8");
    publishArticle(article);
    console.log("[反映] 修正済みの本文で再描画しました(pushは別途)。");
  } else if (apply) {
    console.log("[未反映] 不合格のため本文は変えていません。報告を見て判断してください。");
  }
}

main().catch((err) => { console.error("[エラー]", err.message); process.exit(1); });
