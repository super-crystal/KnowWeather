# Git迁移验证（2026-10-25）

- 从11个已核验归档导入11个版本快照及v1.0.0～v1.4.1标签。每个导入文件通过git show逐字节回读，11个原APK哈希一致；导入时间明确为本次日期。
- 全部Git历史路径未包含.signing、密码/私钥、原ColorOS APK、反编译目录或发布APK。早期缺Java源码的版本保留对应DEX并明确说明，未伪造完整源码。
- 从最新提交导出纯源码到隔离目录（没有旁边的原始网站、没有.signing），33项检查通过、Unsigned构建通过；28项Web资产、classes.dex、resources.arsc与已发布1.4.1逐字节一致。
- 既有签名安装包未被改写；构建产物改放output/builds/，缺少原签名时停止或显式Unsigned，不自动新建签名。
- 本机备份output/git-migration/weatherly-history.bundle可恢复完整Git历史，不含签名材料；日志和机器操作记录保留在忽略的output/与工作记录.md。
- 用户已提供私有仓库super-crystal/KnowWeather；仓库ID1432842698，账号有push/admin权限，本地origin已关联。首次Git客户端登录使用系统Git Credential Manager的设备授权流程，用户自行在GitHub完成授权；项目不保存登录令牌。远程引用与本地提交/标签的最终核对记录保留在本机output/git-migration/verification.json。
- main与11个注释标签已推送，12个远程引用逐项核对一致。GitHub插件独立回读11个Releases及22个uploaded附件，APK大小和SHA256与本机原归档相同，校验文件摘要一致；latest确认v1.4.1。原签名包没有重建，签名材料未上传。上传凭据和独立回读摘要保留在本机output/git-migration/。
