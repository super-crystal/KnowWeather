# 1.4.0 动态天气参考与实现

2026-10-21。参考包为用户提供的 com.coloros.weather2 16.41.2 / 16041002，61540107 字节，SHA256 FBE3B5CE9353E6F1B1BC9BAE94414453D1254BA027826A059E0B0A8D5432FA6D。参考资料位于 ../weatherly-reference/ColorOS（相对项目根目录），不随发布包归档。

## 已分析的内容

读取 APK 目录、Manifest、签名、94 项 shader/视频/许可资料。包内只有 arm64-v8a 原生库；现有 Android 16 x86_64 模拟器安装返回 INSTALL_FAILED_NO_MATCHING_ABIS。未实际运行参考应用，不声称逐帧复刻。签名可通过密码学校验，证书主题含 OPPO/ColorOS，但尚未与厂商独立渠道比对指纹。

- cloudy.frag：时间噪声位移、云粒子旋转、上下渐变及雾化混合。
- holographic 的 mostly_cloudy/overcast：动画帧通道配合颜色查找表；亮度、透明度、闪电可分通道编码，所以原始视频偏红绿不代表素材损坏。
- rain.vert：距离影响雨滴速度、大小和透明度，雨线带倾斜及景深。
- snow.vert、fog/smoke：按时间漂移，控制层次与透明度；阳光材质有光晕表现。
- 开源声明包含 Lottie 等第三方库许可，未发现对厂商全部天气媒体及 shader 的统一使用授权。

仅参考运动组织与层次，知天气使用独立编写的 Canvas 算法；没有复制参考 APK 的媒体、shader、反编译代码或厂商资源进发布包。

## 本版资源入口

`web-src/sky.mjs` 绘制与生命周期；`web-src/sky-model.mjs` 场景参数、云带几何和粒子位置；`sky.test.mjs` 验证。`app.js` 根据真实天气与昼夜更新场景；静态天空 DOM 作为 Canvas 不可用时的回退。

单个 Canvas，缓存离屏云与光晕纹理；晴、多云、阴、雾、雨、雪、雷暴、晴夜、云夜分别表现。多云/云夜 12 带、阴/雷暴 14 带、雨雪 11 带云，从屏幕上沿铺到下沿；交叠循环纹理消除左右空带，远近移动速度和透明度不同。晴天只保留 3 带疏云。阳光呼吸、夜星闪烁、月面、雾带漂移与雨雪粒子独立运动。雷暴仅低亮度慢闪，避免高频闪烁。

像素预算不超过 60 万，粒子最多 110；绘制开销连续 120 样本偏高时降分辨率与目标帧率。后台、打开弹窗、滚动和系统减少动态效果时暂停。60 是目标调度频率，不是实机帧率结论。桌面小组件保持已有原生绘制，不增加持续后台动画。

## 模拟器支线

本机为 Windows X64，现用 QEMU2 明确拒绝 arm64 CPU，不能仅换 ARM64 镜像就运行。用户提供的 sys-img2-3.xml 是官方镜像目录；已给出 Google APIs Android 16 x86_64 镜像下载地址，以后可独立验证 ARM 转译能力：

https://dl.google.com/android/repository/sys-img/google_apis/x86_64-36_r07.zip

1895447397 字节，SHA1 c6bf44bdcd885bb902b4ba752d111a073ad7a817。上述为最初待办，当前实测进展见下方。


## 2026-10-25 镜像与APK实测补充

镜像已安装至tools/android-build/sdk/system-images/android-36/google_apis/x86_64，独立AVD ColorOSReference16可正常启动，实际支持x86_64,arm64-v8a，libndk_translation.so已启用。未修改的ColorOS APK安装成功，ARM64原生库libmmkv.so加载成功；主活动却因缺com.oplus.os.OplusBuild而崩溃，并报告缺OplusActivityManager和厂商天气Provider。

因此当前限制为厂商系统框架/服务，ARM64安装问题已解决。未进入可操作天气主页，仍不能称逐帧观察参考动画。没有改APK或刷厂商ROM，测试实例已关闭，镜像与AVD保留。详细证据见项目根目录相对路径 ../weatherly-reference/ColorOS/google-apis-qa/兼容测试结果.md。开发区此说明为后续续作补充，不改写已归档的1.4.0历史文档。


## 2026-10-25 直接素材读取补充

直接解包assets/weather.coz2后得到1269个内部文件，包含65张ASTC纹理、63个Prefab场景，以及Lua/材质/粒子配置。结合外层资源，已提取1671项，成功解码76张GPU纹理，整理371张图片、3段兼容视频和5个Lottie包；零解码错误，原始副本逐项哈希核验通过。未执行第三方脚本。

预览入口：../weatherly-reference/ColorOS/readable-assets/index.html（相对项目根目录）；完整清单inventory.json、场景清单scenes.json、说明素材读取说明.md。图片包含原始法线/通道数据，不能把数据色当成完整渲染颜色；视频转H.264只为兼容播放，不代表已经完整还原原App。后续优先读本目录，避免重扫APK。当前知天气仍为1.4.0，未自动加入或发布提取素材。
