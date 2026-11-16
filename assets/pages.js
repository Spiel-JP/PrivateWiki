/* ページ索引
 *
 * ページやゲームを追加したら、ここに書き足す。
 * サイドバー・タブ・検索・メインページの一覧は、すべてこのファイルから作られる。
 *
 *   id      … games/ 以下のフォルダ名（半角英数とハイフン）
 *   status  … プレイ中 / クリア済 / 中断 / 積み（省略可。書くとページ上部にバッジが出る）
 *   pages   … 先頭がそのゲームのトップページ。file はフォルダ内のファイル名
 *   updated … 更新日（YYYY-MM-DD）。メインページの「最近の更新」に出る
 */
window.WIKI = {
  title: "PrivateWiki",
  tagline: "ゲームメモ",
  footer: "有志が編集しているメモです。内容の正確性は保証しません。各ゲームの名称等の権利は各権利者に帰属します。",

  // GitHub のリポジトリ。各ページの「編集」「履歴」リンクの行き先になる
  repo: "Spiel-JP/PrivateWiki",
  branch: "main",

  // ゲームに属さないページ（ルート直下）
  site: [{ file: "help.html", title: "記法ガイド", updated: "2026-11-16" }],

  games: [
    {
      id: "county-of-fortune",
      title: "County of Fortune",
      status: "プレイ中",
      tags: ["街づくり", "ストラテジー", "中世", "早期アクセス"],
      summary: "集落を建てて伯爵領まるごとを育てる、中世の街づくりゲーム。",
      pages: [
        { file: "index.html", title: "概要", updated: "2026-11-16" },
        { file: "memo.html", title: "プレイメモ", updated: "2026-11-16" },
        { file: "todo.html", title: "やること", updated: "2026-11-16" },
      ],
    },
    {
      id: "crusader-kings-3",
      title: "Crusader Kings III",
      tags: ["ストラテジー", "中世", "歴史"],
      summary: "中世の君主と一族を何世代にもわたって操る、人物が主役のストラテジー。",
      pages: [
        { file: "index.html", title: "概要", updated: "2026-11-16" },
        { file: "dlc.html", title: "DLC一覧", updated: "2026-11-16" },
        { file: "memo.html", title: "プレイメモ", updated: "2026-11-16" },
      ],
    },
  ],
};
