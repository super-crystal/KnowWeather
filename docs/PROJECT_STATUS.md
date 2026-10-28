# 1.4.2 空气质量多数据源（2026-10-28）

当前源码与正式签名构建为 **1.4.2 / versionCode 12**。首页及空气质量详情底部可切换 CAMS、WAQI、OpenWeather、香港环保署；个人密钥本机配置，资料按来源展示标准、单位、时间和署名。

39项检查及Edge移动视口交互通过；CAMS、香港18站真实接口通过；WAQI/OpenWeather使用模拟响应验证，尚无个人密钥实测。APK签名校验通过，摘要见发布清单。未进行安卓实体设备运行测试。[版本说明](releases/1.4.2.md)及[来源文档](空气质量数据源.md)。

GitHub发布状态以对应Release和本机工作记录回读结果为准。

以下为1.4.1基线及Git迁移记录。

# 项目续作入口

当前已发布版本：**1.4.1 / versionCode 11**，标签`v1.4.1`。本地Git已导入11个核验过的历史快照；早期原生源码的缺失情况在每个标签和`docs/version-import.json`中明确记录。

当前版33项检查通过。多云、阴雨、夜云和暮光使用用户提供APK云层法线数据着色得到的4张WebP，来源和生成方式见`research/cloud-assets.json`、`research/shade-clouds.py`及`docs/1.4.1-云层与反编译分析.md`。

后续优先读本文件、`docs/Git版本管理.md`和实际待修改版本说明，再按需读源码。应用入口`web-src/app.js`；动态天空`sky.mjs`、`sky-model.mjs`；原生入口及桌面卡片`src/cn/weatherly/app/`；测试文件位于仓库根目录。

开发记录写在本机`工作记录.md`（不上传），重要的项目状态同步到本文件。不要重新扫描完整聊天、原APK或全部历史版本。密钥单独保存；不提交`.signing/`。既有版本标签和发布包保持不变，后续用新提交及新标签发布。

用户已确认后续新版默认完整交付：完成修改与验证，更新版本说明/发布清单/工作记录，提交推送代码、创建推送版本标签、上传正式APK与校验文件到对应GitHub Release，并回读确认。具体顺序见`docs/Git版本管理.md`；这项长期约定无需每次重新确认。

Git迁移已核对11个快照；最新纯源码导出通过33项检查和独立Unsigned构建，28项Web资产、DEX/资源表与正式1.4.1一致。详见`docs/Git迁移验证.md`。私有远程仓库为https://github.com/super-crystal/KnowWeather，本机origin使用其HTTPS地址，远程同步通过Git Credential Manager授权。

2026-10-25已完成远程同步：main、11个注释标签及11个正式Releases。每版含原签名APK和SHA256SUMS.txt，GitHub回读大小/摘要与原件一致；latest为v1.4.1。[发布入口](https://github.com/super-crystal/KnowWeather/releases)。本轮仅迁移版本管理，未修改应用运行功能或重新发送旧版邮件。
