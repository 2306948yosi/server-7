'use strict';

function dataset() {
  return {
    // 起動時にひとまずポケモン一覧を更新する
    init() {
      this.updateTable();
    },

    list: false,

    /* ポケモン一覧を更新 */
    async updateTable() {
      // コレクションを取得
      const res = await fetch('/api/pokemons');
      if (!res.ok) return;
      this.list = await res.json();
    },

    inputs: { name: '', type: '', level: '', nickname: '' },

    /*** リソースを作成 ***/
    async createData() {
      // メッセージボディの作成
      const body = new FormData();
      body.append('record', JSON.stringify(this.inputs));

      // POSTリクエスト
      const res = await fetch('/api/pokemons', {
        method: 'POST',
        body: body
      });

      // レスポンスの確認
      const created = await res.json();
      if (res.ok) {
        console.log(JSON.stringify(created, null, 2));
      } else {
        console.warn(created.message);
        return;
      }

      // フォームをクリア
      this.inputs = { name: '', type: '', level: '', nickname: '' };

      // ポケモン一覧を更新
      this.updateTable();
    },

    /* 詳細表示中のレコード */
    selectedRecord: false,
    queryId: '',

    /*** リソースを取得 ***/
    async retrieveData() {
      if (!this.queryId) {
        console.log('詳細表示するポケモンが選ばれていません。');
        return;
      }

      // GETリクエスト（リソースの単体取得）
      const res = await fetch(`/api/pokemons/${this.queryId}`);
      const retrieved = await res.json();
      this.queryId = ''; // フォームをクリア

      // レスポンスを確認
      if (!res.ok) {
        console.warn(retrieved.message);
        return;
      }

      // 詳細表示中のレコードを記録
      this.selectedRecord = retrieved;
      console.log(JSON.stringify(this.selectedRecord, null, 2));

      // 詳細テーブルに表示 → petite-vueだと自動的にそうなる
    },

    update: { nickname: '', level: '' },

    /*** リソースを更新 ***/
    async updateData() {
      // 詳細表示のIDが選択されているか確認
      if (!this.selectedRecord) {
        console.warn('更新するポケモンが選ばれていません。');
        return;
      }

      const level = this.update.level;
      const nickname = this.update.nickname;

      // フォームから更新データを取得
      if (!level && !nickname) {
        console.warn('いずれかの更新内容を入力してください。');
        return;
      }

      // メッセージボディを準備
      if (level) this.selectedRecord['level'] = level;
      if (nickname) this.selectedRecord['nickname'] = nickname;
      const body = new FormData();
      body.append('record', JSON.stringify(this.selectedRecord));

      // フォームのクリア
      this.update = { nickname: '', level: '' };

      // PUTリクエスト
      const id = this.selectedRecord.id;
      const res = await fetch(`/api/pokemons/${id}`, {
        method: 'PUT',
        body: body
      });

      // レスポンスの確認
      if (!res.ok) {
        const error = await res.json();
        console.warn(error.message);
      }
    },

    /*** リソースを削除 ***/
    async deleteData() {
      // よく使うので変数に
      const selected = this.selectedRecord;

      // 詳細表示のIDが選択されているか確認
      if (!selected) {
        console.log('削除するポケモンが選ばれていません。');
        return;
      }

      // DELETEリクエスト
      const id = selected.id;
      const res = await fetch(`/api/pokemons/${id}`, { method: 'DELETE' });

      // レスポンスの確認
      if (res.ok) {
        console.log(`ID:${id} のポケモンが削除されました。`);
        // 各テーブルを更新
        this.selectedRecord = false;
        this.updateTable();
      } else {
        console.warn(updated.message);
      }
    },

    /* リソースをすべて削除 */
    async deleteDataAll() {
      const res = await fetch('/api/pokemons', { method: 'DELETE' });
      if (res.ok) {
        this.selectedRecord = false;
        this.list = [];
      } else {
        console.warn(updated.message);
      }
    }
  };
}