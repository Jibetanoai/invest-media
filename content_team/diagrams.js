// 記事本文に埋め込む図解(インラインSVG)を集めたファイル。
// bodyMarkdown内に `[DIAGRAM:id]` という行を置くと、publish_article.jsの
// buildArticleHtmlがここに定義したSVGに置き換える(markdown.jsは<,>を
// エスケープしてしまうため、SVGはmarkdown内に直接書けず、この仕組みで
// 変換後のHTMLに後から差し込んでいる)。
// 色はサイトのCSS変数(--accent/--navy/--muted/--border/--bg)をそのまま
// 使っているため、ダークモードでも自動的に配色が切り替わる。

const DIAGRAMS = {
  // NISA: 生涯投資枠(1800万円)と年間投資枠(成長240万+つみたて120万=360万)の関係
  "nisa-frame-2026": `
<svg viewBox="0 0 600 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="NISAの生涯投資枠1800万円と、年間投資枠360万円(成長投資枠240万円・つみたて投資枠120万円)の関係を示す図">
  <rect x="10" y="10" width="580" height="240" rx="12" fill="none" stroke="var(--accent)" stroke-width="2"/>
  <text x="300" y="38" text-anchor="middle" font-size="15" font-weight="700" fill="var(--navy)">生涯投資枠(非課税保有限度額) 1,800万円</text>

  <rect x="40" y="60" width="520" height="150" rx="10" fill="var(--bg)" stroke="var(--border)" stroke-width="1.5"/>
  <text x="300" y="84" text-anchor="middle" font-size="12.5" fill="var(--muted)">年間投資枠(1年間に使える上限) 合計360万円</text>

  <rect x="70" y="100" width="230" height="90" rx="8" fill="var(--accent)" opacity="0.16" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="185" y="132" text-anchor="middle" font-size="14" font-weight="700" fill="var(--accent-ink)">つみたて投資枠</text>
  <text x="185" y="158" text-anchor="middle" font-size="20" font-weight="700" fill="var(--accent-ink)">120万円/年</text>

  <rect x="320" y="100" width="230" height="90" rx="8" fill="var(--navy)" opacity="0.12" stroke="var(--navy)" stroke-width="1.5"/>
  <text x="435" y="132" text-anchor="middle" font-size="14" font-weight="700" fill="var(--navy)">成長投資枠</text>
  <text x="435" y="158" text-anchor="middle" font-size="20" font-weight="700" fill="var(--navy)">240万円/年</text>

  <text x="300" y="232" text-anchor="middle" font-size="11.5" fill="var(--muted)">※売却しても、その年の年間投資枠(360万円)は復活しない。復活するのは生涯投資枠(簿価分)のみ</text>
</svg>`,

  // NISA口座開設〜運用開始までの7ステップ(フロー図)
  "nisa-7steps": `
<svg viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="NISA口座開設から運用開始までの7ステップを示すフロー図">
  ${[
    "金融機関を選ぶ",
    "口座開設を申し込む(オンライン可)",
    "本人確認書類を提出",
    "税務署の確認(通常数日〜数週間)",
    "口座開設完了の通知を受け取る",
    "入金・買付方法を設定する",
    "商品を選んで購入する",
  ]
    .map((label, i) => {
      const y = 20 + i * 56;
      return `
  <rect x="60" y="${y}" width="480" height="42" rx="21" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5"/>
  <circle cx="82" cy="${y + 21}" r="14" fill="var(--accent)"/>
  <text x="82" y="${y + 26}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">${i + 1}</text>
  <text x="300" y="${y + 26}" text-anchor="middle" font-size="13.5" fill="var(--navy)">${label}</text>
  ${i < 6 ? `<line x1="300" y1="${y + 42}" x2="300" y2="${y + 56}" stroke="var(--border)" stroke-width="2" marker-end="url(#arrow)"/>` : ""}`;
    })
    .join("")}
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--border)"/>
    </marker>
  </defs>
</svg>`,

  // 注文方法(成行・指値・逆指値)を価格軸上でイメージする図
  "order-types-price-axis": `
<svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="成行注文・指値注文・逆指値注文を価格軸のイメージで示す図">
  <line x1="60" y1="110" x2="540" y2="110" stroke="var(--border)" stroke-width="2"/>
  <text x="540" y="132" text-anchor="end" font-size="11.5" fill="var(--muted)">価格が高い →</text>
  <text x="60" y="132" font-size="11.5" fill="var(--muted)">← 価格が低い</text>

  <circle cx="300" cy="110" r="6" fill="var(--navy)"/>
  <text x="300" y="90" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--navy)">現在の株価</text>

  <rect x="230" y="20" width="140" height="40" rx="8" fill="var(--accent)" opacity="0.18" stroke="var(--accent)"/>
  <text x="300" y="45" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--accent-ink)">成行: 価格を指定せず今すぐ売買</text>

  <rect x="60" y="150" width="180" height="40" rx="8" fill="var(--bg)" stroke="var(--border)" stroke-width="1.5"/>
  <text x="150" y="175" text-anchor="middle" font-size="12.5" fill="var(--navy)">指値(買い): この価格以下で買う</text>

  <rect x="360" y="150" width="180" height="40" rx="8" fill="var(--bg)" stroke="var(--border)" stroke-width="1.5"/>
  <text x="450" y="175" text-anchor="middle" font-size="12.5" fill="var(--navy)">逆指値(売り): この価格以下になったら売る</text>
</svg>`,

  // PER(株価収益率)とPBR(株価純資産倍率)の考え方
  "per-pbr-concept": `
<svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PERとPBRの計算式と意味を示す図">
  <rect x="20" y="20" width="270" height="180" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="155" y="50" text-anchor="middle" font-size="15" font-weight="700" fill="var(--accent-ink)">PER(株価収益率)</text>
  <text x="155" y="82" text-anchor="middle" font-size="13.5" fill="var(--navy)">株価 ÷ 1株あたり利益(EPS)</text>
  <text x="155" y="112" text-anchor="middle" font-size="12" fill="var(--muted)">利益に対して株価が</text>
  <text x="155" y="130" text-anchor="middle" font-size="12" fill="var(--muted)">何倍まで買われているか</text>
  <text x="155" y="168" text-anchor="middle" font-size="12" fill="var(--muted)">数字が大きいほど「割高」と</text>
  <text x="155" y="184" text-anchor="middle" font-size="12" fill="var(--muted)">判断されやすい(業種で目安が違う)</text>

  <rect x="310" y="20" width="270" height="180" rx="10" fill="var(--bg)" stroke="var(--navy)" stroke-width="1.5"/>
  <text x="445" y="50" text-anchor="middle" font-size="15" font-weight="700" fill="var(--navy)">PBR(株価純資産倍率)</text>
  <text x="445" y="82" text-anchor="middle" font-size="13.5" fill="var(--navy)">株価 ÷ 1株あたり純資産(BPS)</text>
  <text x="445" y="112" text-anchor="middle" font-size="12" fill="var(--muted)">会社の資産に対して株価が</text>
  <text x="445" y="130" text-anchor="middle" font-size="12" fill="var(--muted)">何倍まで買われているか</text>
  <text x="445" y="168" text-anchor="middle" font-size="12" fill="var(--muted)">1倍が「解散価値」の目安と</text>
  <text x="445" y="184" text-anchor="middle" font-size="12" fill="var(--muted)">言われることがある</text>
</svg>`,

  // ドルコスト平均法(積立)と一括投資の違いイメージ
  "dca-vs-lumpsum": `
<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="価格が変動する中で、一括投資と積立投資(ドルコスト平均法)で購入価格がどう平均化されるかのイメージ図">
  <text x="20" y="26" font-size="13" font-weight="700" fill="var(--navy)">価格が上下する中での買い方の違い(イメージ)</text>

  <text x="20" y="58" font-size="12.5" font-weight="700" fill="var(--navy)">一括投資: 1回でまとめて購入</text>
  <line x1="60" y1="100" x2="560" y2="100" stroke="var(--border)" stroke-width="2"/>
  <polyline points="60,80 140,50 220,90 300,40 380,85 460,55 540,75" fill="none" stroke="var(--muted)" stroke-width="2" opacity="0.6"/>
  <circle cx="220" cy="90" r="9" fill="var(--navy)"/>
  <text x="220" y="118" text-anchor="middle" font-size="11" fill="var(--navy)">全額をこの1点で購入</text>
  <text x="450" y="118" text-anchor="middle" font-size="11" fill="var(--muted)">価格が高い時に当たることも、安い時に当たることもある</text>

  <text x="20" y="166" font-size="12.5" font-weight="700" fill="var(--accent-ink)">積立投資: 複数回に分けて購入</text>
  <line x1="60" y1="270" x2="560" y2="270" stroke="var(--border)" stroke-width="2"/>
  <polyline points="60,225 140,195 220,255 300,185 380,250 460,205 540,230" fill="none" stroke="var(--muted)" stroke-width="2" opacity="0.6"/>
  ${[
    [140, 195],
    [220, 255],
    [300, 185],
    [380, 250],
    [460, 205],
    [540, 230],
  ]
    .map(
      ([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="7" fill="var(--accent)"/><text x="${x}" y="${y - 12}" text-anchor="middle" font-size="10" fill="var(--accent-ink)">${i + 1}回目</text>`
    )
    .join("")}
  <text x="300" y="292" text-anchor="middle" font-size="11.5" fill="var(--muted)">毎回同じ金額で買うため、高い時も安い時も分散され、平均購入価格がならされる</text>
</svg>`,

  // ナンピン買い: 買い増しで平均取得単価が下がるイメージ
  "nanpin-average-cost": `
<svg viewBox="0 0 600 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="株価が下落する局面で買い増し(ナンピン買い)をすることで、平均取得単価が下がっていくイメージ図">
  <line x1="60" y1="30" x2="60" y2="210" stroke="var(--border)" stroke-width="2"/>
  <line x1="60" y1="210" x2="560" y2="210" stroke="var(--border)" stroke-width="2"/>

  <line x1="120" y1="55" x2="120" y2="210" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3,3"/>
  <circle cx="120" cy="55" r="6" fill="var(--navy)"/>
  <text x="120" y="42" text-anchor="middle" font-size="11" fill="var(--navy)">①1,000円で購入</text>

  <line x1="100" y1="100" x2="480" y2="100" stroke="var(--navy)" stroke-width="2" stroke-dasharray="6,4"/>
  <text x="490" y="90" font-size="11.5" font-weight="700" fill="var(--navy)">平均取得単価</text>
  <text x="490" y="106" font-size="11" fill="var(--muted)">(約880円に低下)</text>

  <line x1="260" y1="135" x2="260" y2="210" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3,3"/>
  <circle cx="260" cy="135" r="6" fill="var(--accent)"/>
  <text x="272" y="139" text-anchor="start" font-size="11" fill="var(--accent-ink)">②800円で買い増し</text>

  <line x1="400" y1="175" x2="400" y2="210" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3,3"/>
  <circle cx="400" cy="175" r="6" fill="var(--accent)"/>
  <text x="412" y="179" text-anchor="start" font-size="11" fill="var(--accent-ink)">③650円で買い増し</text>

  <text x="300" y="240" text-anchor="middle" font-size="11.5" fill="var(--muted)">下落が続けば含み損はさらに拡大するリスクがある点に注意</text>
</svg>`,

  // 損切り・利確ラインのイメージ
  "stop-loss-take-profit": `
<svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="購入価格を基準に、利益確定ラインと損切りラインをどのように設定するかを示す図">
  <line x1="60" y1="30" x2="60" y2="190" stroke="var(--border)" stroke-width="2"/>
  <line x1="60" y1="190" x2="480" y2="190" stroke="var(--border)" stroke-width="2"/>

  <line x1="80" y1="60" x2="460" y2="60" stroke="var(--navy)" stroke-width="2"/>
  <text x="470" y="58" font-size="12" font-weight="700" fill="var(--navy)">利益確定</text>
  <text x="470" y="72" font-size="11" fill="var(--muted)">(例: +20%)</text>

  <line x1="80" y1="120" x2="460" y2="120" stroke="var(--muted)" stroke-width="2" stroke-dasharray="6,4"/>
  <text x="470" y="124" font-size="12" font-weight="700" fill="var(--navy)">購入価格</text>

  <line x1="80" y1="160" x2="460" y2="160" stroke="var(--accent)" stroke-width="2"/>
  <text x="470" y="158" font-size="12" font-weight="700" fill="var(--accent-ink)">損切り</text>
  <text x="470" y="172" font-size="11" fill="var(--muted)">(例: -10%)</text>

  <polyline points="100,120 150,100 200,140 250,90 300,110 350,70 400,95" fill="none" stroke="var(--navy)" stroke-width="2" opacity="0.5"/>
</svg>`,

  // NISA と iDeCo の対比図
  "nisa-ideco-compare": `
<svg viewBox="0 0 600 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="NISAとiDeCoの違いを、拠出時・運用時・受取時の3つの場面で比較する図">
  <rect x="20" y="20" width="270" height="220" rx="10" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="155" y="48" text-anchor="middle" font-size="15" font-weight="700" fill="var(--accent-ink)">NISA</text>
  <text x="155" y="78" text-anchor="middle" font-size="12.5" fill="var(--navy)">拠出時: 所得控除なし</text>
  <text x="155" y="108" text-anchor="middle" font-size="12.5" fill="var(--navy)">運用時: 運用益が非課税</text>
  <text x="155" y="138" text-anchor="middle" font-size="12.5" fill="var(--navy)">受取時: いつでも引き出せる</text>
  <text x="155" y="176" text-anchor="middle" font-size="11.5" fill="var(--muted)">教育費・住宅費など</text>
  <text x="155" y="192" text-anchor="middle" font-size="11.5" fill="var(--muted)">柔軟に使いたい人向け</text>

  <rect x="310" y="20" width="270" height="220" rx="10" fill="var(--bg)" stroke="var(--navy)" stroke-width="1.5"/>
  <text x="445" y="48" text-anchor="middle" font-size="15" font-weight="700" fill="var(--navy)">iDeCo</text>
  <text x="445" y="78" text-anchor="middle" font-size="12.5" fill="var(--navy)">拠出時: 掛金が全額所得控除</text>
  <text x="445" y="108" text-anchor="middle" font-size="12.5" fill="var(--navy)">運用時: 運用益が非課税</text>
  <text x="445" y="138" text-anchor="middle" font-size="12.5" fill="var(--navy)">受取時: 原則60歳まで引き出せない</text>
  <text x="445" y="176" text-anchor="middle" font-size="11.5" fill="var(--muted)">老後資金として</text>
  <text x="445" y="192" text-anchor="middle" font-size="11.5" fill="var(--muted)">割り切って使いたい人向け</text>
</svg>`,
};

// --- 「相場の歴史」記事用の長期チャート ---
// 日経平均・S&P500の主要な節目の値を折れ線で結び、暴落・暴騰の
// イベントを注記した長期チャート。あくまで記事内で値動きの「規模感」を
// つかむための概算値(illustrative)であり、公式の終値そのものではない
// (年央値・概算の高値安値を使用している箇所がある)。正確な数値は
// 日本経済新聞社(日経平均)やS&P Dow Jones Indicesの公式データで
// ご確認ください、という前提を記事本文側にも明記すること。
function buildHistoryChart({ points, events, width = 680, height = 340, yUnit, colorVar }) {
  const padding = { top: 30, right: 40, bottom: 36, left: 70 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMax = Math.max(...ys) * 1.08;
  const sx = (x) => padding.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const sy = (y) => padding.top + plotH - (y / yMax) * plotH;

  const linePoints = points.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");

  // Y軸の目盛り(4分割)
  const yTicks = [0, 1, 2, 3, 4].map((i) => (yMax / 4) * i);
  const yTicksSvg = yTicks
    .map((v) => {
      const y = sy(v).toFixed(1);
      return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--border)" stroke-width="1"/>
      <text x="${padding.left - 8}" y="${Number(y) + 4}" text-anchor="end" font-size="10.5" fill="var(--muted)">${Math.round(v).toLocaleString()}</text>`;
    })
    .join("");

  // X軸ラベル(データ点のうち、キリのよい年だけ表示)
  const xLabelYears = [...new Set(points.map((p) => Math.floor(p.x)))].filter((y, i, arr) => {
    if (i === 0 || i === arr.length - 1) return true;
    return y % 5 === 0;
  });
  const xTicksSvg = xLabelYears
    .map((year) => {
      const x = sx(year).toFixed(1);
      return `<text x="${x}" y="${height - padding.bottom + 18}" text-anchor="middle" font-size="10.5" fill="var(--muted)">${year}</text>`;
    })
    .join("");

  const eventsSvg = (events || [])
    .map((e) => {
      const xNum = sx(e.x);
      const x = xNum.toFixed(1);
      const y = sy(e.y).toFixed(1);
      const tier = e.tier || 1;
      const labelY = e.side === "below" ? Number(y) + 16 + tier * 16 : Number(y) - 8 - tier * 16;
      const lineY2 = e.side === "below" ? Number(y) + 8 + tier * 16 : Number(y) - tier * 16;
      // 右端・左端に近いイベントはラベルが枠外にはみ出さないよう寄せる
      let anchor = e.anchor || "middle";
      if (!e.anchor) {
        if (xNum > width - padding.right - 60) anchor = "end";
        else if (xNum < padding.left + 60) anchor = "start";
      }
      return `
      <line x1="${x}" y1="${y}" x2="${x}" y2="${lineY2}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3,2"/>
      <circle cx="${x}" cy="${y}" r="5" fill="var(--accent)"/>
      <text x="${x}" y="${labelY}" text-anchor="${anchor}" font-size="11" font-weight="700" fill="var(--accent-ink)">${e.label}</text>`;
    })
    .join("");

  return `
<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${yUnit}の長期推移と主な暴落・暴騰イベントを示す折れ線グラフ(概算値)">
  ${yTicksSvg}
  ${xTicksSvg}
  <polyline points="${linePoints}" fill="none" stroke="${colorVar}" stroke-width="2.5"/>
  ${eventsSvg}
  <line x1="${padding.left}" y1="${padding.top + plotH}" x2="${width - padding.right}" y2="${padding.top + plotH}" stroke="var(--muted)" stroke-width="1.5"/>
</svg>`;
}

// 日経平均株価(概算・illustrative values, 単位: 円)
const NIKKEI_POINTS = [
  { x: 1985, y: 13000 },
  { x: 1989.99, y: 38915 },
  { x: 1992, y: 14309 },
  { x: 1995, y: 14485 },
  { x: 2000, y: 20337 },
  { x: 2003, y: 7972 },
  { x: 2007, y: 18261 },
  { x: 2009.2, y: 7054 },
  { x: 2012, y: 8455 },
  { x: 2015, y: 19034 },
  { x: 2018, y: 24448 },
  { x: 2020.1, y: 23386 },
  { x: 2020.25, y: 16552 },
  { x: 2021, y: 28791 },
  { x: 2024.3, y: 42224 },
  { x: 2024.6, y: 31458 },
  { x: 2024.9, y: 38000 },
];

const NIKKEI_EVENTS = [
  { x: 1989.99, y: 38915, label: "①バブル最高値 38,915円", side: "above" },
  { x: 2003, y: 7972, label: "②ITバブル崩壊", side: "below", tier: 1 },
  { x: 2009.2, y: 7054, label: "③リーマンショック", side: "below", tier: 3 },
  { x: 2020.25, y: 16552, label: "④コロナショック", side: "below" },
  { x: 2024.6, y: 31458, label: "⑤2024年8月急落", side: "above" },
];

// S&P500(概算・illustrative values, 単位: ポイント)
const SP500_POINTS = [
  { x: 1985, y: 172 },
  { x: 1987.6, y: 337 },
  { x: 1987.8, y: 224 },
  { x: 1990, y: 330 },
  { x: 1995, y: 615 },
  { x: 2000.2, y: 1527 },
  { x: 2002.8, y: 776 },
  { x: 2007.8, y: 1565 },
  { x: 2009.2, y: 676 },
  { x: 2013, y: 1848 },
  { x: 2018, y: 2673 },
  { x: 2020.1, y: 3386 },
  { x: 2020.2, y: 2237 },
  { x: 2021.9, y: 4766 },
  { x: 2022.8, y: 3577 },
  { x: 2024, y: 5882 },
];

const SP500_EVENTS = [
  { x: 1987.8, y: 224, label: "①ブラックマンデー", side: "below" },
  { x: 2002.8, y: 776, label: "②ITバブル崩壊", side: "below", tier: 1 },
  { x: 2009.2, y: 676, label: "③リーマンショック", side: "below", tier: 3 },
  { x: 2020.2, y: 2237, label: "④コロナショック", side: "above" },
  { x: 2022.8, y: 3577, label: "⑤利上げ局面の下落", side: "above", tier: 3 },
];

DIAGRAMS["nikkei225-history"] = buildHistoryChart({
  points: NIKKEI_POINTS,
  events: NIKKEI_EVENTS,
  yUnit: "日経平均株価",
  colorVar: "var(--navy)",
});

DIAGRAMS["sp500-history"] = buildHistoryChart({
  points: SP500_POINTS,
  events: SP500_EVENTS,
  yUnit: "S&P500",
  colorVar: "var(--accent)",
});

module.exports = { DIAGRAMS };
