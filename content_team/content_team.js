// 「AIコンテンツ制作会社」。投資・資産形成メディアの記事を、証券会社ばりに役割分担した
// 7部署27人分の役割(market_appのAI投資委員会と同じ発想)で作る。
// 8回に分けると重すぎた(market_appでの反省)ので、3回のCLI呼び出しに集約する:
//   1. 企画・執筆チーム(編集企画室+リサーチ部+執筆部+SEO部+収益化部、計23人分)
//   2. レッドチーム(事実確認・誇大表現・金融ルールの3人分)
//   3. 編集長+バックオフィス(最終編集、校正・公開管理・実績記録の3人分)
//   4. ハルシネーションチェック部門(数字・日付・固有名詞を1つずつ一次情報で確認し、誤りを直す)
//   5. 最終チェック部門(編集方針・ハルシネーション報告を踏まえて合否判定。不合格なら公開しない)
//   6. マーケティング部門(SNS投稿案・タイトル改善案・内部リンク案。投稿はKさんの確認後のみ)
// 2026-10-11 Kさん指示で4〜6を追加。
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { runClaudeCLI } = require("./claude_cli");

// このメディア全体の編集方針(元ネタのAI投資委員会の3原則に相当)。
const EDITORIAL_POLICY = `
編集方針(全部署共通・厳守):
1. 「必ず儲かる」「絶対に増える」等、利益や成果を保証する表現は使わない(景品表示法・金融商品取引法に抵触するため)。
2. 特定の金融商品の売買を断定的に勧誘しない。あくまで情報提供・比較検討の材料として書く。
3. 個人の資産状況や目標を踏まえた個別の投資助言はしない(一般的な情報提供にとどめる)。
4. 「本記事は情報提供を目的としており、投資勧誘や助言を目的としたものではありません」という趣旨の免責文は、サイト側のテンプレートが全記事末尾に自動で必ず挿入するため、本文(bodyMarkdown)の中では書かない・繰り返さないこと。
5. 記事中の商品・サービスへのリンクの一部にアフィリエイトリンクが含まれる場合がある旨は、記事の冒頭で一度だけ開示する(末尾での重複開示は不要。これもテンプレート側で末尾に出る)。

このメディアの主な収益源: 証券口座開設(NISA口座・つみたて investment口座等)の比較・案内。
記事のテーマ次第で不自然にならない範囲で、「証券会社選びのポイント」「口座開設の比較」に
自然につながる流れを意識すること(特定1社を断定的に推すのではなく、比較の観点を示す形)。

SEO方針(全記事共通・2026-10-25 Kさん指示「大手に勝てるようにSEOを徹底」):
S1. 狙う主キーワードを、タイトルの前半(なるべく先頭20字以内)に自然に入れる。タイトルは全角32字前後を目安にし、長くても40字程度にする。
S2. メタディスクリプションは主キーワードを含めて80〜120字。この記事で分かることを具体的に書く。
S3. リード文の最初の3文以内で、検索した人の疑問への結論(答え)を先に示す。
S4. H2見出しには関連キーワード(共起語・よく一緒に検索される語)を自然に入れ、見出しだけ読んでも要点が分かる構成にする。キーワードの詰め込みはしない。
S5. 比較や条件の整理には表を使い、数字には時点と出典(一次情報へのリンク)を添える。
S6. 記事の終盤(まとめの前)に「## よくある質問」の見出しを置き、検索されやすい疑問を「### Q. 〜?」の形で3〜5個、各回答は2〜4文で書く(サイト側でFAQの構造化データに使う)。
S7. 他サイトの言い換えにしない。計算例・チェックリスト・判断の分かれ目を整理した表など、この記事ならではの整理を1つ以上入れる。
S8. 本文で関連テーマに触れるときは「別の記事で詳しく整理しています」程度にとどめる(関連記事へのリンクはサイト側で自動で付く)。`

// 「NISAの外側の投資」(不動産投資・FX・暗号資産)の記事だけに追加する編集方針。
// 仕組みとリスクを中立に整理する記事にとどめ、始め方・業者比較・勧誘寄りにはしない(2026-09-26 Kさん決定)。
const HIGH_RISK_POLICY = `
追加の編集方針(この記事は「NISAの外側の投資」= 不動産投資・FX・暗号資産を扱う。上の方針に加えて厳守):
A. 仕組み・リスク・コスト・税金・NISAとの違いを中立に整理する記事にする。始め方の手順、業者の比較・ランキング、特定の業者やサービスの推奨は書かない。
B. リスク(元本割れ、レバレッジによる証拠金以上の損失やロスカット、価格の急変、交換業者の破綻・不正流出、空室・家賃下落・金利上昇・流動性の低さ等)を本文の前半で具体的に書く。メリットだけを強調しない。
C. 「少額で簡単」「不労所得」「高利回り」「今がチャンス」など、魅力を煽る表現は使わない。
D. 金融庁・消費者庁・国民生活センター・国土交通省などの公的な注意喚起(無登録業者、詐欺的な勧誘、SNSやマッチングアプリ経由の勧誘、サブリース契約のトラブル等)があれば出典つきで紹介し、業者の登録状況は公的な一覧で確認するよう案内する。
E. 税金の扱いは最新の公的情報(国税庁・財務省など)で確認して書く。税制改正の予定や検討中の内容は、現行制度と明確に区別して「予定」「検討段階」と書く。
F. 「生活防衛資金やNISAなど長期・分散の土台を先に整えてから検討する人が多い」といった考え方は、断定を避けた一般論として示してよい。
G. 上の方針の末尾にある「証券口座開設につながる流れを意識する」は、この記事では適用しない。無理に証券口座の話へつなげない。`;

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

function buildPlanningWritingPrompt(topic, extraPolicy = "") {
  const allDepts = [...DEPARTMENTS];
  const systemPrompt = `${PERSONA}

---
補足: あなたは今、記事制作チームとして「企画・執筆チーム」を担当しています。以下の5部署23人分の役割をまとめて担当します。それぞれの視点で、Web検索ツールも使って調べたうえで作業してください。
${EDITORIAL_POLICY}${extraPolicy}

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

function buildRedTeamPrompt(topic, draft, extraPolicy = "") {
  const systemPrompt = `${PERSONA}

---
補足: あなたは今、記事制作チームで${redTeamDept.label}を担当しています。${redTeamDept.intro}
${EDITORIAL_POLICY}${extraPolicy}

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

function buildFinalEditPrompt(topic, draft, redTeamNotes, extraPolicy = "") {
  const systemPrompt = `${PERSONA}

---
補足: あなたは今、記事制作チームの編集長として、${backofficeDept.label}(3人分)の作業も兼務して最終編集をしています。
${EDITORIAL_POLICY}${extraPolicy}

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


// ---- 4. ハルシネーションチェック部門 ----
const hallucinationDept = {
  key: "hallucination",
  label: "ハルシネーションチェック部門",
  intro: "記事中の事実を1つずつ一次情報で確かめ、確かめられないものは残さない部署。",
  roles: [
    { label: "事実抽出担当", mandate: "本文から、数字・割合・金額・日付・制度名・会社名・サービス名・法令・統計・引用を含む文をすべて抜き出す" },
    { label: "一次情報照合担当", mandate: "抜き出した事実を、公式サイト・官公庁・発表元のプレスリリースなど一次情報で1つずつ確認する(検索結果の要約や個人ブログだけで確認済みにしない)" },
    { label: "出典整合担当", mandate: "本文の数字と、記事末尾の出典に書かれている内容が一致しているかを確認する(出典に書いていないことを出典扱いにしない)" },
    { label: "修正担当", mandate: "誤りは正しい内容に直し、確認できなかった事実は削除するか「〜とされています(出典)」程度にとどめる。条件付きの数字は条件を省略しない" },
  ],
};

function buildHallucinationPrompt(topic, finalText, extraPolicy = "") {
  const systemPrompt = `${PERSONA}

---
補足: あなたは今、${hallucinationDept.label}を担当しています。${hallucinationDept.intro}
${EDITORIAL_POLICY}${extraPolicy}

${roleListMarkdown([hallucinationDept])}

作業手順:
1. 事実を含む文をすべて番号付きで抜き出す。
2. WebSearch と WebFetch で、できるだけ一次情報のページを開いて1つずつ確かめる。
3. 判定は「確認済み」「誤り」「確認できず」の3つ。確認済みには根拠URLを付ける。
4. 誤り・確認できずの文を直した記事全文を出す。

出力形式(厳守):
## ハルシネーションチェック報告
| No | 本文の記述 | 判定 | 根拠URL | 対応 |
|---|---|---|---|---|
(全項目)
TITLE: (タイトル。数字に誤りがあれば直す)
META: (メタディスクリプション。同上)
<<<BODY>>>
(修正済みの記事本文全文。Markdown)

重要:
- 「たぶん正しい」は確認済みにしない。確認できなかったものは本文から消すか、断定しない書き方に直す。
- 本文の構成・言い回しは、事実の修正に必要な範囲以外は変えない。
- 指定した出力形式以外の前置き・後書きは書かない。`;
  const userPrompt = `記事テーマ: ${topic}\n\n以下の記事をチェックしてください。\n\n---\n${finalText}`;
  return { systemPrompt, userPrompt };
}

// ---- 5. 最終チェック部門 ----
const finalCheckDept = {
  key: "finalcheck",
  label: "最終チェック部門",
  intro: "公開してよいかを最後に判定する部署。迷ったら不合格にする。",
  roles: [
    { label: "コンプライアンス担当", mandate: "利益の保証・断定的な勧誘・個別の投資助言・煽り表現がないか(金融商品取引法・景品表示法)" },
    { label: "事実チェック担当", mandate: "ハルシネーションチェック報告で「誤り」「確認できず」だった項目が、本文で直っているか" },
    { label: "読者目線担当", mandate: "初心者が読んで誤解しないか(条件付きの数字が条件なしで書かれていないか、古い情報が今の話として書かれていないか)" },
    { label: "体裁担当", mandate: "アフィリエイト開示が冒頭に1回あるか、免責文を本文で繰り返していないか、確認時点(○年○月時点)が書かれているか" },
  ],
};

function buildFinalCheckPrompt(topic, checkedText, hallucinationReport, extraPolicy = "") {
  const systemPrompt = `${PERSONA}

---
補足: あなたは今、${finalCheckDept.label}を担当しています。${finalCheckDept.intro}
${EDITORIAL_POLICY}${extraPolicy}

${roleListMarkdown([finalCheckDept])}

出力形式(厳守):
VERDICT: PASS または FAIL
## 最終チェック報告
- (担当名): (確認結果。問題があれば具体的に)
...
TITLE: (最終タイトル。直す必要がなければそのまま)
META: (最終メタディスクリプション)
<<<BODY>>>
(軽微な問題はここで直した最終本文。FAILの場合も本文は出す)

判定基準:
- 編集方針違反、または直っていない事実の誤りが1つでもあれば FAIL。
- 表現の小さな修正で解決できるものは直したうえで PASS にしてよい。`;
  const userPrompt = `記事テーマ: ${topic}\n\n【ハルシネーションチェック報告】\n${hallucinationReport}\n\n【チェック後の記事】\n${checkedText}`;
  return { systemPrompt, userPrompt };
}

// ---- 6. マーケティング部門 ----
const marketingDept = {
  key: "marketing",
  label: "マーケティング部門",
  intro: "記事を必要な人に届ける部署。ブランドはASSET LAB(ブログ「投資のキホン」はASSET LABが運営)。煽らない。",
  roles: [
    { label: "SNS担当(X)", mandate: "Xの投稿案を2本(各140字以内、記事URLは {URL} と書く)。煽り・断定・利益保証の表現は使わない" },
    { label: "SNS担当(Instagram)", mandate: "Instagramのキャプション案を1本(本文200字程度+ハッシュタグ5〜8個。リンクはプロフィールから、と書く)" },
    { label: "YouTube連携担当", mandate: "この記事をもとにしたショート動画(約40秒)のネタ案を1つ、タイトル案と3行の流れで" },
    { label: "検索流入担当", mandate: "検索結果でクリックされやすく、誇大でないタイトル案とメタディスクリプション案を1つずつ(採用はKさんが判断)" },
    { label: "内部リンク担当", mandate: "サイト内の既存記事一覧から、この記事と一緒に読まれるとよい記事を3本選ぶ" },
  ],
};

function buildMarketingPrompt(article, existingArticles) {
  const list = existingArticles.map((a) => `- ${a.slug}: ${a.title}`).join("\n");
  const systemPrompt = `${PERSONA}

---
補足: あなたは今、${marketingDept.label}を担当しています。${marketingDept.intro}
${EDITORIAL_POLICY}

${roleListMarkdown([marketingDept])}

出力はMarkdownで、担当ごとに見出しを分けて書く。投稿はKさんが確認してから行うので、「下書き」として書くこと。`;
  const userPrompt = `記事タイトル: ${article.title}\nメタ: ${article.meta}\n\n【本文】\n${article.bodyMarkdown}\n\n【サイト内の既存記事】\n${list}`;
  return { systemPrompt, userPrompt };
}

function parseVerdict(text) {
  const m = text.match(/^VERDICT:\s*(PASS|FAIL)/m);
  return m ? m[1] : "FAIL";
}
function reportPart(text) {
  const idx = text.search(/^TITLE:/m);
  return (idx >= 0 ? text.slice(0, idx) : text).trim();
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

// options.highRisk: true のとき「NISAの外側の投資」向けの追加編集方針を全段階のプロンプトに入れる。
// 途中経過の保存先。各段階が終わるたびに data/drafts/<テーマのハッシュ>/ に書き出す。
// 時間切れで止まっても、そこまでの下書きを見られる。同じテーマで再実行すると、
// 保存済みの段階は飛ばして続きから始める(最初からやり直したいときは --fresh)。
const DRAFTS_DIR = path.join(__dirname, "..", "data", "drafts");

function stageStore(topic, fresh) {
  const id = crypto.createHash("sha1").update(topic).digest("hex").slice(0, 12);
  const dir = path.join(DRAFTS_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "_テーマ.txt"), `${topic}\n`, "utf8");
  return {
    dir,
    async run(name, label, fn, onProgress) {
      const file = path.join(dir, name);
      if (!fresh && fs.existsSync(file)) {
        if (onProgress) onProgress(`${label}(保存済みの結果を使う: ${path.relative(process.cwd(), file)})`);
        return fs.readFileSync(file, "utf8");
      }
      if (onProgress) onProgress(label);
      const text = await fn();
      fs.writeFileSync(file, text, "utf8");
      return text;
    },
  };
}

async function generateArticle(topic, onProgress, options = {}) {
  const extraPolicy = options.highRisk ? HIGH_RISK_POLICY : "";
  const store = stageStore(topic, options.fresh);
  if (onProgress) onProgress(`途中経過の保存先: ${path.relative(process.cwd(), store.dir)}/`);
  const planPrompt = buildPlanningWritingPrompt(topic, extraPolicy);
  const draftText = await store.run("1_下書き.md", "企画・執筆チーム(5部署23人分)",
    () => runClaudeCLI({ ...planPrompt, tools: "WebSearch", timeoutMs: 10 * 60 * 1000 }), onProgress);
  const draft = parseArticleOutput(draftText);
  if (!draft.body) throw new Error("下書きの本文が生成できなかったよ");

  const redTeamPrompt = buildRedTeamPrompt(topic, draftText, extraPolicy);
  const redTeamNotes = await store.run("2_レッドチーム指摘.md", "レッドチーム(3人分)",
    () => runClaudeCLI({ ...redTeamPrompt, tools: "WebSearch", timeoutMs: 10 * 60 * 1000 }), onProgress);

  const finalPrompt = buildFinalEditPrompt(topic, draftText, redTeamNotes, extraPolicy);
  const finalText = await store.run("3_仕上げ.md", "編集長+バックオフィス(まとめ)",
    () => runClaudeCLI({ ...finalPrompt, tools: "" }), onProgress);
  const final = parseArticleOutput(finalText);
  if (!final.body) throw new Error("最終版の本文が生成できなかったよ");

  // 4. ハルシネーションチェック部門(一次情報で1つずつ確認・修正)
  const hcPrompt = buildHallucinationPrompt(topic, `TITLE: ${final.title}\nMETA: ${final.meta}\n<<<BODY>>>\n${final.body}`, extraPolicy);
  const hcText = await store.run("4_ハルシネーションチェック.md", "ハルシネーションチェック部門(4人分)",
    () => runClaudeCLI({ ...hcPrompt, tools: "WebSearch,WebFetch", timeoutMs: 15 * 60 * 1000 }), onProgress);
  const hallucinationReport = reportPart(hcText);
  const checked = parseArticleOutput(hcText);
  if (!checked.body) throw new Error("ハルシネーションチェック後の本文が取れなかったよ");

  // 5. 最終チェック部門(合否判定)
  const fcPrompt = buildFinalCheckPrompt(topic, `TITLE: ${checked.title || final.title}\nMETA: ${checked.meta || final.meta}\n<<<BODY>>>\n${checked.body}`, hallucinationReport, extraPolicy);
  const fcText = await store.run("5_最終チェック.md", "最終チェック部門(4人分)",
    () => runClaudeCLI({ ...fcPrompt, tools: "" }), onProgress);
  const verdict = parseVerdict(fcText);
  const finalCheckReport = reportPart(fcText);
  const approved = parseArticleOutput(fcText);

  const slug = (final.slug || draft.title || topic)
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `article-${Date.now()}`;

  return {
    topic,
    title: approved.title || checked.title || final.title || draft.title || topic,
    meta: approved.meta || checked.meta || final.meta || draft.meta || "",
    keywords: draft.keywords || "",
    slug,
    note: final.note || "",
    bodyMarkdown: approved.body || checked.body,
    redTeamNotes,
    hallucinationReport,
    finalCheckReport,
    verdict,
    createdAt: new Date().toISOString(),
  };
}

// 6. マーケティング部門。記事の公開(=最終チェック合格)後に呼ぶ。投稿は自動では行わない。
async function generateMarketing(article, existingArticles) {
  const prompt = buildMarketingPrompt(article, existingArticles);
  return runClaudeCLI({ ...prompt, tools: "" });
}

module.exports = { generateArticle, generateMarketing, buildHallucinationPrompt, buildFinalCheckPrompt, parseVerdict, reportPart, DEPARTMENTS, EDITORIAL_POLICY, HIGH_RISK_POLICY };
