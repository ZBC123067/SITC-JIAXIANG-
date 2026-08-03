# SITC JIAXIANG V14 · GitHub Pages 发布说明

当前公开仓库 `ZBC123067/SITC-JIAXIANG-` 只有 `index.html`。这会导致：管理后台 404、手机顶部功能区缺失、CVM 无法隐藏、按钮样式和交互全部失效。

## 正确上传方式

1. 解压 `SITC_JIAXIANG_GitHub_Pages_v14.zip`。
2. 打开仓库 `https://github.com/ZBC123067/SITC-JIAXIANG-`。
3. 删除或覆盖旧的 `index.html`，并把解压后的**全部文件和文件夹**上传到 `main` 分支根目录。
4. 上传完成后，仓库根目录必须至少能看到：
   - `index.html`
   - `admin.html`
   - `deploy-check.html`
   - `service-worker.js`
   - `manifest.webmanifest`
   - `VERSION.txt`
   - `assets` 文件夹
   - `data` 文件夹
5. 等待 GitHub Pages 更新后打开：
   `https://zbc123067.github.io/SITC-JIAXIANG-/deploy-check.html`
6. 看到“6/6 全部通过”后，再打开：
   `https://zbc123067.github.io/SITC-JIAXIANG-/`

注意：正确地址包含 `/SITC-JIAXIANG-/`。`https://zbc123067.github.io/` 根地址目前没有独立站点。
