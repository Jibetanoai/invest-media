// 「AIコンテンツ制作会社」。投資・資産形成メディアの記事を、証券会社ばりに役割分担した
// 7部署27人分の役割(market_appのAI投資委員会と同じ発想)で作る。
// 8回に分けると重すぎた(market_appでの反省)ので、3回のCLI呼び出しに集約する:
//   1. 企画・執筆チーム(編集企画室+リサーチ部+執筆部+SEO部+収益化部、計23人分)
//   2. レッドチーム(事実確認・誇大表現・金融ルールの3人分)
//   3. 編集長+バックオフィス(最終編集、校正・公開管理・実績記録の3人分)
const fs = require("fs");
const path = require("path");
const { runClaudeCLI } = require("./claude_cli");

// このメディア全体の編集方針(元ネタのAI投資委員会の3原則に相当)。
const EDITORIAL_POLICY = `
編集方針(全部署共通・厳守):
1. 「必ず儲かる」「絶対に増える」等、利益や成果を保証する表現は使わない(景品表示法・金融商品取引法に抵触するため)。
2. 特定の金融商品の売買を断定的に勧誘しない。あくまで情報提供・比較検討の材料として書く。
3. 個人の資産状況や目標を踏まえた個別の投資助言はしない(一般的な情報提供にとどめる)。
4. 記事の最後に「本記事は情報提供を目的としており、投資勧誘や助言を目的としたものではありません。投資判断はご自身の責任で行ってください。」という趣旨の注記を必ず入れる。
5. 記事中の商品・サービスへのリンクの一部にアフィリエイトリンクが含まれる場合がある旨を、記事の冒頭または末尾で開示する。

このメディアの主な収益源: 証券口座開設(NISA口座・つみたて investment口座等)の比較・案内。
記事のテーマ次第で不自然にならない範囲で、「証券会社選びのポイント」「口座開設の比較」に
自然につながる流れを意識すること(特定1社を断定的に推すのではなく、比較の観点を示す形)。`;

// 7部署27人分の役割定義(記事制作向けに再編)。「編集企画室」の2人目(編集長)は、
// 各部署の成果物が揃った後の最終まとめ役なので、この配列には含めず
// generateArticle()の最後で別枠として扱う。
const DEPARTMENTS = [
  {
    key: "planning",
    label: "編集企画室",
    intro: "編集方針を守る部署。",
    roles: [
      { label: "編集方針の番人", mandate: "この記事の内容が編集方針(誇大表現・断定的勧誘の禁止等)に沿っているかを確認する" },
    ],
  },
  {
    key: "research",
    label: "リサーチ部",
    intro: "記事のネタになる材料を集める部署。Web検索で最新情報を調べる。",
    roles: [
      { label: "最新ニュース担当", mandate: "このテーマに関する直近のニュース・動向を調べる" },
      { label: "統計データ担当", mandate: "裏付けとなる統計・数値データを調べる" },
      { label: "競合記事分析担当", mandate: "同じテーマで検索上位に出てきそうな他媒体の記事内容を調べ、差別化できる切り口を考える" },
      { label: "読者の検索意図担当", mandate: "このテーマで検索する読者が本当に知りたいことは何かを整理する" },
      { label: "専門用語解説担当", mandate: "記事中に出てくる専門用語のうち、初心者向けに解説が必要なものを洗い出す" },
      { label: "出典・引用担当", mandate: "記事中で使うデータ・事実の出典元(記事URL・発表元)を明記する" },
      { label: "トレンド担当", mandate: "このテーマが今読まれるべき理由(時期的な旬・話題性)を整理する" },
    ],
  },
  {
    key: "writing",
    label: "執筆部",
    intro: "記事の本文を書く部署。",
    roles: [
      { label: "構成担当", mandate: "見出し構成(H2/H3)を設計する" },
      { label: "本文執筆担当", mandate: "各見出しの本文を、初心者にも分かりやすい言葉で書く" },
      { label: "リード文・見出し担当", mandate: "読者の興味を引く導入文と、SEOも意識したタイトル案を複数考える" },
    ],
  },
  {
    key: "seo",
    label: "SEO部",
    intro: "検索から読者に見つけてもらうための部署。",
    roles: [
      { label: "キーワード選定担当", mandate: "このテーマで狙うべき検索キーワードを選ぶ" },
      { label: "メタディスクリプション担当", mandate: "検索結果に表示される120字程度の説明文を書く" },
      { label: "内部リンク担当", mandate: "関連しそうな他テーマ(将来書ける記事)へのリンク案を考える" },
      { label: "タイトル最終決定担当", mandate: "リード文・見出し担当が出したタイトル案から、検索されやすく誇大でないものを1つ選ぶ" },
    ],
  },
  {
    key: "monetization",
    label: "収益化部",
    intro: "「やりすぎない」収益化を考える部署。",
    roles: [
      { label: "リンク配置担当", mandate: "記事の自然な流れの中で、関連する商品・サービスへのリンクを置ける箇所を提案する(押し売りにならない位置)" },
      { label: "CTA文言担当", mandate: "リンク周りの誘導文言を、煽らない自然な表現で考える" },
      { label: "過剰演出チェック担当", mandate: "収益化の都合で表現が誇大・断定的になっていないかを確認する" },
      { label: "関連商品選定担当", mandate: "記事テーマに関連する一般的なジャンルの商品・サービス(書籍・口座開設等)を、特定の一社に偏らせず挙げる" },
      { label: "導線担当", mandate: "読者が記事を読み終えた後に取りそうな行動(比較する・調べる等)を想定し、次の一歩を提示する" },
    ],
  },
];

const redTeamDept = {
  key: "redteam",
  label: "レッドチーム",
  intro: "記事の内容にあえて疑いの目を向ける部署。同意はしないこと。",
  roles: [
    { label: "事実確認担当", mandate: "記事中の事実・データに誤りや古い情報がないかを確認する" },
    { label: "誇大表現チェック担当", mandate: "「絶対」「必ず」等の断定的・誇大な表現が残っていないかを指摘する" },
    { label: "金融ルールチェック担当", mandate: "個別助言や断定的な勧誘にあたる表現がないかを確認する" },
  ],
};

const backofficeDept = {
  key: "backoffice",
  label: "バックオフィス",
  intro: "最後の仕上げをする部署。",
  roles: [
    { label: "校正担当", mandate: "誤字脱字・表記ゆれを直す" },
    { label: "公開管理担当", mandate: "記事のスラッグ(URL用の英数字)を決める" },
    { label: "実績記録担当", mandate: "この記事がどのキーワード・読者層を狙ったものかを一言で記録する(内部管理用メモ)" },
  ],
};

function roleListMarkdown(depts) {
  return depts.map((dept) => {
    const roles = dept.roles.map((r, i) => `  ${i + 1}. **${r.label}**: ${r.mandate}`).join("\n");
    return `### ${dept.label}(${dept.intro})\n${roles}`;
  }).join("\n\n");
}

const PERSONA = `あなたは投資・資産形成をテーマにしたWebメディア「invest_media」の編集部です。読者は投資初心者〜中級者の一般個人です。断定を避けつつ、根拠を示して分かりやすく書くのが持ち味です。`;

function buildPlanningWritingPrompt(topic) {
  const allDepts = [...DEPARTMENTS];
  const systemPrompt = `${PERSONA}

---
補足: あなたは今、記事制作チームとして「企画・執筆チーム」を担当しています。以下の5部署23人分の役割をまとめて担当します。それぞれの視点で、Web検索ツールも使って調べたうえで作業してください。
${EDITORIAL_POLICY}

${roleListMarkdown(allDepts)}

出力形式(この形式を厳守すること):
TITLE: (記事タイトル)
META: (メタディスクリプション、120字程度)
KEYWORDS: (狙うキーワードをカンマ区切りで2〜4個)
<<<BODY>>>
(ここから記事本文。Markdown形式。## で始まる見出しを使うこと。リード文から始め、複数の見出しで構成し、記事の最後に編集方針5の注記を含めること。商品・サービスに触れる場合は一般名詞やジャンルで書き、特定のURLは書かなくてよい)

重要:
- 検索の過程で「調べてみるね」のような進捗の独り言を書かないこと。
- 指定した出力形式以外の前置き・後書きは書かないこと。`;

  const userPrompt = `記事テーマ: ${topic}\n\n上記テーマで、指定された形式の記事を作成してください。`;
  return { systemPrompt, userPrompt };
}

function buildRedTeamPrompt(topic, draft) {
  const systemPrompt = `${PERSONA}

---
補足: あなたは今、記事制作チームで${redTeamDept.label}を担当しています。${redTeamDept.intro}
${EDITORIAL_POLICY}

以下の担当ごとに、下書き記事をチェックしてください。
${roleListMarkdown([redTeamDept])}

出力形式:
## レッドチーム指摘事項
- (担当名): (指摘内容。問題がなければ「問題なし」と書く)
...(担当の数だけ)

重要:
- 少なくとも1つは具体的な改善提案を出すこと(問題なしで終わらせない)。
- 指定した出力形式以外の前置き・後書きは書かないこと。`;

  const userPrompt = `記事テーマ: ${topic}\n\n下書き記事は以下の通りです。レッドチームとしてチェックしてください。\n\n---\n${draft}`;
  return { systemPrompt, userPrompt };
}

function buildFinalEditPrompt(topic, draft, redTeamNotes) {
  const systemPrompt = `${PERSONA}

---
補足: あなたは今、記事制作チームの編集長として、${backofficeDept.label}(3人分)の作業も兼務して最終編集をしています。
${EDITORIAL_POLICY}

下書き記事とレッドチームの指摘を踏まえ、指摘事項を反映した最終版の記事を作成してください。${roleListMarkdown([backofficeDept])}

出力形式(この形式を厳守すること):
TITLE: (最終タイトル)
META: (最終メタディスクリプション)
SLUG: (URL用のスラッグ。英数字とハイフンのみ、日本語不可、例: nisa-tsumitate-kihon)
NOTE: (この記事が狙ったキーワード・読者層の内部管理メモを一言で)
<<<BODY>>>
(レッドチームの指摘を反映し、誤字脱字も直した最終版の記事本文。Markdown形式)

重要:
- レッドチームが指摘した問題は必ず解消すること。
- 指定した出力形式以外の前置き・後書きは書かないこと。`;

  const userPrompt = `記事テーマ: ${topic}\n\n【下書き】\n${draft}\n\n---\n\n【レッドチームの指摘】\n${redTeamNotes}\n\nこれを踏まえた最終版を作成してください。`;
  return { systemPrompt, userPrompt };
}

// TITLE:/META:/SLUG:/NOTE: の行と、<<<BODY>>>以降の本文を取り出す。
function parseArticleOutput(text) {
  const bodyMarker = "<<<BODY>>>";
  const idx = text.indexOf(bodyMarker);
  const header = idx >= 0 ? text.slice(0, idx) : text;
  const body = idx >= 0 ? text.slice(idx + bodyMarker.length).trim() : "";

  const get = (key) => {
    const m = header.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? m[1].trim() : null;
  };

  return {
    title: get("TITLE"),
    meta: get("META"),
    keywords: get("KEYWORDS"),
    slug: get("SLUG"),
    note: get("NOTE"),
    body,
  };
}

async function generateArticle(topic, onProgress) {
  if (onProgress) onProgress("企画・執筆チーム(5部署23人分)");
  const planPrompt = buildPlanningWritingPrompt(topic);
  const draftText = await runClaudeCLI({ ...planPrompt, tools: "WebSearch" });
  const draft = parseArticleOutput(draftText);
  if (!draft.body) throw new Error("下書きの本文が生成できなかったよ");

  if (onProgress) onProgress("レッドチーム(3人分)");
  const redTeamPrompt = buildRedTeamPrompt(topic, draftText);
  const redTeamNotes = await runClaudeCLI({ ...redTeamPrompt, tools: "WebSearch" });

  if (onProgress) onProgress("編集長+バックオフィス(まとめ)");
  const finalPrompt = buildFinalEditPrompt(topic, draftText, redTeamNotes);
  const finalText = await runClaudeCLI({ ...finalPrompt, tools: "" });
  const final = parseArticleOutput(finalText);
  if (!final.body) throw new Error("最終版の本文が生成できなかったよ");

  const slug = (final.slug || draft.title || topic)
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `article-${Date.now()}`;

  return {
    topic,
    title: final.title || draft.title || topic,
    meta: final.meta || draft.meta || "",
    keywords: draft.keywords || "",
    slug,
    note: final.note || "",
    bodyMarkdown: final.body,
    redTeamNotes,
    createdAt: new Date().toISOString(),
  };
}

module.exports = { generateArticle, DEPARTMENTS, EDITORIAL_POLICY };
