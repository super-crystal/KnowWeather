# FlClash 动画分析与知天气适配

分析日期：2026-10-21。参考仓库 https://github.com/chen08209/FlClash ，固定提交 `8d4f9744948751f1273fe871e1d05276fac09b0e`。通过 GitHub 插件读取；本机 git clone 因已失效的本地代理端口失败，未修改代理配置，未使用浏览器兜底。

## 已确认的实现

| 参考文件 | 实际机制 | 知天气适配 |
| --- | --- | --- |
| [open_container.dart](https://github.com/chen08209/FlClash/blob/8d4f9744948751f1273fe871e1d05276fac09b0e/lib/ui/open_container.dart) | 300 ms、fastOutSlowIn；按钮边界插值到页面；完整页面仅布局一次，以裁剪及绘制移动呈现；进入约20%～40%切换内容 | 改掉 1.2.4 整页不等比缩放，以视口裁剪从按钮边界展开，文字不被压扁；来源按钮与新内容分阶段交接 |
| [fade_box.dart](https://github.com/chen08209/FlClash/blob/8d4f9744948751f1273fe871e1d05276fac09b0e/lib/ui/fade_box.dart)、[motion.dart](https://github.com/chen08209/FlClash/blob/8d4f9744948751f1273fe871e1d05276fac09b0e/lib/ui/motion.dart) | 分类淡变使用 220 ms、easeInOut；进入内容可短距离24逻辑像素移动；SpringCurve 使用物理弹簧并修正末端残差 | 建立统一动效参数；分类采用短距离方向位移与分段淡入淡出；按钮回弹用独立采样弹簧，末端精确归位 |
| [segmented_control.dart](https://github.com/chen08209/FlClash/blob/8d4f9744948751f1273fe871e1d05276fac09b0e/lib/ui/segmented_control.dart)、[group_tabs.dart](https://github.com/chen08209/FlClash/blob/8d4f9744948751f1273fe871e1d05276fac09b0e/lib/views/proxies/group_tabs.dart) | 选中底板250 ms easeOutCubic，文本200 ms；选中分类自动滚入视野 | 详情下划线250 ms；分类滚动使用可中断的同曲线时间线，避免浏览器自带smooth滚动与内容节奏不一致 |
| [route_motion_hold.dart](https://github.com/chen08209/FlClash/blob/8d4f9744948751f1273fe871e1d05276fac09b0e/lib/ui/route_motion_hold.dart) | 路由运行期间只保留最新列表刷新，结束后重放 | 天气请求可以照常完成，但主页的大块 DOM 更新在页面／分类过渡后合并执行一次 |
| [page_transition.dart](https://github.com/chen08209/FlClash/blob/8d4f9744948751f1273fe871e1d05276fac09b0e/lib/ui/page_transition.dart) | 横向页面450 ms，移动约页面宽度1/4；分段交接，避免整页逐帧透明离屏成本 | 参考分段交接和限制移动量，不把450 ms统一套给天气分类；长表动画仍限一个可见视口 |
| [theme_cross_fade.dart](https://github.com/chen08209/FlClash/blob/8d4f9744948751f1273fe871e1d05276fac09b0e/lib/ui/theme_cross_fade.dart) | 一次应用主题，再淡出之前的画面；不每帧重建全部主题依赖 | 支持时使用浏览器 View Transition 的视口快照淡变；不支持、后台或减少动态效果时直接应用主题 |
| [button.dart](https://github.com/chen08209/FlClash/blob/8d4f9744948751f1273fe871e1d05276fac09b0e/lib/ui/button.dart) | 按钮组使用 ElasticPress，点击波纹／材料状态与内容职责分离 | 保留原有所有按钮反馈，改为按尺寸限制形变量、按下快速响应、松手弹簧回位；原生卡片中心统一相同节奏 |

## 参考边界

FlClash 是 Flutter 应用，知天气是原生 Android + WebView。本次独立实现 Web Animations / CSS / Android 动效，不导入 Flutter、代理核心、玻璃 shader 或其他业务逻辑，不逐行移植 Dart 类。参考仓库为 GPLv3；原源码仅作为本地研究资料保存于 `E:/GPT工作区/apps/weatherly-reference/FlClash`，不打入 APK。应用内 Leaflet、Natural Earth 等既有许可保持。

`ElasticPress` 的具体内部物理参数不在已读按钮包装文件中，因此不声称知天气弹簧参数与其完全相同。知天气参数须由自己的实现和测试确定。

## 保留的产品要求

- 主页无背景接缝；城市／详情从所按按钮展开，返回缩回来源。
- 刷新空闲为圆环箭头、请求中为转圈；支持异常恢复及防重复提交。
- 定位区县优先，长行政区不挤压按钮；桌面卡片独立定位。
- 分类栏保持方向一致、快速点击以最后选择为准、长表过渡后无残留空白。
- 降低动画偏好、切换后台、关闭页面时停止与清理动效；不以模拟器数据承诺实机60 FPS。

## 实现与验证状态

已应用于知天气1.3.0：完整参考参数与适配如上，25项检查通过，同签名APK及Android16操作录屏验证完成。无录屏模拟器单次流程中位耗时旧版42ms、新版44ms，没有证明整体帧率提高。完整验证在output/qa-1.3.0/；外部共享插件异常与后续状态见 [工作记录](../工作记录.md)。
