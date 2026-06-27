# 15 分鐘 Stroop 疲勞誘發網頁版

本專案為純前端 HTML / CSS / JavaScript，可直接部署至 GitHub Pages。

## 功能

- 受試者編號與場次輸入
- 作業前疲勞 VAS
- 16 題練習
- 15 分鐘正式 Stroop 作業
- 35% congruent / 65% incongruent
- F / G / J / K 鍵盤反應
- 作業後疲勞 VAS
- 自動產生並下載 CSV
- 無伺服器、無資料上傳

## 本機測試

直接雙擊 `index.html` 即可執行。

較穩定的方式：

```bash
python -m http.server 8000
```

再開啟：

```text
http://localhost:8000
```

## 部署到 GitHub Pages

1. 在 GitHub 建立新的 repository。
2. 上傳下列檔案到 repository 根目錄：
   - `index.html`
   - `style.css`
   - `app.js`
3. 進入 repository：
   - `Settings`
   - `Pages`
4. 在 `Build and deployment`：
   - Source 選 `Deploy from a branch`
   - Branch 選 `main`
   - Folder 選 `/root`
5. 儲存後，GitHub 會產生公開網址。

## 研究注意事項

瀏覽器版本適合：

- 行為反應時間紀錄
- 疲勞誘發
- VAS 收集
- 一般實驗流程

但瀏覽器計時會受以下因素影響：

- 作業系統排程
- 螢幕更新率
- 瀏覽器背景程序
- 鍵盤硬體延遲

因此，不建議把此版本當作毫秒級 ERP 刺激呈現或精密 EEG trigger 的唯一控制程式。

若需要與 Emotiv Cortex、LSL 或硬體 trigger 同步，建議保留 PsychoPy 桌面版，或另外建立本機橋接程式。
