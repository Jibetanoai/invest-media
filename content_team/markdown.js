const AFFILIATE_HOSTS = /\/\/(?:[\w-]+\.)*(?:valuecommerce\.com|valuecommerce\.ne\.jp|a8\.net|accesstrade\.net|trafficgate\.net|afl\.rakuten\.co\.jp|afi-b\.com|moshimo\.com)\//;
// ごく簡易的なMarkdown→HTML変換(market_appのブラウザ側実装をNode用に移植し、
// 記事生成でよく出てくる表・引用にも対応させた軽量版)。
function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => {
      // アフィリエイト(ASP)のリンクには nofollow sponsored を付ける
      const rel = AFFILIATE_HOSTS.test(url) ? "nofollow sponsored noopener" : "noopener";
      return `<a href="${url}" target="_blank" rel="${rel}">${text}</a>`;
    });
}

function closeList(html, inList) {
  return inList ? html + "</ul>" : html;
}

function markdownToHtml(md) {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escaped.split("\n");
  let html = "";
  let inList = false;
  let tableRows = null;
  let blockquoteLines = null;

  // 両端の|だけ外して分ける。空のセル(表の左上の空欄など)も1マスとして残す。
  const splitCells = (row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

  const flushTable = () => {
    if (!tableRows || tableRows.length === 0) return;
    const [headerRow, , ...bodyRows] = tableRows;
    const headerCells = splitCells(headerRow);
    html += "<table><thead><tr>";
    for (const c of headerCells) html += `<th>${inlineMarkdown(c)}</th>`;
    html += "</tr></thead><tbody>";
    for (const row of bodyRows) {
      const cells = splitCells(row);
      if (cells.every((c) => c === "")) continue;
      html += "<tr>";
      for (const c of cells) html += `<td>${inlineMarkdown(c)}</td>`;
      html += "</tr>";
    }
    html += "</tbody></table>";
    tableRows = null;
  };

  const flushBlockquote = () => {
    if (!blockquoteLines || blockquoteLines.length === 0) return;
    html += `<blockquote>${blockquoteLines.map((l) => `<p>${inlineMarkdown(l)}</p>`).join("")}</blockquote>`;
    blockquoteLines = null;
  };

  for (const line of lines) {
    const isTableRow = /^\|.*\|$/.test(line.trim());
    const isTableDivider = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line.trim());

    if (isTableRow || (tableRows && isTableDivider)) {
      if (inList) { html = closeList(html, inList); inList = false; }
      flushBlockquote();
      tableRows = tableRows || [];
      tableRows.push(line.trim());
      continue;
    }
    if (tableRows) flushTable();

    if (/^&gt;\s?/.test(line)) {
      if (inList) { html = closeList(html, inList); inList = false; }
      blockquoteLines = blockquoteLines || [];
      const content = line.replace(/^&gt;\s?/, "");
      if (content.trim() !== "") blockquoteLines.push(content);
      continue;
    }
    flushBlockquote();

    if (/^### /.test(line)) {
      html = closeList(html, inList); inList = false;
      html += `<h3>${inlineMarkdown(line.slice(4))}</h3>`;
    } else if (/^## /.test(line)) {
      html = closeList(html, inList); inList = false;
      html += `<h2>${inlineMarkdown(line.slice(3))}</h2>`;
    } else if (/^# /.test(line)) {
      html = closeList(html, inList); inList = false;
      html += `<h1>${inlineMarkdown(line.slice(2))}</h1>`;
    } else if (/^(---|\*\*\*)\s*$/.test(line)) {
      html = closeList(html, inList); inList = false;
      html += "<hr>";
    } else if (/^[-*] /.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inlineMarkdown(line.slice(2))}</li>`;
    } else if (/^\d+\.\s/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inlineMarkdown(line.replace(/^\d+\.\s*/, ""))}</li>`;
    } else if (line.trim() === "") {
      html = closeList(html, inList); inList = false;
    } else {
      html = closeList(html, inList); inList = false;
      html += `<p>${inlineMarkdown(line)}</p>`;
    }
  }
  if (tableRows) flushTable();
  flushBlockquote();
  html = closeList(html, inList);
  return html;
}

// 書き出したHTMLの表が、全部の行で同じマス数になっているか確かめる。
// ずれていたら、どの表の何行目かを返す(空なら問題なし)。
function findBrokenTables(html) {
  const problems = [];
  const tables = html.match(/<table>[\s\S]*?<\/table>/g) || [];
  tables.forEach((t, i) => {
    const rows = t.match(/<tr>[\s\S]*?<\/tr>/g) || [];
    const counts = rows.map((r) => (r.match(/<t[hd]>/g) || []).length);
    if (new Set(counts).size > 1) {
      const head = (rows[0] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
      problems.push(`${i + 1}個目の表(見出し: ${head})の行ごとのマス数: ${counts.join(",")}`);
    }
  });
  return problems;
}

module.exports = { markdownToHtml, findBrokenTables };
