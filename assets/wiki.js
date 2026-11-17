/* PrivateWiki — 共通スクリプト
 *
 * 各ページの <script type="text/markdown"> を描画し、
 * ヘッダー・サイドバー・目次・検索を組み立てる。
 * ページ一覧は pages.js（window.WIKI）から読む。
 */
(function () {
  "use strict";

  const ROOT = new URL("..", document.currentScript.src).href; // サイトのルート（末尾 /）
  const W = window.WIKI || {};
  const SITE = W.title || "Wiki";
  const games = W.games || [];
  const sitePages = W.site || [];

  /* ---------- 小道具 ---------- */

  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") e.className = v;
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      e.append(kid);
    }
    return e;
  }

  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const norm = (s) => String(s).trim().toLowerCase();
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function lsGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function lsSet(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {
      /* 保存できない環境では何もしない */
    }
  }

  /* ---------- テーマ ---------- */

  const THEME_KEY = "wiki-theme";
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function applyTheme() {
    document.documentElement.dataset.theme = lsGet(THEME_KEY) || (darkQuery.matches ? "dark" : "light");
  }

  applyTheme();
  darkQuery.addEventListener("change", applyTheme);

  // ページ側に指定がなければ、ロゴと同じ頭文字のアイコンを付ける
  if (!document.querySelector('link[rel~="icon"]')) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<circle cx="16" cy="16" r="14.5" fill="#fff" stroke="#202122" stroke-width="1.5"/>' +
      '<text x="16" y="22.5" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#202122">' +
      esc(SITE.charAt(0)) +
      "</text></svg>";
    document.head.append(h("link", { rel: "icon", href: "data:image/svg+xml," + encodeURIComponent(svg) }));
  }

  /* ---------- ページ索引 ---------- */

  const pages = [{ path: "index.html", title: "メインページ", game: null }];
  for (const p of sitePages) pages.push({ path: p.file, title: p.title, updated: p.updated, game: null });
  for (const g of games) {
    for (const p of g.pages || []) {
      pages.push({ path: `games/${g.id}/${p.file}`, title: p.title, updated: p.updated, game: g });
    }
  }

  const url = (page) => ROOT + page.path;
  const pagesOf = (game) => pages.filter((p) => p.game === game);
  const gameUpdated = (game) =>
    pagesOf(game)
      .map((p) => p.updated || "")
      .sort()
      .pop() || "";

  let rel = "";
  {
    let here = location.href.replace(/[?#].*$/, "");
    if (here.endsWith("/")) here += "index.html";
    if (here.startsWith(ROOT)) {
      rel = here.slice(ROOT.length);
      try {
        rel = decodeURI(rel);
      } catch (e) {
        /* そのまま使う */
      }
    }
  }

  const cur = pages.find((p) => p.path === rel) || null;
  const curGame = cur ? cur.game : games.find((g) => rel.startsWith(`games/${g.id}/`)) || null;

  /* ---------- Markdown ---------- */

  // [[ページ名]] / [[ゲーム名/ページ名]] / [[ページ名|表示文字]] / [[#見出し]]
  function resolveLink(target) {
    let name = target;
    let hash = "";
    const i = name.indexOf("#");
    if (i >= 0) {
      hash = "#" + headingId(name.slice(i + 1));
      name = name.slice(0, i);
    }
    name = name.trim();
    if (!name) return hash || null;

    let found = null;
    const parts = name.split("/");
    if (parts.length === 2) {
      const g = games.find((x) => norm(x.title) === norm(parts[0]) || x.id === norm(parts[0]));
      if (g) found = pagesOf(g).find((p) => norm(p.title) === norm(parts[1]));
    } else {
      if (curGame) found = pagesOf(curGame).find((p) => norm(p.title) === norm(name));
      if (!found) {
        const g = games.find((x) => norm(x.title) === norm(name) || x.id === norm(name));
        if (g) found = pagesOf(g)[0];
      }
      if (!found) found = pages.find((p) => norm(p.title) === norm(name));
    }
    return found ? url(found) + hash : null;
  }

  function wikilink(target, label) {
    const href = resolveLink(target);
    const text = esc(label || target.replace(/^#/, ""));
    if (!href) return `<a class="new" href="#" title="未作成のページ: ${esc(target)}">${text}</a>`;
    return `<a href="${esc(href)}">${text}</a>`;
  }

  function setupMarked() {
    marked.use({
      gfm: true,
      breaks: true, // 改行をそのまま改行として表示する
      extensions: [
        {
          name: "wikilink",
          level: "inline",
          start(src) {
            const i = src.indexOf("[[");
            return i < 0 ? undefined : i;
          },
          tokenizer(src) {
            const m = /^\[\[([^\[\]|\n]+)(?:\|([^\[\]\n]+))?\]\]/.exec(src);
            if (m) return { type: "wikilink", raw: m[0], target: m[1].trim(), label: (m[2] || "").trim() };
          },
          renderer(token) {
            return wikilink(token.target, token.label);
          },
        },
      ],
    });
  }

  // ::: で始まる独自ブロック
  const box = (kind, title) => ({
    open: `<div class="box box-${kind}">` + (title ? `<p class="box-title">${esc(title)}</p>` : ""),
    close: "</div>",
  });

  const BLOCKS = {
    spoiler: (title) => ({
      open: `<details class="spoiler"><summary>${esc(title || "ネタバレ（クリックで開く）")}</summary>`,
      close: "</details>",
    }),
    note: (title) => box("note", title),
    warn: (title) => box("warn", title),
  };

  function infobox(title, rows) {
    let html = '<table class="infobox">';
    if (title) html += `<caption>${marked.parseInline(title)}</caption>`;
    html += "<tbody>";
    for (const row of rows) {
      let i = row.indexOf("|");
      if (i >= 0 && row.lastIndexOf("[[", i) > row.lastIndexOf("]]", i)) i = -1; // [[a|b]] の | は区切りではない
      if (i < 0) {
        html += `<tr><td colspan="2" class="infobox-full">${marked.parseInline(row)}</td></tr>`;
      } else {
        html +=
          `<tr><th scope="row">${marked.parseInline(row.slice(0, i).trim())}</th>` +
          `<td>${marked.parseInline(row.slice(i + 1).trim())}</td></tr>`;
      }
    }
    return html + "</tbody></table>";
  }

  /* 生産チェーン（:::chain）
   *
   * 1行にひとつの流れを「材料 + 材料 → 建物: 産物, 産物 → 建物: 産物」の形で書く。
   * 行どうしは品物の名前でつながり、最終産物を作る建物を右端に置いた図になる。
   * 品物の後ろに数字を書くと、その建物の生産数・消費数として表示する。
   */
  const chainSteps = []; // ページ内の全工程。逆引きの表（:::chainindex）に使う

  function parseGoods(text) {
    const t = text.trim();
    const m = /^(.+?)(?:\s+|\s*[×x]\s*)(\d+(?:\.\d+)?)$/.exec(t); // 「木材 2」「木材×2」
    return m ? { name: m[1].trim(), qty: m[2] } : { name: t, qty: "" };
  }

  function mergeGoods(list, item) {
    const same = list.find((x) => x.name === item.name);
    if (!same) list.push({ ...item });
    else if (!same.qty) same.qty = item.qty;
  }

  function parseChain(rows) {
    const steps = [];
    for (const row of rows) {
      // 全角の記号や数字でも書けるようにそろえる
      const line = row
        .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
        .replace(/->|=>|⇒|➡|➔/g, "→")
        .replace(/：/g, ":")
        .replace(/＋/g, "+")
        .replace(/／/g, "/")
        .replace(/[、，]/g, ",")
        .replace(/　/g, " ");

      let carry = null; // 次の建物に入る品物
      for (const seg of line.split("→").map((s) => s.trim())) {
        if (!seg) continue;
        const colon = seg.indexOf(":");
        if (colon < 0) {
          carry = seg.split("+").map(parseGoods).filter((g) => g.name); // 品物だけの区切り
          continue;
        }
        const buildings = seg.slice(0, colon).split("/").map((s) => s.trim()).filter(Boolean);
        const outputs = seg.slice(colon + 1).split(",").map(parseGoods).filter((g) => g.name);
        if (!buildings.length) continue;

        // 同じ建物を複数の行に分けて書いたときは、ひとつにまとめる
        const key = buildings.join(" / ");
        let step = steps.find((s) => s.key === key);
        if (!step) steps.push((step = { key, buildings, inputs: [], outputs: [] }));
        for (const g of carry || []) mergeGoods(step.inputs, g);
        for (const g of outputs) mergeGoods(step.outputs, g);

        carry = outputs.map((g) => ({ name: g.name, qty: "" })); // 品物を書かなければ、作ったものがそのまま次へ進む
      }
    }
    return steps;
  }

  function chainHtml(title, rows) {
    const steps = parseChain(rows);
    if (!steps.length) return "";
    chainSteps.push(...steps);

    const makers = (name) => steps.filter((s) => s.outputs.some((g) => g.name === name));
    const consumed = new Set(steps.flatMap((s) => s.inputs.map((g) => g.name)));
    let goals = steps.filter((s) => !s.outputs.some((g) => consumed.has(g.name)));
    if (!goals.length) goals = steps.slice(-1); // 循環していて終点が決まらないとき

    const goodsRow = (kind, label, list, isMain) =>
      list.length
        ? `<div class="pc-row pc-${kind}"><span class="pc-kind">${label}</span><span class="pc-goods">` +
          list
            .map(
              (g) =>
                `<span class="pc-good${isMain(g) ? " pc-main" : ""}"><span>${esc(g.name)}</span>` +
                (g.qty ? `<b>${esc(g.qty)}</b>` : "") +
                "</span>",
            )
            .join("") +
          "</span></div>"
        : "";

    // wanted: この建物の産物のうち、次の工程で使う品物（null は最終産物を作る建物）
    const node = (step, wanted, path) => {
      const branches = step.inputs
        .map((g) => {
          const from = makers(g.name).filter((s) => s !== step && !path.includes(s));
          if (!from.length) return "";
          const subs = from.map((s) => node(s, g.name, [...path, step]));
          const inner =
            subs.length > 1 ? `<div class="pc-alt"><span class="pc-alt-label">どれか</span>${subs.join("")}</div>` : subs[0];
          return `<div class="pc-input">${inner}<span class="pc-line"></span></div>`;
        })
        .join("");
      const card =
        `<div class="pc-card${wanted === null ? " pc-goal" : ""}">` +
        `<div class="pc-building">${step.buildings.map(esc).join("<small>または</small>")}</div>` +
        goodsRow("out", "生産", step.outputs, (g) => wanted === null || g.name === wanted) +
        goodsRow("in", "消費", step.inputs, () => true) +
        "</div>";
      return (
        '<div class="pc-node">' +
        (branches ? `<div class="pc-inputs">${branches}</div><span class="pc-arrow"></span>` : "") +
        card +
        "</div>"
      );
    };

    const roots = goals.map((s) => node(s, null, []));
    // 材料をたどれない建物だけを並べた図は、縦に積まずに横へ並べる
    const flat = roots.length > 1 && roots.every((r) => !r.includes('class="pc-inputs"'));

    return (
      '<figure class="pc">' +
      (title ? `<figcaption>${esc(title)}</figcaption>` : "") +
      `<div class="pc-scroll${flat ? " pc-flat" : ""}">${roots.join("")}</div></figure>`
    );
  }

  // 中身をMarkdownとして扱わず、行のまま受け取って図や表にするブロック
  const RAW_BLOCKS = { infobox, chain: chainHtml };

  function preprocess(md) {
    const out = [];
    const stack = [];
    let fence = null; // コードブロック内は変換しない
    let info = null; // RAW_BLOCKS の行を収集中

    for (const line of md.replace(/\r\n?/g, "\n").split("\n")) {
      if (info) {
        if (/^:::\s*$/.test(line)) {
          out.push("", info.render(info.title, info.rows), "");
          info = null;
        } else if (line.trim()) {
          info.rows.push(line.trim());
        }
        continue;
      }

      const f = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (f) {
        if (!fence) fence = f[1];
        else if (f[1][0] === fence[0] && f[1].length >= fence.length && !f[2].trim()) fence = null;
        out.push(line);
        continue;
      }
      if (fence) {
        out.push(line);
        continue;
      }

      const m = /^:::\s*([a-z]+)\s*(.*)$/.exec(line);
      if (m && RAW_BLOCKS[m[1]]) {
        info = { render: RAW_BLOCKS[m[1]], title: m[2].trim(), rows: [] };
      } else if (m && m[1] === "chainindex") {
        out.push("", '<div data-wiki="goods"></div>', "");
      } else if (m && m[1] === "stub") {
        const extra = m[2].trim();
        out.push(
          "",
          '<div class="box box-stub"><p><strong>この項目は書きかけです。</strong>' +
            (extra ? " " + esc(extra) : "") +
            "</p></div>",
          "",
        );
      } else if (m && BLOCKS[m[1]]) {
        const b = BLOCKS[m[1]](m[2].trim());
        stack.push(b.close);
        out.push("", b.open, "");
      } else if (/^:::\s*$/.test(line) && stack.length) {
        out.push("", stack.pop(), "");
      } else {
        out.push(line);
      }
    }

    if (info) out.push("", info.render(info.title, info.rows), "");
    while (stack.length) out.push("", stack.pop(), "");
    return out.join("\n");
  }

  function headingId(text) {
    return text.trim().replace(/\s+/g, "_");
  }

  /* ---------- 本文の仕上げ ---------- */

  function assignHeadingIds(article) {
    const used = new Set();
    for (const hd of article.querySelectorAll("h2, h3, h4")) {
      const base = headingId(hd.textContent) || "section";
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}_${n}`;
      used.add(id);
      hd.id = id;
    }
  }

  function buildToc(article) {
    const heads = [...article.querySelectorAll("h2, h3")].filter((x) => !x.closest("details, .box"));
    if (heads.length < 2) return null;

    const pairs = [];
    const top = h("ol");
    let sub = null;
    let n2 = 0;
    let n3 = 0;

    for (const hd of heads) {
      const isSub = hd.tagName === "H3" && n2 > 0;
      const num = isSub ? `${n2}.${++n3}` : String(++n2);
      if (!isSub) n3 = 0;
      const a = h("a", { href: "#" + hd.id }, h("span", { class: "num" }, num), hd.textContent);
      const li = h("li", null, a);
      pairs.push([hd, a]);
      if (isSub) {
        if (!sub) top.lastElementChild.append((sub = h("ol")));
        sub.append(li);
      } else {
        top.append(li);
        sub = null;
      }
    }

    // スクロール位置に合わせて現在の見出しを強調
    let ticking = false;
    const update = () => {
      ticking = false;
      let active = null;
      for (const [hd, a] of pairs) {
        if (hd.getBoundingClientRect().top > 96) break;
        active = a;
      }
      for (const [, a] of pairs) a.classList.toggle("active", a === active);
    };
    addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );

    // スマホ幅では畳んだ状態から始める
    const narrow = window.matchMedia("(max-width: 699px)").matches;
    return h("details", { class: "toc", open: !narrow }, h("summary", { class: "toc-title" }, "目次"), top);
  }

  function enhanceTables(article) {
    for (const table of article.querySelectorAll("table:not(.infobox)")) {
      const wrap = h("div", { class: "table-wrap" });
      table.replaceWith(wrap);
      wrap.append(table);

      // 日付や種別のような短いセルは、途中で折り返さない（全角を2文字分として20文字分まで）
      for (const cell of table.querySelectorAll("th, td")) {
        const text = cell.textContent.trim();
        const width = [...text].reduce((n, ch) => n + (ch.charCodeAt(0) > 0xff ? 2 : 1), 0);
        if (width <= 20) cell.classList.add("nowrap");
      }

      const body = table.tBodies[0];
      if (!table.tHead || !body || body.rows.length < 2) continue;

      const ths = [...table.tHead.rows[0].cells];
      const value = (tr, i) => (tr.cells[i] ? tr.cells[i].textContent.trim() : "");
      const sortBy = (idx) => {
        const th = ths[idx];
        const dir = th.getAttribute("aria-sort") === "ascending" ? -1 : 1;
        const rows = [...body.rows];
        // 「12」「2,499円」は数値として、「2026-11-16」のような日付は文字として並べる
        const numeric = rows.every((tr) => {
          const v = value(tr, idx);
          return v === "" || /^[-+]?[\d,]*\.?\d+\D*$/.test(v);
        });
        rows.sort((a, b) => {
          const x = value(a, idx);
          const y = value(b, idx);
          if (numeric) return dir * ((parseFloat(x.replace(/,/g, "")) || 0) - (parseFloat(y.replace(/,/g, "")) || 0));
          return dir * x.localeCompare(y, "ja");
        });
        body.append(...rows);
        ths.forEach((x) => x.removeAttribute("aria-sort"));
        th.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
      };

      ths.forEach((th, idx) => {
        th.classList.add("sortable");
        th.tabIndex = 0;
        th.title = "クリックで並べ替え";
        th.addEventListener("click", () => sortBy(idx));
        th.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            sortBy(idx);
          }
        });
      });
    }
  }

  // - [ ] のチェック状態をブラウザに保存する
  function enhanceTasks(article) {
    const seen = new Map();
    const lists = new Set();

    for (const box of article.querySelectorAll('li > input[type="checkbox"]')) {
      const li = box.parentElement;
      const text = li.textContent.trim();
      const n = (seen.get(text) || 0) + 1;
      seen.set(text, n);
      const key = `wiki-check:${rel}:${text}#${n}`;

      const saved = lsGet(key);
      if (saved !== null) box.checked = saved === "1";
      box.disabled = false;
      li.classList.toggle("done", box.checked);

      // チェックボックスと同じ行の文字をラベルにまとめる（入れ子のリストは外に残す）
      const label = h("label");
      while (li.firstChild && !/^(UL|OL)$/.test(li.firstChild.nodeName)) label.append(li.firstChild);
      li.prepend(label);

      li.parentElement.classList.add("task-list");
      lists.add(li.parentElement);
      box.dataset.key = key;
    }

    for (const list of lists) {
      if (list.parentElement.closest(".task-list")) continue; // 入れ子は親にまとめる
      const boxes = [...list.querySelectorAll('input[type="checkbox"]')];
      const bar = h("progress", { max: boxes.length });
      const count = h("span");
      const refresh = () => {
        const done = boxes.filter((b) => b.checked).length;
        bar.value = done;
        count.textContent = `${done} / ${boxes.length}`;
      };
      list.addEventListener("change", (e) => {
        const b = e.target;
        if (!b.dataset || !b.dataset.key) return;
        lsSet(b.dataset.key, b.checked ? "1" : "0");
        b.closest("li").classList.toggle("done", b.checked);
        refresh();
      });
      refresh();
      list.before(h("div", { class: "task-progress" }, bar, count));
    }
  }

  function enhanceLinks(article) {
    for (const a of article.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href");
      if (/^https?:\/\//i.test(href) && !href.startsWith(ROOT)) {
        a.classList.add("external");
        a.target = "_blank";
        a.rel = "noopener";
      }
    }
    for (const img of article.querySelectorAll("img")) img.loading = "lazy";
    article.addEventListener("click", (e) => {
      if (e.target.closest("a.new")) e.preventDefault();
    });
  }

  /* ---------- メインページ用の部品 ---------- */

  const STATUS_CLASS = { プレイ中: "playing", クリア済: "cleared", 中断: "paused", 積み: "backlog" };

  function statusBadge(status) {
    return status ? h("span", { class: "badge " + (STATUS_CLASS[status] || "") }, status) : null;
  }

  function tagLink(tag) {
    const a = h("a", { class: "tag", href: "#" }, tag);
    a.addEventListener("click", (e) => {
      e.preventDefault();
      search.run("#" + tag);
    });
    return a;
  }

  function gamesTable() {
    if (!games.length) return h("p", null, "まだゲームが登録されていません。");
    const head = h("tr", null, ["タイトル", "タグ", "ページ数", "最終更新"].map((t) => h("th", { class: "nowrap" }, t)));
    const rows = games.map((g) => {
      const first = pagesOf(g)[0];
      const title = first ? h("a", { href: url(first) }, g.title) : g.title;
      const tags = (g.tags || []).flatMap((t, i) => (i ? [" ", tagLink(t)] : [tagLink(t)]));
      return h(
        "tr",
        null,
        h("td", null, title, g.summary ? h("div", { class: "r-snip" }, g.summary) : null),
        h("td", null, tags),
        h("td", { class: "nowrap" }, String(pagesOf(g).length)),
        h("td", { class: "nowrap" }, gameUpdated(g)),
      );
    });
    return h("table", null, h("thead", null, head), h("tbody", null, rows));
  }

  function recentList(limit) {
    const list = pages
      .filter((p) => p.updated)
      .sort((a, b) => b.updated.localeCompare(a.updated))
      .slice(0, limit);
    if (!list.length) return h("p", null, "更新履歴はまだありません。");
    return h(
      "ul",
      { class: "recent" },
      list.map((p) =>
        h(
          "li",
          null,
          h("time", { datetime: p.updated }, p.updated),
          h("a", { href: url(p) }, p.game ? `${p.game.title} / ${p.title}` : p.title),
        ),
      ),
    );
  }

  // 品物ごとに「作る建物」「使う建物」をまとめた表。ページ内の :::chain から作る
  function goodsTable() {
    const goods = new Map();
    const entry = (name) => {
      if (!goods.has(name)) goods.set(name, { makers: [], users: [] });
      return goods.get(name);
    };
    const add = (list, key, qty) => {
      const same = list.find((x) => x.key === key);
      if (!same) list.push({ key, qty });
      else if (!same.qty) same.qty = qty;
    };
    for (const step of chainSteps) {
      for (const g of step.outputs) add(entry(g.name).makers, step.key, g.qty);
      for (const g of step.inputs) add(entry(g.name).users, step.key, g.qty);
    }
    if (!goods.size) return h("p", null, "このページには生産チェーンがありません。");

    const cell = (list) =>
      h("td", null, list.length ? list.map((x, i) => [i ? h("br") : null, x.qty ? `${x.key}（${x.qty}）` : x.key]) : "—");
    return h(
      "table",
      null,
      h("thead", null, h("tr", null, ["品物", "作る建物", "使う建物"].map((t) => h("th", null, t)))),
      h("tbody", null, [...goods].map(([name, e]) => h("tr", null, h("td", null, name), cell(e.makers), cell(e.users)))),
    );
  }

  function fillWidgets(article) {
    for (const el of article.querySelectorAll('[data-wiki="goods"]')) el.replaceChildren(goodsTable());
    for (const el of article.querySelectorAll('[data-wiki="games"]')) el.replaceChildren(gamesTable());
    for (const el of article.querySelectorAll('[data-wiki="recent"]')) {
      el.replaceChildren(recentList(Number(el.dataset.limit) || 10));
    }
  }

  /* ---------- 検索 ---------- */

  function toPlain(md) {
    return md
      .replace(/^:::.*$/gm, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/^\s*[-+*]\s+(\[[ xX]\]\s+)?/gm, "")
      .replace(/[#*`>|~]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function setBody(page, markdown) {
    page.plain = toPlain(markdown);
    page.text = page.plain.toLowerCase();
  }

  const search = (function () {
    const input = h("input", {
      type: "search",
      placeholder: `${SITE}内を検索`,
      "aria-label": "検索",
      autocomplete: "off",
    });
    const results = h("div", { class: "search-results", hidden: true });
    const root = h("div", { class: "search", role: "search" }, input, results);
    const local = location.protocol === "file:";
    let loaded = false;
    let sel = -1;

    // 公開後（http/https）は他ページの本文も読み込んで全文検索する
    function loadBodies() {
      if (loaded) return;
      loaded = true;
      if (local) return;
      const jobs = pages
        .filter((p) => p.text === undefined)
        .map((p) =>
          fetch(url(p))
            .then((r) => (r.ok ? r.text() : ""))
            .then((html) => {
              const m = /<script[^>]*type=["']text\/markdown["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
              setBody(p, m ? m[1] : "");
            })
            .catch(() => {}),
        );
      Promise.all(jobs).then(() => {
        if (input.value.trim() && !results.hidden) render();
      });
    }

    function score(page, terms) {
      const g = page.game;
      const tags = g ? (g.tags || []).map(norm) : [];
      let total = 0;
      for (const t of terms) {
        if (t.length > 1 && t.startsWith("#")) {
          // #タグ はゲームのトップページだけを返す
          if (!g || pagesOf(g)[0] !== page || !tags.includes(t.slice(1))) return 0;
          total += 5;
          continue;
        }
        const inTitle = norm(page.title).includes(t);
        const inGame = !!g && (norm(g.title).includes(t) || norm(g.summary || "").includes(t));
        const inTag = tags.some((x) => x.includes(t));
        const inBody = !!page.text && page.text.includes(t);
        if (!inTitle && !inGame && !inTag && !inBody) return 0;
        total += (inTitle ? 10 : 0) + (inGame ? 6 : 0) + (inTag ? 4 : 0) + (inBody ? 1 : 0);
      }
      return total;
    }

    function highlight(text, terms) {
      const words = terms.filter((t) => !t.startsWith("#"));
      if (!words.length) return [text];
      const re = new RegExp("(" + words.map(reEsc).join("|") + ")", "gi");
      return text.split(re).map((part, i) => (i % 2 ? h("mark", null, part) : part));
    }

    function snippet(page, terms) {
      if (!page.text) return null;
      let at = -1;
      for (const t of terms) {
        at = page.text.indexOf(t);
        if (at >= 0) break;
      }
      if (at < 0) return null;
      const start = Math.max(0, at - 30);
      const piece = (start > 0 ? "…" : "") + page.plain.slice(start, at + 70) + (at + 70 < page.plain.length ? "…" : "");
      return h("div", { class: "r-snip" }, highlight(piece, terms));
    }

    function render() {
      loadBodies();
      const terms = norm(input.value).split(/[\s　]+/).filter(Boolean);
      sel = -1;
      if (!terms.length) {
        results.hidden = true;
        return;
      }
      const hits = pages
        .map((p) => ({ p, s: score(p, terms) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 20);

      results.replaceChildren(
        ...hits.map(({ p }) =>
          h(
            "a",
            { href: url(p) },
            h("span", { class: "r-title" }, highlight(p.title, terms)),
            p.game ? h("span", { class: "r-sub" }, p.game.title) : null,
            snippet(p, terms),
          ),
        ),
      );
      if (!hits.length) results.append(h("div", { class: "search-note" }, "一致するページはありません。"));
      if (local) {
        results.append(
          h("div", { class: "search-note" }, "ローカル表示中はタイトルとタグのみ検索します（公開後は本文も対象）。"),
        );
      }
      results.hidden = false;
    }

    function move(step) {
      const links = [...results.querySelectorAll("a")];
      if (!links.length) return;
      sel = (sel + step + links.length) % links.length;
      links.forEach((a, i) => a.classList.toggle("sel", i === sel));
      links[sel].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("focus", () => {
      loadBodies();
      if (input.value.trim()) render();
    });
    input.addEventListener("input", render);
    input.addEventListener("keydown", (e) => {
      if (e.isComposing) return; // 日本語変換中の Enter は無視
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        move(e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === "Enter") {
        const links = results.querySelectorAll("a");
        const target = links[Math.max(sel, 0)];
        if (!results.hidden && target) location.href = target.href;
      } else if (e.key === "Escape") {
        results.hidden = true;
        input.blur();
      }
    });
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target) && !e.target.closest("a.tag")) results.hidden = true;
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      e.preventDefault();
      input.focus();
    });

    return {
      root,
      run(query) {
        document.body.classList.remove("nav-open");
        input.value = query;
        input.focus();
        render();
      },
    };
  })();

  /* ---------- 画面の組み立て ---------- */

  function buildHeader() {
    const menu = h("button", { class: "icon-btn menu-btn", type: "button", "aria-label": "メニュー" }, "☰");
    menu.addEventListener("click", () => document.body.classList.toggle("nav-open"));

    const theme = h("button", { class: "icon-btn", type: "button", "aria-label": "ライト／ダークを切り替え", title: "ライト／ダーク切替" }, "◐");
    theme.addEventListener("click", () => {
      lsSet(THEME_KEY, document.documentElement.dataset.theme === "dark" ? "light" : "dark");
      applyTheme();
    });

    const logo = h(
      "a",
      { class: "logo", href: ROOT + "index.html" },
      h("span", { class: "logo-mark", "aria-hidden": "true" }, SITE.charAt(0)),
      h("span", { class: "logo-text" }, SITE),
      W.tagline ? h("small", null, W.tagline) : null,
    );

    return h("header", { class: "site-header" }, menu, logo, search.root, theme);
  }

  function navItem(page) {
    if (page === cur) return h("li", null, h("strong", null, page.title));
    return h("li", null, h("a", { href: url(page) }, page.title));
  }

  function buildSidebar() {
    const section = (title, ...kids) => h("section", null, h("h2", null, title), kids);
    const nav = h("nav", { class: "sidebar", "aria-label": "サイト内ナビゲーション" });

    nav.append(section("ナビゲーション", h("ul", null, pages.filter((p) => !p.game).map(navItem))));

    if (games.length) {
      nav.append(
        section(
          "ゲーム",
          games.map((g) =>
            h(
              "details",
              { open: g === curGame || games.length <= 3 }, // ゲームが少ないうちは全部開いておく
              h("summary", null, g.title),
              h("ul", null, pagesOf(g).map(navItem)),
            ),
          ),
        ),
      );
    }

    const tags = [...new Set(games.flatMap((g) => g.tags || []))];
    if (tags.length) nav.append(section("タグ", h("div", { class: "tags" }, tags.map(tagLink))));

    return nav;
  }

  function buildBreadcrumb(title) {
    if (rel === "index.html") return null;
    const sep = () => h("span", { class: "sep", "aria-hidden": "true" }, "›");
    const bc = h("nav", { class: "breadcrumb", "aria-label": "パンくずリスト" }, h("a", { href: ROOT + "index.html" }, "メインページ"));
    if (curGame) {
      const first = pagesOf(curGame)[0];
      if (first && first !== cur) bc.append(sep(), h("a", { href: url(first) }, curGame.title));
      else bc.append(sep(), curGame.title);
      if (cur && cur !== first) bc.append(sep(), cur.title);
    } else {
      bc.append(sep(), cur ? cur.title : title);
    }
    return bc;
  }

  // GitHub 上の編集画面と変更履歴へのリンク（pages.js に repo があるときだけ出す）
  function buildActions() {
    if (!W.repo || !rel) return null;
    const path = rel.split("/").map(encodeURIComponent).join("/");
    const link = (label, kind, title) =>
      h(
        "a",
        { href: `https://github.com/${W.repo}/${kind}/${W.branch || "main"}/${path}`, target: "_blank", rel: "noopener", title },
        label,
      );
    return h(
      "span",
      { class: "page-actions" },
      link("編集", "edit", "GitHub でこのページを編集する"),
      link("履歴", "commits", "このページの変更履歴を見る"),
    );
  }

  function buildTabs() {
    const list = curGame ? pagesOf(curGame) : [];
    const actions = buildActions();
    if (list.length < 2 && !actions) return null;
    return h(
      "nav",
      { class: "page-tabs", "aria-label": curGame ? `${curGame.title} のページ` : "ページの操作" },
      list.length < 2 ? null : list.map((p) => (p === cur ? h("strong", null, p.title) : h("a", { href: url(p) }, p.title))),
      actions,
    );
  }

  function buildMeta() {
    const items = [];
    if (curGame) {
      items.push(statusBadge(curGame.status));
      for (const t of curGame.tags || []) items.push(tagLink(t));
    }
    if (cur && cur.updated) items.push(h("span", null, `最終更新 ${cur.updated}`));
    const shown = items.filter(Boolean);
    return shown.length ? h("div", { class: "page-meta" }, shown) : null;
  }

  function buildFooter() {
    return h(
      "footer",
      { class: "page-footer" },
      cur && cur.updated ? h("p", null, `このページの最終更新: ${cur.updated}`) : null,
      W.footer ? h("p", null, W.footer) : null,
    );
  }

  /* ---------- 実行 ---------- */

  const srcEl = document.querySelector('script[type="text/markdown"]');
  const source = srcEl ? srcEl.textContent : "";
  const article = h("article", { class: "body" });

  if (typeof marked === "undefined") {
    article.textContent = "marked.min.js を読み込めませんでした。assets/vendor/ を確認してください。";
  } else {
    setupMarked();
    article.innerHTML = marked.parse(preprocess(source));
  }
  if (cur) setBody(cur, source);

  const h1 = article.querySelector("h1");
  const title = h1 ? h1.textContent.trim() : cur ? cur.title : SITE;
  if (h1) h1.remove();
  document.title = [title, curGame && curGame.title !== title ? curGame.title : null, SITE]
    .filter((x) => x && (x !== SITE || title !== SITE))
    .join(" - ") || SITE;

  fillWidgets(article);
  assignHeadingIds(article);
  enhanceTables(article);
  enhanceTasks(article);
  enhanceLinks(article);

  const tabs = buildTabs();
  const content = h(
    "main",
    { class: "content" },
    buildBreadcrumb(title),
    h("h1", { class: "page-title" + (tabs ? " has-tabs" : "") }, title),
    tabs,
    buildMeta(),
    buildToc(article),
    article,
    buildFooter(),
  );

  const backdrop = h("div", { class: "backdrop" });
  backdrop.addEventListener("click", () => document.body.classList.remove("nav-open"));

  document.body.prepend(buildHeader(), backdrop, h("div", { class: "layout" }, buildSidebar(), content));

  // 本文は後から描画されるので、#見出し への移動をやり直す
  if (location.hash.length > 1) {
    let id = location.hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch (e) {
      /* そのまま使う */
    }
    const target = document.getElementById(id);
    if (target) {
      const spoiler = target.closest("details");
      if (spoiler) spoiler.open = true;
      target.scrollIntoView();
    }
  }
  dispatchEvent(new Event("scroll"));
})();
