import { Hono } from 'jsr:@hono/hono';
import { serveStatic } from 'jsr:@hono/hono/deno';
const app = new Hono();

app.use('/*', serveStatic({ root: './public' }));

// データベースの準備
const kv = await Deno.openKv();

/***  リソースの作成 ***/
app.post('/api/pokemons', async (c) => {
  //リクエストボディを所得：JSON.parse メソッドでオブジェクトに変換してから定数 record で受け取る。
  const body = await c.req.parseBody();
  const record = JSON.parse(body['record']);

  // IDと生成時刻を生成してレコードに追加。
  const id = await getNextId();
  record['id'] = id;
  record['createdAt'] = new Date().toISOString();

  // リソースの作成：ID と作成日時を追加したオブジェクト record をデータベースに登録。
  await kv.set(['pokemons', id], record);

  // レスポンスの作成：作成に成功したときは「201 Created」を返す。
  c.status(201); 
  c.header('Location', `/api/pokemons/${id}`);

  return c.json({ record });
});

/*** リソースの取得（レコード単体） ***/
app.get('/api/pokemons/:id', async (c) => {
  // パラメーターの取得と検証：パスパラメーター（id）を Context オブジェクトの req.param メソッドで取得。Number コンストラクターで Number 型にしておく。
  const id = Number(c.req.param('id'));

  // リソース（レコード）の取得
  const pkmn = await kv.get(['pokemons', id]);

  // レコードがあったとき：リソースが取得できたときのステータスは「200 OK」ですが、既定値なので status メソッドで設定する必要はない。
  if (pkmn.value) {
    return c.json(pkmn.value);
  }
  // レコードがなかったとき：「404 Not Found」を付けてレスポンス。どういう問題が生じたか、message プロパティで添えておく。
  else {
    c.status(404); 
    return c.json({ message: `IDが ${id} のポケモンはいませんでした。` });
  }
});

/*** リソースの取得（コレクション） ***/
app.get('/api/pokemons', async (c) => {
  // コレクションの取得
  const pkmns = await kv.list({ prefix: ['pokemons'] });

  // レコードがあったとき： Array.fromAsync メソッドを使って Deno KV のリスト）を「配列」に変換し、その長さが 0 以上かどうかで判断。
  const pkmnList = await Array.fromAsync(pkmns);
  if (pkmnList.length > 0) {
    return c.json(pkmnList.map((e) => e.value));
  }
  // レコードが1つもなかったとき
  else {
    c.status(404); 
    return c.json({ message: 'pokemonコレクションのデータは1つもありませんでした。' });
  }
});

/*** リソースの更新 ***/
app.put('/api/pokemons/:id', async (c) => {
   // パラメーターの取得と検証
  const id = Number(c.req.param('id'));
  if (isNaN(id) || !Number.isInteger(id)) {
    c.status(400); 
    return c.json({ message: '更新したいポケモンのIDを正しく指定してください。' });
  }

  // データベースにレコードがあるか確認：Deno KV の list メソッドでコレクションを取得し、for await...of 文で ID が一致するレコードを探す。
  const pkmns = await kv.list({ prefix: ['pokemons'] });
  let existed = false;
  for await (const pkmn of pkmns) {
    if (pkmn.value.id == id) {
      existed = true;
      break;
    }
  }

  // レコードがある（更新）
  if (existed) {
    // リクエストボディを取得：更新対象のレコードがあることを確認したら、リクエストボディから更新データを req.parseBody メソッドで取得。
    const body = await c.req.parseBody();
    const record = JSON.parse(body['record']);

    // リソースを更新（上書き）
    await kv.set(['pokemons', id], record);

    c.status(204); 
    return c.body(null);
  }
  // レコードがない（何もしない）
  else {
    c.status(404); 
    return c.json({ message: `IDが ${id} のポケモンはいませんでした。` });
  }
});

/*** リソースの削除 ***/
app.delete('/api/pokemons/:id', async (c) => {
  // パラメーターの取得
  const id = Number(c.req.param('id'));

  // データベースにレコードがあるか確認
  const pkmns = await kv.list({ prefix: ['pokemons'] });
  let existed = false;
  for await (const pkmn of pkmns) {
    if (pkmn.value.id == id) {
      existed = true;
      break;
    }
  }

  // レコードがある（削除）
  if (existed) {
    await kv.delete(['pokemons', id]);
    c.status(204); // 204 No Content
    return c.body(null);
  }
  // レコードがない
  else {
    c.status(404); // 404 Not Found
    return c.json({ message: `IDが ${id} のポケモンはいませんでした。` });
  }
});

Deno.serve(app.fetch);
