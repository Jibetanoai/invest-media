// generateArticle()の結果を、SEOタグ込みの静的HTMLとして書き出し、
// 記事一覧(index.html)・サイトマップ・記事インデックス(data/articles.json)を
// 更新する。git commit・pushは別途手動(または依頼)で行う想定。
const fs = require("fs");
const path = require("path");
const { markdownToHtml, findBrokenTables } = require("./markdown");
const { PR_BOXES } = require("./pr_boxes");
const { DIAGRAMS } = require("./diagrams");
const { ARTICLE_ORDER_INDEX } = require("./article_order");
const site = require("./site_config");

const DOCS_DIR = path.join(__dirname, "..", "docs");
const ARTICLES_DIR = path.join(DOCS_DIR, "articles");
const INDEX_DATA_FILE = path.join(__dirname, "..", "data", "articles.json");

// 証券口座の選び方ガイド(shoken-koza-guide.html)のセクション構成と合わせたカテゴリ分類。
// 新規記事は generate_article.js のトピック文言からキーワードで自動推定するが、
// 分類が合わない場合は data/articles.json の該当エントリの category を手動修正すればよい。
const CATEGORIES = [
  // 記事一覧のタブは3段に分ける(group)。kihon=投資のキホン(はじめての人)、ouyou=投資の応用(慣れてきた人)、
  // soto=NISAの外側の投資(リスク高め)。keyは記事データ・URLのハッシュに使うので変えないこと。
  { key: "kihon", label: "① 制度の全体像・基本", group: "kihon" },
  { key: "kouza", label: "② 口座を比較する", group: "kihon" },
  { key: "hajimeru", label: "③ 実際に始める", group: "kihon" },
  { key: "shouhin", label: "④ 商品を選ぶ", group: "kihon" },
  { key: "kaikata", label: "⑤ 買い方を決める", group: "kihon" },
  { key: "heiyou", label: "⑥ 他の制度と使い分ける", group: "kihon" },
  { key: "hajimetaato", label: "⑦ 始めた後に読む", group: "kihon" },
  { key: "credit", label: "⑧ クレジットカード・ポイント", group: "kihon" },
  // こどもNISA(2027年開始予定)は大枠テーマを1つ独立させて、関連記事をまとめる。
  { key: "kodomo", label: "こどもNISAの記事", group: "kodomo" },
  { key: "kobetsu", label: "⑨ 個別株・取引の実践", group: "ouyou" },
  { key: "souba", label: "⑩ 相場・経済の見方", group: "ouyou" },
  { key: "rekishi", label: "⑪ 相場の歴史(暴落・暴騰を振り返る)", group: "ouyou" },
  { key: "kyounonews", label: "今日の経済ニュース(毎朝更新)", group: "news" },
  // ここから下は「NISAの外側の投資」。値動き・損失リスクが大きめのジャンルなので、
  // 記事一覧では別のタブ列に分け、記事ページには冒頭に注意ボックスを出す。
  // 自動推定の対象外(既存記事の分類を変えないため)。generate_article.js の --category= で明示指定する。
  { key: "fudousan", label: "⑫ 不動産投資", group: "soto", highRisk: true },
  { key: "fx", label: "⑬ FX(外国為替証拠金取引)", group: "soto", highRisk: true },
  { key: "crypto", label: "⑭ 暗号資産(仮想通貨)", group: "soto", highRisk: true },
];
const TAB_GROUPS = {
  kihon: { label: "投資のキホン", note: "はじめての人向け。NISAの仕組みから、口座選び・始め方・クレカ積立まで" },
  kodomo: { label: "こどもNISA", note: "2027年開始予定の、子どものためのNISA。制度の中身・始め方・引き出しのルール・18歳以降まで" },
  ouyou: { label: "投資の応用", note: "慣れてきた人向け。個別株の実践、相場の見方、相場の歴史" },
  news: { label: "今日の経済ニュース", note: "毎朝、前日の日米の株式・為替市場の動きを整理しています" },
};
const CATEGORY_KEYWORD_RULES = [
  { key: "kodomo", words: ["こどもNISA", "こども支援NISA", "ジュニアNISA"] },
  { key: "credit", words: ["クレジットカード", "クレカ", "ポイント投資", "ポイント還元"] },
  { key: "kobetsu", words: ["個別株", "株主優待", "損切り", "利確", "ナンピン", "信用取引", "IPO", "注文方法", "機関投資家", "仕手株"] },
  { key: "rekishi", words: ["バブル崩壊", "ブラックマンデー", "リーマンショック", "コロナショック", "世界恐慌", "暴落の歴史", "暴騰の歴史", "相場の歴史"] },
  { key: "kaikata", words: ["積立", "一括投資", "つみたて投資枠", "成長投資枠", "クレカ積立", "ドルコスト"] },
  { key: "hajimetaato", words: ["含み損", "狼狽売り", "出口戦略", "取り崩し", "売り方"] },
  { key: "souba", words: ["経済指標", "景気循環", "景気サイクル", "セクターローテーション", "セクター", "金利", "為替", "インフレ", "決算シーズン", "相場", "マクロ経済", "ニュースの読み方", "ニュース", "雇用統計", "テクニカル指標", "移動平均線", "MACD", "RSI", "ボリンジャーバンド", "標準偏差", "出来高", "オシレーター", "モメンタム", "チャート", "マクロ経済学", "ミクロ経済", "需要と供給", "GDP", "アノマリー", "季節性"] },
  { key: "shouhin", words: ["インデックスファンド", "ETF", "全世界株式", "米国株式", "高配当", "分配金", "隠れコスト", "株主優待", "個別株"] },
  { key: "hajimeru", words: ["始め方", "ステップ", "毎月いくら", "新社会人", "口座開設から"] },
  { key: "kouza", words: ["証券会社の比較", "証券口座はどこ", "夫婦で", "金融機関は変更", "乗り換え"] },
  // iDeCo/イデコ単体は他の全記事にも汎用的に含まれ得るため、より具体的なルールに
  // マッチしなかった記事だけがここに落ちるよう最後に置く(例: NISAとの併用・使い分け系)。
  { key: "heiyou", words: ["iDeCo", "イデコ", "ふるさと納税", "ロボアドバイザー", "ロボアド"] },
];
function inferCategory(article) {
  const text = `${article.title || ""} ${article.topic || ""}`;
  for (const rule of CATEGORY_KEYWORD_RULES) {
    if (rule.words.some((w) => text.includes(w))) return rule.key;
  }
  return "kihon";
}

function gaSnippet() {
  if (!site.googleAnalyticsId) return "";
  const id = site.googleAnalyticsId;
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>
`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isHighRiskCategory(key) {
  const found = CATEGORIES.find((c) => c.key === key);
  return Boolean(found && found.highRisk);
}

// 「NISAの外側の投資」カテゴリの記事冒頭に出す注意ボックス。
const HIGH_RISK_NOTES = {
  fudousan: "不動産投資は、空室・家賃下落・金利上昇・修繕費などで想定どおりの収入にならないことがあり、借入(ローン)を使う場合は損失が自己資金を上回ることもあります。強引な勧誘やサブリース契約のトラブルについて、国土交通省・消費者庁などが注意を呼びかけています。",
  fx: "FXはレバレッジをかけて取引するため、相場の急変時には預けた証拠金以上の損失が出ることがあります。金融庁に登録していない業者による勧誘にも注意が必要です。",
  crypto: "暗号資産(仮想通貨)は価格の変動が非常に大きく、価値が大きく下がる可能性があります。交換業者の破綻や不正流出のリスクもあり、利用する際は金融庁・財務局に登録された業者かを確認する必要があります。",
};
function highRiskNoticeHtml(categoryKey) {
  if (!isHighRiskCategory(categoryKey)) return "";
  const note = HIGH_RISK_NOTES[categoryKey] || "";
  return `
    <aside class="risk-notice" role="note">
      <p class="risk-notice-label">⚠ NISAの外側の投資について</p>
      <p>${escapeHtml(note)}</p>
      <p>NISA(少額投資非課税制度)の対象外で、税金の扱いも異なります。この記事は仕組みやリスクを理解するための情報で、取引をすすめるものではありません。</p>
    </aside>`;
}

// 「NISAの外側の投資」の記事末尾の広告枠(本文とは分ける)。承認済みのリンクがあるカテゴリだけ出す。
function prBoxHtml(categoryKey) {
  const items = PR_BOXES[categoryKey] || [];
  if (!isHighRiskCategory(categoryKey) || items.length === 0) return "";
  return `
    <aside class="pr-box" aria-label="広告">
      <p class="pr-box-label">広告(PR)</p>
      <p class="pr-box-note">以下は広告です。この記事の内容は特定の事業者をすすめるものではありません。申し込む前に、各社の公式サイトでリスク・手数料・登録状況を確認してください。</p>
      <ul class="pr-links">
        ${items.map((it) => `<li class="pr-raw">${it.html}</li>`).join("\n        ")}
      </ul>
    </aside>`;
}

function categoryLabel(key) {
  const found = CATEGORIES.find((c) => c.key === key);
  return found ? found.label : CATEGORIES[0].label;
}

// 全ページ共通の<head>要素(SNS共有画像・ファビコン・テーマカラー)。
// rootはそのページからdocs直下への相対パス(トップは""、記事は"../")。
function commonHeadHtml(root) {
  const ogImage = `${site.baseUrl}/ogp.png`;
  return `<meta property="og:locale" content="ja_JP">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">
${site.twitterHandle ? `<meta name="twitter:site" content="${escapeHtml(site.twitterHandle)}">\n` : ""}<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1c1f27" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/png" sizes="32x32" href="${root}favicon-32.png">
<link rel="apple-touch-icon" href="${root}apple-touch-icon.png">`;
}

// 本文のh2に目次用のidを振り、h2が3つ以上ある記事には最初のh2の直前(リード文の後)に目次を入れる。
function addTableOfContents(bodyHtml) {
  const headings = [];
  const html = bodyHtml.replace(/<h2>(.*?)<\/h2>/g, (match, inner) => {
    const id = `sec-${headings.length + 1}`;
    headings.push({ id, text: inner.replace(/<[^>]+>/g, "") });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  if (headings.length < 3) return html;
  const toc = `<nav class="toc" aria-label="目次">
        <p class="toc-title">目次</p>
        <ol>${headings.map((h) => `<li><a href="#${h.id}">${h.text}</a></li>`).join("")}</ol>
      </nav>
      `;
  return html.replace('<h2 id="sec-1">', `${toc}<h2 id="sec-1">`);
}

function readArticleIndex() {
  if (!fs.existsSync(INDEX_DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(INDEX_DATA_FILE, "utf8")).articles || [];
  } catch {
    return [];
  }
}

function writeArticleIndex(articles) {
  fs.mkdirSync(path.dirname(INDEX_DATA_FILE), { recursive: true });
  fs.writeFileSync(INDEX_DATA_FILE, JSON.stringify({ articles }, null, 2), "utf8");
}

// 生成環境(ローカルはJST、クラウドルーティンはUTC)に関わらず、必ず日本時間の
// 日付で表示するための変換。実行環境のローカルタイムゾーンに依存するgetDate()等は
// 使わないこと(UTC環境だとJSTより日付が1日ズレる、特に深夜〜朝のクラウド実行時)。
function formatDateJa(iso) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}年${get("month")}月${get("day")}日`;
}

// 全記事共通のCTA。まとめガイド(shoken-koza-guide.html)は本文中どの記事
// からも自然にたどり着けるリンクが無かったため、本文の直後(免責文の前)に
// 毎回表示する。ガイド内には実際の証券会社アフィリエイトリンクがある。
function hubCtaHtml(categoryKey) {
  if (isHighRiskCategory(categoryKey)) {
    return `
    <div class="hub-cta">
      <p class="hub-cta-label">📌 まとめガイド</p>
      <p class="hub-cta-text">NISA・つみたて投資など、長期・分散の基本から整理したい方は、テーマ別にまとめたガイドページもご覧ください。</p>
      <a class="hub-cta-button" href="../shoken-koza-guide.html">証券口座の選び方 完全ガイドを見る →</a>
    </div>`;
  }
  return `
    <div class="hub-cta">
      <p class="hub-cta-label">📌 まとめガイド</p>
      <p class="hub-cta-text">口座選び・始め方・商品選びまで迷ったら、関連記事をテーマ別に整理したガイドページをご覧ください。</p>
      <a class="hub-cta-button" href="../shoken-koza-guide.html">証券口座の選び方 完全ガイドを見る →</a>
    </div>`;
}

// 同じカテゴリの記事を優先してリンクする。読む順番を決めてあるカテゴリでは「この記事の次」から
// 順に並べ(=次に読む記事)、今日の経済ニュースは新しい日付順。足りない分は他カテゴリで埋める。
function relatedArticlesHtml(current, allArticles) {
  const currentCategory = current.category || inferCategory(current);
  const sorted = allArticles.slice().sort(compareArticles);
  const sameCategory = sorted.filter((a) => (a.category || "kihon") === currentCategory);
  const pos = sameCategory.findIndex((a) => a.slug === current.slug);
  const ordered = currentCategory === "kyounonews" || pos === -1
    ? sameCategory
    : [...sameCategory.slice(pos + 1), ...sameCategory.slice(0, pos)];
  // 「NISAの外側の投資」の記事は、NISA側の記事の「あわせて読みたい」には混ぜない(逆は、他のハイリスク記事→NISA側の順で補う)
  const currentHighRisk = isHighRiskCategory(currentCategory);
  const others = sorted
    .filter((a) => (a.category || "kihon") !== currentCategory && a.category !== "kyounonews")
    .filter((a) => currentHighRisk || !isHighRiskCategory(a.category))
    .sort((a, b) => currentHighRisk ? isHighRiskCategory(b.category) - isHighRiskCategory(a.category) : 0);
  const candidates = currentCategory === "kyounonews"
    // ニュースは直近のニュース2本 + ニュースを読むための解説記事(相場・経済の見方)2本
    ? [...ordered.filter((a) => a.slug !== current.slug).slice(0, 2), ...others.filter((a) => a.category === "souba")]
    : [...ordered, ...others];
  const picked = candidates.filter((a) => a.slug !== current.slug).slice(0, 4);
  if (picked.length === 0) return "";
  return `
    <section class="related-articles">
      <h2 class="related-title">あわせて読みたい</h2>
      <ul>
        ${picked.map((a) => `<li><a href="${escapeHtml(a.slug)}.html">${escapeHtml(a.title)}</a></li>`).join("")}
      </ul>
    </section>`;
}

// bodyMarkdown内の `[DIAGRAM:id]` (1行)を、diagrams.jsに定義したSVGに
// 置き換える。markdown.jsが<,>をエスケープするためSVGをmarkdown内に直接
// 書けず、変換後のHTML文字列に対して後から差し込む方式にしている。
// 該当idが無い場合は元のまま(プレースホルダの文字列)を残す(サイレントに
// 消してしまうと図が抜けていることに気づきにくいため)。
function injectDiagrams(html) {
  return html.replace(/<p>\[DIAGRAM:([a-z0-9-]+)\]<\/p>/g, (match, id) => {
    const svg = DIAGRAMS[id];
    if (!svg) return match;
    return `<figure class="article-diagram">${svg}</figure>`;
  });
}

// 本文の「## よくある質問」内の「### Q. …」と回答から、FAQの構造化データ(FAQPage)を作る。なければnull。
function faqJsonLd(bodyMarkdown) {
  const lines = String(bodyMarkdown || "").split("\n");
  const start = lines.findIndex((l) => /^##\s*よくある質問/.test(l));
  if (start < 0) return null;
  const items = [];
  let cur = null;
  const clean = (t) => t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`>#]/g, "").replace(/\s+/g, " ").trim();
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    const q = line.match(/^(?:###\s*|\*\*)\s*Q[.．:：]?\s*(.+?)(?:\*\*)?\s*$/);
    if (q) { cur = { question: clean(q[1]), answer: [] }; items.push(cur); continue; }
    if (cur) cur.answer.push(line.replace(/^\s*\*{0,2}A[.．:：]\*{0,2}\s*/, ""));
  }
  const entities = items
    .map((it) => ({ q: it.question, a: clean(it.answer.join(" ")) }))
    .filter((it) => it.q && it.a)
    .map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } }));
  return entities.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: entities } : null;
}

function buildArticleHtml(article, allArticles) {
  const url = `${site.baseUrl}/articles/${article.slug}.html`;
  const bodyHtml = addTableOfContents(injectDiagrams(markdownToHtml(article.bodyMarkdown)));
  // 表の列がずれた記事は書き出さない(見出しと中身がずれたまま公開されるのを防ぐ)
  const brokenTables = findBrokenTables(bodyHtml);
  if (brokenTables.length) {
    throw new Error(`[表のずれ] ${article.slug}: ${brokenTables.join(" / ")}。元の文章(data/articles_raw/${article.slug}.json)の表を直してから書き出してね`);
  }
  const publishedIso = article.createdAt;
  // 公開後に内容を直した記事は、raw JSONに updatedAt(ISO文字列)を入れておくと更新日として表示・構造化データに反映される
  const modifiedIso = article.updatedAt || publishedIso;
  const categoryKey = article.category || inferCategory(article);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.meta,
    image: `${site.baseUrl}/ogp.png`,
    datePublished: publishedIso,
    dateModified: modifiedIso,
    author: site.authorName
      ? { "@type": "Person", name: site.authorName, url: `${site.baseUrl}/operator.html` }
      : { "@type": "Organization", name: site.siteName, url: `${site.baseUrl}/operator.html` },
    publisher: { "@type": "Organization", name: site.siteName, logo: { "@type": "ImageObject", url: `${site.baseUrl}/apple-touch-icon.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: site.siteName, item: `${site.baseUrl}/` },
      { "@type": "ListItem", position: 2, name: article.title, item: url },
    ],
  };
  const dateHtml = formatDateJa(modifiedIso) !== formatDateJa(publishedIso)
    ? `${formatDateJa(publishedIso)}公開 ・ ${formatDateJa(modifiedIso)}更新`
    : formatDateJa(publishedIso);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(article.title)} | ${site.siteName}</title>
<meta name="description" content="${escapeHtml(article.meta)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(article.title)}">
<meta property="og:description" content="${escapeHtml(article.meta)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${escapeHtml(site.siteName)}">
<meta property="article:published_time" content="${publishedIso}">
<meta property="article:modified_time" content="${modifiedIso}">
<meta name="twitter:title" content="${escapeHtml(article.title)}">
<meta name="twitter:description" content="${escapeHtml(article.meta)}">
${commonHeadHtml("../")}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
${faqJsonLd(article.bodyMarkdown) ? `<script type="application/ld+json">${JSON.stringify(faqJsonLd(article.bodyMarkdown))}</script>\n` : ""}${gaSnippet()}</head>
<body>

<header class="site-header">
  <div class="site-header-inner">
    <a href="../index.html" class="brand">${escapeHtml(site.siteName)}</a>
  </div>
</header>
<div class="disclosure-banner">本サイトはアフィリエイト広告を利用しています</div>

<main>
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <a href="../index.html">記事一覧</a><span aria-hidden="true">›</span><a href="../index.html#${categoryKey}">${escapeHtml(categoryLabel(categoryKey))}</a>
  </nav>
  <article>
    <header class="article-header">
      <div class="article-date">${dateHtml}${site.authorName ? ` ・ 執筆: <a href="../operator.html">${escapeHtml(site.authorName)}</a>` : ""}</div>
      <h1 class="article-title">${escapeHtml(article.title)}</h1>
    </header>
    ${highRiskNoticeHtml(categoryKey)}
    <div class="article-body">
      ${bodyHtml}
    </div>
    ${hubCtaHtml(categoryKey)}${prBoxHtml(categoryKey)}
    <div class="article-disclaimer">
      本記事は情報提供を目的としており、投資勧誘や助言を目的としたものではありません。投資判断はご自身の責任で行ってください。本サイトはアフィリエイト広告を利用しています。
    </div>
    ${relatedArticlesHtml(article, allArticles)}
  </article>
</main>

<footer class="site-footer">
  <a href="../operator.html">運営者情報</a>
  <a href="../privacy-policy.html">プライバシーポリシー</a>
  <a href="../contact.html">お問い合わせ</a>
  <p class="operated-by">投資のキホンは <strong>ASSET LAB</strong> が運営するブログです</p>
</footer>

</body>
</html>
`;
}

function articleCardHtml(a) {
  const risk = isHighRiskCategory(a.category);
  return `
      <a class="article-card${risk ? " is-risk" : ""}" href="articles/${escapeHtml(a.slug)}.html">
        <div class="article-card-date">${risk ? `<span class="risk-badge">⚠ NISAの外側の投資</span>` : ""}${formatDateJa(a.createdAt)}</div>
        <h2>${escapeHtml(a.title)}</h2>
        <p>${escapeHtml(a.meta)}</p>
      </a>
    `;
}

// 「今日の経済ニュース」だけは日付の新しい順、それ以外のカテゴリは
// カテゴリの並び(①〜⑭)→カテゴリ内はarticle_order.jsで定義した内容ベースの順序、
// という表示順にする。article_order.jsに載っていない記事はカテゴリ末尾(作成日の新しい順)。
function articleSortKey(a) {
  const category = a.category || "kihon";
  const categoryIdx = CATEGORIES.findIndex((c) => c.key === category);
  return { category, categoryIdx: categoryIdx === -1 ? CATEGORIES.length : categoryIdx };
}

function compareArticles(a, b) {
  const ka = articleSortKey(a);
  const kb = articleSortKey(b);
  if (ka.categoryIdx !== kb.categoryIdx) return ka.categoryIdx - kb.categoryIdx;

  if (ka.category === "kyounonews") {
    return b.createdAt.localeCompare(a.createdAt);
  }

  const orderA = ARTICLE_ORDER_INDEX[a.slug];
  const orderB = ARTICLE_ORDER_INDEX[b.slug];
  if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
  if (orderA !== undefined) return -1;
  if (orderB !== undefined) return 1;
  return b.createdAt.localeCompare(a.createdAt);
}

function buildIndexHtml(articles) {
  const sorted = articles.slice().sort(compareArticles);

  const categoryTabHtml = (c) => {
    const count = sorted.filter((a) => (a.category || "kihon") === c.key).length;
    if (count === 0) return "";
    return `<button type="button" class="category-tab${c.highRisk ? " is-risk" : ""}" role="tab" aria-selected="false" data-category="${c.key}">${escapeHtml(c.label)}<span class="category-tab-count">${count}</span></button>`;
  };
  const groupTabsHtml = (group, withAll) => {
    const buttons = CATEGORIES.filter((c) => c.group === group).map(categoryTabHtml).join("");
    const allButton = withAll
      ? `<button type="button" class="category-tab is-active" role="tab" aria-selected="true" data-category="all">すべて<span class="category-tab-count">${sorted.length}</span></button>`
      : "";
    if (buttons === "" && allButton === "") return "";
    const g = TAB_GROUPS[group];
    return `
  <div class="tab-group tab-group-${group}">
    <p class="tab-group-label">${escapeHtml(g.label)} <span>${escapeHtml(g.note)}</span></p>
    <div class="category-tabs" role="tablist">
      ${allButton}${buttons}
    </div>
  </div>`;
  };
  const highRiskButtons = CATEGORIES.filter((c) => c.highRisk).map(categoryTabHtml).join("");
  const highRiskTabsHtml = highRiskButtons === "" ? "" : `
  <div class="risk-tab-group">
    <p class="risk-tab-group-label">⚠ NISAの外側の投資 <span>値動き・損失のリスクが大きめのジャンルです。仕組みとリスクを知るための記事をまとめています</span></p>
    <div class="category-tabs" role="tablist">
      ${highRiskButtons}
    </div>
  </div>`;
  const tabsHtml = sorted.length === 0 ? "" : `${groupTabsHtml("kihon", true)}${groupTabsHtml("kodomo", false)}${groupTabsHtml("ouyou", false)}${groupTabsHtml("news", false)}
  ${highRiskTabsHtml}`;

  const searchHtml = sorted.length === 0 ? "" : `
  <div class="article-search">
    <input type="search" id="article-search-input" placeholder="キーワードで検索(例:NISA、iDeCo)" aria-label="記事をキーワードで検索">
  </div>`;

  const listHtml = sorted.length === 0
    ? `<div class="empty-state">まだ記事がありません。近日公開予定です。</div>`
    : sorted.map((a) => {
        const searchText = [a.title, a.meta, a.keywords].filter(Boolean).join(" ").toLowerCase();
        return `<div class="article-card-wrap" data-category="${escapeHtml(a.category || "kihon")}" data-search="${escapeHtml(searchText)}">${articleCardHtml(a)}</div>`;
      }).join("");

  const tabScript = sorted.length === 0 ? "" : `
<script>
(function() {
  var tabs = document.querySelectorAll(".category-tab");
  var cards = document.querySelectorAll(".article-card-wrap");
  var searchInput = document.getElementById("article-search-input");
  var currentCategory = "all";
  var currentQuery = "";
  var emptyEl = document.getElementById("article-list-empty");
  function applyFilter() {
    var visible = 0;
    cards.forEach(function(card) {
      var matchesCategory = currentCategory === "all" || card.getAttribute("data-category") === currentCategory;
      var matchesQuery = currentQuery === "" || card.getAttribute("data-search").indexOf(currentQuery) !== -1;
      card.hidden = !(matchesCategory && matchesQuery);
      if (!card.hidden) visible++;
    });
    if (emptyEl) emptyEl.hidden = visible !== 0;
  }
  function selectCategory(category) {
    var found = false;
    tabs.forEach(function(t) {
      var active = t.getAttribute("data-category") === category;
      if (active) found = true;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (!found) return selectCategory("all");
    currentCategory = category;
    applyFilter();
  }
  tabs.forEach(function(tab) {
    tab.addEventListener("click", function() {
      var category = tab.getAttribute("data-category");
      selectCategory(category);
      // 記事のパンくずから「index.html#カテゴリ」で戻ってきた時に同じタブが開くよう、URLにも残す
      history.replaceState(null, "", category === "all" ? location.pathname : "#" + category);
    });
  });
  if (location.hash.length > 1) selectCategory(decodeURIComponent(location.hash.slice(1)));
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      currentQuery = searchInput.value.trim().toLowerCase();
      applyFilter();
    });
  }
})();
</script>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.siteName,
    url: site.baseUrl,
    description: site.description,
  };

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(site.siteName)} | NISA・つみたて投資をやさしく整理</title>
<meta name="description" content="${escapeHtml(site.description)}">
<link rel="canonical" href="${site.baseUrl}/">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(site.siteName)} | NISA・つみたて投資をやさしく整理">
<meta property="og:description" content="${escapeHtml(site.description)}">
<meta property="og:url" content="${site.baseUrl}/">
<meta property="og:site_name" content="${escapeHtml(site.siteName)}">
${commonHeadHtml("")}
${site.googleSiteVerification ? `<meta name="google-site-verification" content="${escapeHtml(site.googleSiteVerification)}">\n` : ""}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
${gaSnippet()}</head>
<body>

<header class="site-header">
  <div class="site-header-inner">
    <h1 class="brand-heading"><a href="index.html" class="brand">${escapeHtml(site.siteName)}</a></h1>
    <p class="site-tagline">NISA・つみたて投資・証券口座選びを、はじめての人にもわかりやすく</p>
  </div>
</header>
<div class="disclosure-banner">本サイトはアフィリエイト広告を利用しています</div>

<main>
  <a class="article-card" href="shoken-koza-guide.html" style="border-color:var(--accent); margin-bottom:24px;">
    <div class="article-card-date">📌 まとめガイド</div>
    <h2>証券口座の選び方 完全ガイド</h2>
    <p>口座選び・始め方・商品選びまで、関連記事をテーマ別に整理しました。まずはここから。</p>
  </a>
  <a class="article-card" href="kodomo-nisa-roadmap.html" style="border-color:var(--accent); margin-bottom:24px;">
    <div class="article-card-date">📌 まとめガイド</div>
    <h2>こどもNISAロードマップ｜2027年開始前に読んでおきたい9記事</h2>
    <p>制度の全体像とメリット・デメリット→お金の枠と引き出しのルール→始め方→学資保険・児童手当・祖父母の援助との関係→18歳以降まで、順番に読めるように整理しました。</p>
  </a>
  <a class="article-card" href="fudousan-roadmap.html" style="border-color:var(--accent); margin-bottom:24px;">
    <div class="article-card-date">📌 まとめガイド</div>
    <h2>不動産投資の初心者ロードマップ｜リスクから税金まで順番に読む9記事</h2>
    <p>NISA・株式との違い、利回りとリスク、J-REITと不動産クラウドファンディング、ローン、税金、勧誘トラブルまで、検討する前に知っておきたいことを順番に整理しました。</p>
  </a>
  <a class="article-card" href="kabu-toushi-roadmap.html" style="border-color:var(--accent); margin-bottom:24px;">
    <div class="article-card-date">📌 まとめガイド</div>
    <h2>株式投資初心者ロードマップ｜安全に始めるための20記事</h2>
    <p>何から読めばいいか迷う方向けに、基本→口座開設→商品選び→注文方法→相場の仕組み→危険の避け方まで、順番に読める20記事に整理しました。</p>
  </a>
  ${searchHtml}
  ${tabsHtml}
  <div id="article-list" class="article-list">${listHtml}</div>
  <p id="article-list-empty" class="empty-state" hidden>条件に合う記事が見つかりませんでした。別のキーワードやカテゴリで探してみてください。</p>
</main>

<footer class="site-footer">
  <a href="operator.html">運営者情報</a>
  <a href="privacy-policy.html">プライバシーポリシー</a>
  <a href="contact.html">お問い合わせ</a>
  <p class="operated-by">投資のキホンは <strong>ASSET LAB</strong> が運営するブログです</p>
</footer>
${tabScript}
</body>
</html>
`;
}

function buildSitemapXml(articles) {
  const latest = articles.reduce((max, a) => {
    const d = (a.updatedAt || a.createdAt || "").slice(0, 10);
    return d > max ? d : max;
  }, "");
  const entries = [
    { loc: `${site.baseUrl}/`, lastmod: latest },
    { loc: `${site.baseUrl}/shoken-koza-guide.html` },
    { loc: `${site.baseUrl}/kabu-toushi-roadmap.html` },
    { loc: `${site.baseUrl}/kodomo-nisa-roadmap.html` },
    { loc: `${site.baseUrl}/fudousan-roadmap.html` },
    ...articles.map((a) => ({
      loc: `${site.baseUrl}/articles/${a.slug}.html`,
      lastmod: (a.updatedAt || a.createdAt || "").slice(0, 10),
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
}

function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`;
}

function publishArticle(article) {
  fs.mkdirSync(ARTICLES_DIR, { recursive: true });

  const articles = readArticleIndex();
  const existingIdx = articles.findIndex((a) => a.slug === article.slug);
  const entry = {
    slug: article.slug, title: article.title, meta: article.meta,
    keywords: article.keywords, createdAt: article.createdAt,
    ...(article.updatedAt ? { updatedAt: article.updatedAt } : {}),
    category: article.category || inferCategory(article),
  };
  if (existingIdx >= 0) articles[existingIdx] = entry; else articles.push(entry);
  writeArticleIndex(articles);

  fs.writeFileSync(path.join(ARTICLES_DIR, `${article.slug}.html`), buildArticleHtml(article, articles), "utf8");
  fs.writeFileSync(path.join(DOCS_DIR, "index.html"), buildIndexHtml(articles), "utf8");
  fs.writeFileSync(path.join(DOCS_DIR, "sitemap.xml"), buildSitemapXml(articles), "utf8");
  fs.writeFileSync(path.join(DOCS_DIR, "robots.txt"), buildRobotsTxt(), "utf8");

  return path.join(ARTICLES_DIR, `${article.slug}.html`);
}

function rebuildIndexOnly() {
  const articles = readArticleIndex();
  fs.writeFileSync(path.join(DOCS_DIR, "index.html"), buildIndexHtml(articles), "utf8");
}

module.exports = { publishArticle, readArticleIndex, writeArticleIndex, rebuildIndexOnly, inferCategory, commonHeadHtml, CATEGORIES };
