# 知天气的 Git / GitHub 工作方式

当前开发目录就是 Git 工作区，`main` 保存后续开发。旧版文件夹继续作为本地只读备份，后续用提交、标签和发布记录管理版本，不再为了每次发布复制整份项目。

## 已导入的版本

已从核验过的本地归档导入1.0.0～1.4.1，共11个快照和`v1.0.0`～`v1.4.1`标签。提交时间是本次导入时间，没有伪造旧作者或开发日期。每个快照的APK哈希、原生源码完整性在`docs/version-import.json`及标签说明中。

1.0.0～1.2.3缺少原始Java源码，只保留当时真实网页源码、资源和原DEX；`native-compiled/classes.dex`是这些版本独立重建所需的历史例外。1.2.4及以后保存对应完整Java源码。没有拿最新版源码冒充旧版。

`docs/releases/`保存逐版修改说明；`docs/releases/manifest.json`记录全部已发布APK的大小和SHA256。APK存放在GitHub Releases或既有网盘，不进入Git源码历史。

## 日常修改

```powershell
git status
git diff
git add <本次修改的文件>
git commit -m "描述这次修改"
git push origin main
```

查看旧版时可以直接浏览标签；需要运行旧版，再临时建立工作树，例如`git worktree add ../weatherly-inspect v1.4.0`。不需要预先保存11份工作目录。

## 构建和发布

当前构建脚本使用Windows PowerShell/PowerShell7、JDK21、Node.js、Android SDK Platform36及BuildTools35.0.0。城市目录已在源码中，构建不依赖工作区外的原始网站。

```powershell
node --test --test-isolation=none motion.test.mjs location.test.mjs map-health.test.mjs weather-data.test.mjs sky.test.mjs
./build.ps1 -SdkRoot <SDK路径> -Unsigned
./build.ps1 -SdkRoot <SDK路径>
```

产物放在`output/builds/`，不会覆盖已有的已发布APK。正式签名默认使用本机`.signing/`，也可以显式指定`-KeyStore`和`-PasswordFile`。克隆到另一台电脑后，先单独恢复原密钥；缺失密钥时构建会停止，或用`-Unsigned`仅做验证，不会自动生成另一套签名。

发布时先修改Manifest版本号/版本代码、原生User-Agent及版本说明，完成验证，再提交和创建对应标签，推送`main`与标签，将签名APK和SHA256上传到GitHub Releases。比如未来发布1.4.2时才创建`v1.4.2`，当前没有提前创建这个标签。

## 仓库范围

跟踪Java/Web源码、应用资源、构建脚本、测试、版本说明及云图来源记录。`.signing/`、密钥/密码文件、APK、输出、缓存、研究网页快照和本机工作日志被忽略；不把SDK、模拟器、ColorOS原APK或反编译目录搬进仓库。云图及地图/Leaflet来源继续按既有文档记录，不为整个项目随意添加开源授权。

GitHub使用私有仓库 [super-crystal/KnowWeather](https://github.com/super-crystal/KnowWeather)，本机origin为`https://github.com/super-crystal/KnowWeather.git`。完整提交与标签通过Git客户端同步；Windows凭据由Git Credential Manager保存，不把密码或访问令牌写入项目。APK仍与源码分开管理。

2026-10-25迁移已完成：main及11个注释标签已推送；[Releases](https://github.com/super-crystal/KnowWeather/releases)保存全部11个原签名APK和逐版`SHA256SUMS.txt`，当前latest为v1.4.1。上传后回读的22个附件均处于uploaded状态，每版APK大小和SHA256与原归档一致。私有仓库仅授权的GitHub账号可访问，分享下载时仍可沿用既有Drive/邮件约定。

一次性历史上传工具`scripts/publish-archived-releases.py`读取本机旧归档和系统Git凭据，默认仅核验；显式`--apply`才发布。只允许与origin一致且有push权限的私有仓库；已有同名附件须大小/摘要一致才复用，不覆盖不同内容。它用于这次历史迁移，后续新版本按上面的构建和发布流程办理，无需重复运行导入或迁移。

本机还保存了`output/git-migration/weatherly-history.bundle`作为独立Git备份。原11个版本目录及已发安装包仍保留，不删除。迁移核验见 [Git迁移验证](Git迁移验证.md)。
