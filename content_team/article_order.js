// 記事一覧(index.html)でのカテゴリ内の並び順(日付ではなく、読む順として分かりやすい内容ベースの順序)。
// 「⑪ 今日の経済ニュース」カテゴリだけは対象外で、従来通り日付の新しい順に並ぶ。
// ここに載っていないslugは、そのカテゴリの末尾に(作成日の新しい順で)配置される。
const CATEGORY_ARTICLE_ORDER = {
  fudousan: [
    "real-estate-investment-reit-crowdfunding-risk-comparison",
    "real-estate-investment-yield-and-risks",
    "real-estate-investment-solicitation-trouble",
  ],
  fx: [
    "fx-leverage-margin-losscut-risk",
    "fx-nisa-difference-tax-loss-volatility",
    "fx-swap-point-mechanism-and-risks",
  ],
  crypto: [
    "crypto-asset-basics-risks-tax",
    "crypto-asset-tax-vs-nisa",
    "crypto-fraud-unregistered-operator-check",
  ],
  kihon: [
    "nisa-kihon-2026-2027-changes",
    "nisa-lifetime-limit-quota-reuse",
    "investment-beginner-mistakes-nisa-basics",
    "tokutei-ippan-nisa-account-tax-basics",
    "investment-tax-return-when-needed",
    "nisa-net-shoken-vs-net-bank",
    "nisa-account-opening-documents",
    "nisa-check-frequency-mindset",
    "kodomo-shien-nisa-2027-guide",
  ],
  kouza: [
    "net-securities-comparison-beginners",
    "sbi-rakuten-securities-comparison",
    "nisa-account-brokerage-comparison-points",
    "nisa-couple-household-accounts",
    "nisa-financial-institution-change-guide",
  ],
  hajimeru: [
    "seikatsu-bouei-shikin-before-investing",
    "nisa-hajimekata-7-steps",
    "shinshakaijin-nisa-monthly-amount",
    "ideco-how-to-start-beginner-guide",
  ],
  shouhin: [
    "index-fund-how-to-choose-comparison-points",
    "toushin-etf-difference-nisa",
    "reit-basics-for-beginners",
    "kojin-muke-kokusai-basics",
    "zensekai-kabushiki-vs-beikoku-kabushiki-nisa",
    "toushin-bunpaikin-ari-nashi",
    "toushin-hidden-cost-basics",
    "high-dividend-vs-index-investing-comparison",
  ],
  kaikata: [
    "tsumitate-vs-lump-sum-dollar-cost-averaging",
    "nisa-tsumitate-seicho-which-first",
    "nisa-tsumitate-net-securities-comparison",
    "nisa-dividend-receiving-method",
  ],
  heiyou: [
    "ideco-nisa-difference-guide",
    "ideco-contribution-limit-by-job",
    "ideco-tax-benefits-guide",
    "ideco-how-to-receive-lumpsum-annuity",
    "ideco-demerit-chuiten",
    "robo-advisor-vs-nisa-basics",
    "furusato-nozei-nisa-priority",
    "furusato-nozei-limit-nisa-profit",
    "furusato-nozei-vs-investment-real-return",
  ],
  hajimetaato: [
    "nisa-fukumizon-robaiuri-taisaku",
    "what-to-do-during-a-market-crash",
    "nisa-rebalance-basics",
    "nisa-exit-strategy-withdrawal",
  ],
  credit: [
    "creca-tsumitate-nisa-point-guide",
  ],
  kobetsu: [
    "stock-order-types-guide",
    "how-to-pick-stocks-per-pbr-roe-dividend-yield",
    "shareholder-benefits-nisa-growth-quota-guide",
    "stop-loss-take-profit-rules-for-beginners",
    "nanpin-kai-merit-risk-beginner",
    "margin-trading-basics-vs-cash-trading",
    "ipo-securities-comparison-underwriter-lottery",
    "institutional-investors-vs-individual",
    "shitekabu-features-and-risk-checkpoints",
  ],
  souba: [
    "supply-demand-stock-price-basics",
    "macro-economics-basics-gdp-inflation-stock-price",
    "kinri-and-stock-price-basics",
    "economic-indicators-basics-cpi-jobs-gdp",
    "us-employment-situation-basics",
    "earnings-report-basics-for-beginners",
    "business-cycle-sector-rotation-basics",
    "economic-news-investment-bias-basics",
    "technical-indicator-basics-ma-macd-rsi",
    "bollinger-bands-basics-standard-deviation",
    "stock-trading-volume-basics",
    "us-stocks-currency-risk-basics",
    "stock-market-anomalies-guide",
  ],
  rekishi: [
    "nikkei-sp500-history-crashes",
    "great-depression-1929-explained",
    "black-monday-1987",
    "japan-bubble-burst-1990",
    "dotcom-bubble-crash-2000",
    "lehman-shock-2008",
    "corona-shock-2020",
    "us-rate-hike-2022-selloff",
    "boj-rate-hike-2024-crash",
  ],
};

// slug -> カテゴリ内の順位(0始まり)のマップに変換。
const ARTICLE_ORDER_INDEX = {};
for (const list of Object.values(CATEGORY_ARTICLE_ORDER)) {
  list.forEach((slug, i) => { ARTICLE_ORDER_INDEX[slug] = i; });
}

module.exports = { CATEGORY_ARTICLE_ORDER, ARTICLE_ORDER_INDEX };
