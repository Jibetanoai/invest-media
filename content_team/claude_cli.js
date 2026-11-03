// Claude Code CLIを子プロセスで呼び出す共通部分。market_app/claude_cli.jsと同じ仕組み。
// APIキー課金ではなく、Kさんのサブスクリプション(CLAUDE_CODE_OAUTH_TOKEN、
// `claude setup-token`で発行したもの。.envに設定済み)経由で動く。
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const CLAUDE_CLI = path.join(__dirname, "..", "node_modules", ".bin", "claude");
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

// model: 省略時は claude-opus-5。軽い作業(ネット検索中心のチェックなど)は "sonnet" を渡すと利用枠の消費が少ない。
// sessionId: 渡すとその会話IDで実行する。resume: true なら同じ会話の続きとして実行する(時間切れ後のやり直し用)。
// 時間切れのときは、そこまでに書いた文章と検索の記録を err.partial に入れて返す(使用量を無駄にしないため)。
function runClaudeCLI({ systemPrompt, userPrompt, tools = "WebSearch", timeoutMs = DEFAULT_TIMEOUT_MS, model = "claude-opus-5", sessionId, resume = false }) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CLAUDE_CLI)) {
      reject(new Error("claude CLIが見つからないよ(npm installできてないかも)"));
      return;
    }
    if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
      reject(new Error("CLAUDE_CODE_OAUTH_TOKENが.envに設定されてないよ。`claude setup-token`で発行したトークンを.envに追加してね。"));
      return;
    }

    const args = [
      "-p", userPrompt,
      "--model", model,
      "--system-prompt", systemPrompt,
      "--tools", tools,
      "--permission-mode", "bypassPermissions",
      "--output-format", "stream-json",
      "--verbose",
      "--include-partial-messages",
    ];
    if (sessionId) args.push(resume ? "--resume" : "--session-id", sessionId);

    const cliEnv = { ...process.env };
    delete cliEnv.ANTHROPIC_API_KEY;
    const child = spawn(CLAUDE_CLI, args, { cwd: path.join(__dirname, ".."), stdio: ["ignore", "pipe", "pipe"], env: cliEnv });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    let buf = "";
    let stderr = "";
    let result = null;
    const texts = [];
    const toolLog = [];
    let streaming = "";
    const onLine = (line) => {
      if (!line.trim()) return;
      let ev;
      try { ev = JSON.parse(line); } catch { return; }
      if (ev.type === "stream_event" && ev.event && ev.event.delta && ev.event.delta.type === "text_delta") {
        streaming += ev.event.delta.text;
      } else if (ev.type === "assistant" && ev.message && Array.isArray(ev.message.content)) {
        for (const c of ev.message.content) {
          if (c.type === "text" && c.text) { texts.push(c.text); streaming = ""; }
          if (c.type === "tool_use") toolLog.push(`- ${c.name}: ${JSON.stringify(c.input)}`);
        }
      } else if (ev.type === "result") {
        result = ev;
      }
    };
    child.stdout.on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) { onLine(buf.slice(0, i)); buf = buf.slice(i + 1); }
    });
    child.stderr.on("data", (d) => { stderr += d; });

    child.on("error", (err) => { clearTimeout(timer); reject(err); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (buf) onLine(buf);
      if (timedOut) {
        const err = new Error(`claude CLIが${Math.round(timeoutMs / 1000)}秒以内に応答しなかったので中断したよ`);
        err.timedOut = true;
        err.partial = [
          "## ここまでに書いた文章", [...texts, streaming].filter(Boolean).join("\n\n") || "(まだなし)",
          "", "## ここまでの検索の記録", toolLog.join("\n") || "(まだなし)",
        ].join("\n");
        reject(err);
        return;
      }

      if (result && result.is_error) {
        const msg = result.result === "Not logged in · Please run /login"
          ? "claude CLIにログインしてないよ。ターミナルで `claude setup-token` を実行してログインしてね。"
          : (result.result || "claude CLIがエラーを返したよ");
        reject(new Error(msg));
        return;
      }
      if (code !== 0) {
        reject(new Error(stderr.trim() || (result && result.result) || `claude CLIが終了コード${code}で失敗したよ`));
        return;
      }
      if (!result) {
        reject(new Error(`claude CLIの出力を解析できなかったよ: ${stderr.slice(0, 500)}`));
        return;
      }
      const text = (result.result || "").trim();
      if (!text) {
        reject(new Error("本文が空だったよ"));
        return;
      }
      resolve(text);
    });
  });
}

module.exports = { runClaudeCLI };
