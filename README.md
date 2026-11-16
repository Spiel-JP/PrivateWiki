# PrivateWiki

ゲームのメモを、Wikipedia風の見た目でまとめる静的サイト。GitHub で共同編集する。
ビルドもサーバーも不要で、`index.html` をブラウザで開けばそのまま見られる。

## 構成

```
index.html              メインページ（ゲーム一覧・最近の更新）
help.html               記法ガイド（編集の手順と書き方の見本）
assets/
  pages.js              ページ索引 ← ページを足したらここに書く
  wiki.css              見た目
  wiki.js               Markdownの描画、サイドバー、目次、検索
  vendor/marked.min.js  Markdownパーサ（marked v12.0.2、MITライセンス）
games/
  _template/            新しいゲーム・ページのひな形
  county-of-fortune/    ゲームごとのフォルダ
  crusader-kings-3/
```

## 編集する

各ページのタイトルの下にある「編集」を押すと、GitHub の編集画面が開く。
`<script type="text/markdown">` の中の本文を Markdown で書き換えて、「Commit changes...」で保存する。

書き方の詳細（ネタバレの折りたたみ、チェックリスト、基礎情報ボックスなど）は `help.html` を参照。

### ページを足す

1. `games/_template/page.html` をゲームのフォルダにコピーして、名前を変える
2. `<script type="text/markdown">` の中に Markdown で本文を書く
3. `assets/pages.js` の、そのゲームの `pages` に1行足す

### ゲームを足す

1. `games/_template/` をフォルダごとコピーして、フォルダ名をゲームのIDにする（半角英数とハイフン）
2. `assets/pages.js` の `games` にゲームを1件足す

## 書くときの決まり

- 出典を確認できたことだけを書く。確認できていないことは、空欄か「未確認」にする。
- 公式の画像や他サイトの文章を、そのまま載せない。
- 本文に書いたHTMLはそのまま表示される。共同編集者以外からの変更の提案（プルリクエスト）は、見慣れない `<script>` などが入っていないか確認してから取り込む。

## 管理者向け

### 公開する（GitHub Pages）

1. リポジトリの Settings → Pages を開く
2. 「Build and deployment」の Source を「Deploy from a branch」にする
3. Branch を `main`、フォルダを `/ (root)` にして Save を押す
4. 数分後、`https://spiel-jp.github.io/PrivateWiki/` で見られるようになる

非公開（Private）リポジトリで Pages を使うには、有料プラン（GitHub Pro など）が必要。無料プランの場合は、Settings → General のいちばん下でリポジトリを公開（Public）に変える。

リポジトリを別の場所に移したときは、`assets/pages.js` の `repo` を書き換える（「編集」「履歴」リンクの行き先になる）。

### 共同編集者を招待する

1. リポジトリの Settings → Collaborators を開く
2. 「Add people」を押し、相手の GitHub ユーザー名を入れて招待する
3. 相手が招待メールから承認すると、直接編集できるようになる

招待していない人は、直接は編集できない。公開リポジトリであれば、変更の提案（プルリクエスト）を送ることはできる。

## 知っておくこと

- 検索は、公開後（http/https）は本文まで対象になる。ローカルでファイルを直接開いているときは、タイトルとタグだけが対象。
- チェックリストのチェック状態は、見ている人のブラウザにだけ保存される。
- `games/_template/` は、GitHub Pages では公開されない（`_` で始まるフォルダは除外される）。
