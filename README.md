# PrivateWiki

個人用のゲームメモを、Wikipedia風の見た目でまとめる静的サイト。
ビルドもサーバーも不要で、`index.html` をブラウザで開けばそのまま見られる。

## 構成

```
index.html              メインページ（ゲーム一覧・最近の更新）
help.html               記法ガイド（書き方の見本）
assets/
  pages.js              ページ索引 ← ページを足したらここに書く
  wiki.css              見た目
  wiki.js               Markdownの描画、サイドバー、目次、検索
  vendor/marked.min.js  Markdownパーサ（marked v12.0.2、MITライセンス）
games/
  _template/            新しいゲーム・ページのひな形
  county-of-fortune/    ゲームごとのフォルダ
```

## ページを足す

1. `games/_template/page.html` をゲームのフォルダにコピーして、名前を変える
2. `<script type="text/markdown">` の中に Markdown で本文を書く
3. `assets/pages.js` の、そのゲームの `pages` に1行足す

## ゲームを足す

1. `games/_template/` をフォルダごとコピーして、フォルダ名をゲームのIDにする（半角英数とハイフン）
2. `assets/pages.js` の `games` にゲームを1件足す

書き方の詳細（ネタバレの折りたたみ、チェックリスト、基礎情報ボックスなど）は `help.html` を参照。

## 公開する

フォルダをそのまま静的ホスティング（GitHub Pages など）に置けば動く。リンクはすべて相対パス。

- 検索は、公開後（http/https）は本文まで対象になる。ローカルでファイルを直接開いているときは、タイトルとタグだけが対象。
- チェックリストのチェック状態は、見ている人のブラウザにだけ保存される。
