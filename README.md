# 冰原家园 · R14

独立的冰原农场经营游戏。原生 JavaScript、Canvas 和本地存档；无需后端或第三方运行时服务。

## 本地运行

需要 Node.js 22 或更新版本。

```sh
npm ci
npm test
npm run preview
```

访问终端输出的本地地址，默认是 http://127.0.0.1:4173。

## 项目结构

- `src/`：页面、样式、游戏逻辑、配置和资源映射
- `assets-r14/`：167 个运行时美术资源、设计对照图、字体与许可证
- `scripts/build.mjs`：可重复构建和资源校验
- `tests/`：19 项核心测试、15 项中断/存档/素材回归测试，以及托管包检查
- `.github/workflows/preview.yml`：推送到 main 后测试并发布 GitHub Pages；PR 仅测试
- `dist/`：构建后的托管页面，不提交到 Git
- `.build/ice-farm-standalone.html`：同时生成的离线单文件版，不提交到 Git

## GitHub Pages

仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
工作流通过后，Actions 运行和 `github-pages` 环境会显示预览网址。

预览站点通常公开可访问，即使源仓库是私有仓库。GitHub Free 的 Pages 需要公开仓库；私有仓库需要符合要求的付费计划。不要为部署擅自更改仓库可见性。

官方说明：
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 存档与迁移

游戏保留原有 `ice-homestead-pixel-v3` 存档格式。存档存储在浏览器本地，不上传到服务器。
从离线文件或其他网址迁移时，需要先导出存档，再在新网址导入；浏览器不会自动跨站迁移 localStorage。

## 验证范围

此包由 R14 单文件版本拆分，游戏逻辑保持不变。已有 VM 和真实 Canvas 测试不等同于浏览器测试。完整浏览器布局、触摸、键盘、控制台和响应式验收仍需在实际预览网址完成。

项目美术和代码未授予开源许可。字体许可位于 `assets-r14/fonts/LICENSE.txt`。
