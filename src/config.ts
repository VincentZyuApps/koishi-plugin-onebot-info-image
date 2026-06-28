import { Schema } from 'koishi'
import {
  IMAGE_STYLES, type ImageStyleKey,
  IMAGE_STYLE_KEY_ARR, IMAGE_TYPES, type ImageType,
  ONEBOT_IMPL_NAME, type OneBotImplName,
} from './type'
import { getFontPathByBaseDir } from './utils'

// ===== 🎨 图片样式详情 =====
export interface ImageStyleDetail {
  /** 🎨 图片样式键名 */
  styleKey: ImageStyleKey;
  /** 🌙 是否启用深色模式 */
  darkMode: boolean;
}

// ===== 🤖 插件配置 =====
export interface Config {
  // ===== 🤖 OneBot 实现平台 =====
  /** 🤖 OneBot 具体实现名称（选错会导致获取的内容变少） */
  onebotImplName: OneBotImplName;
  /** 🖥️ 是否在 WebUI 插件配置页展示指令渲染预览 */
  enableWebUIPreview: boolean;

  // ===== 🗑️ 自动撤回 =====
  /** 🗑️ 是否启用自动撤回 */
  enableAutoRecall: boolean;
  /** ⏱️ 自动撤回延迟（秒） */
  autoRecallDelay: number;

  // ===== ⚙️ 基础指令 =====
  /** ℹ️ 是否启用用户信息命令 */
  enableUserInfoCommand: boolean;
  /** 🔍 用户信息命令名称 */
  userinfoCommandName: string;
  /** 📱 是否隐藏手机号 */
  hidePhoneNumber: boolean;
  /** 👥 是否启用群管理员列表命令 */
  enableGroupAdminListCommand: boolean;
  /** 👥 群管理员列表命令名称 */
  groupAdminListCommandName: string;
  /** 📌 是否启用群精华消息命令 */
  enableGroupEssenceCommand: boolean;
  /** 📌 群精华列表命令名称 */
  groupEssenceCommandName: string;
  /** 🔍 群精华消息详情命令名称 */
  groupEssenceDetailCommandName: string;
  /** 📌 群精华列表每页显示条数 */
  groupEssencePageSize: number;
  /** 📢 是否启用群公告命令 */
  enableGroupNoticeCommand: boolean;
  /** 📢 群公告列表命令名称 */
  groupNoticeCommandName: string;
  /** 🔍 群公告详情命令名称 */
  groupNoticeDetailCommandName: string;
  /** 📢 群公告每页显示条数 */
  groupNoticePageSize: number;
  /** 🎨 查看 puppeteer 图片样式列表命令名称 */
  inspectStyleCommandName: string;

  // ===== 💬 文本消息 =====
  /** 💬 是否启用文本回复 */
  sendText: boolean;
  /** ↩️ 回复文本时是否带引用 */
  enableQuoteWithText: boolean;

  // ===== 🖼️ Puppeteer 图片 =====
  /** 🖼️ 是否启用 Puppeteer 渲染图片 */
  sendImage: boolean;
  /** 📸 回复图片时是否带引用 */
  enableQuoteWithImage: boolean;
  /** 🎨 图片样式配置列表 */
  imageStyleDetails: ImageStyleDetail[];
  /** 📤 渲染图片的输出类型 */
  imageType: ImageType;
  /** 📏 Puppeteer 截图质量 */
  screenshotQuality: number;
  /** 📊 是否在图片后追加渲染耗时等信息 */
  imageShowRenderInfo: boolean;

  // ===== 🚀 resvg 图片 =====
  /** 🚀 是否启用 resvg 渲染图片 */
  sendImageSvg: boolean;
  /** ↩️ 回复 resvg 图片时是否带引用 */
  enableQuoteWithImageSvg: boolean;
  /** 🌙 resvg 渲染默认启用深色模式 */
  svgEnableDarkMode: boolean;
  /** 🔍 resvg 渲染缩放倍数 */
  svgScale: number;
  /** 🎨 resvg 渲染是否启用 Emoji 转图片 */
  svgEnableEmoji: boolean;
  /** 💾 resvg 渲染是否缓存 Emoji 图片 */
  svgEnableEmojiCache: boolean;
  /** 🎨 resvg 渲染主题颜色 */
  svgThemeColor: string;
  /** 📊 是否在 svg 图片后追加渲染耗时等信息 */
  svgShowRenderInfo: boolean;
  /** 🔤 是否启用自定义字体渲染 */
  svgEnableCustomFont: boolean;
  /** 🔤 自定义字体文件路径列表 */
  svgFontFiles: string[];
  /** 🔤 自定义 font-family 名称列表 */
  svgFontFamilies: string[];

  // ===== ✉️ 合并转发 =====
  /** ➡️ 是否启用 onebot 合并转发 */
  sendForward: boolean;

  // ===== 🐞 调试输出 =====
  /** 🗣️ 会话中输出详细信息 */
  verboseSessionOutput: boolean;
  /** 💻 控制台输出详细信息 */
  verboseConsoleOutput: boolean;
  /** 📄 文件中输出详细信息 */
  verboseFileOutput: boolean;
}

// ===== 🧩 插件配置 Schema =====
export const Config: Schema<Config> = Schema.intersect([
  // ===== 🤖 OneBot 实现平台 =====
  Schema.object({
    onebotImplName: Schema.union([
      Schema.const(ONEBOT_IMPL_NAME.LAGRNAGE).description('Lagrange'),
      Schema.const(ONEBOT_IMPL_NAME.NAPCAT).description('NapCat'),
    ])
      .role('radio')
      .default(ONEBOT_IMPL_NAME.LAGRNAGE)
      .description('【重要】OneBot 的具体实现名称(选错了会导致获取到的内容会变少)'),
    enableWebUIPreview: Schema.boolean()
      .default(false)
      .description('🖥️ 是否在 WebUI 插件配置页展示 aui 指令渲染效果预览。默认关闭，按需开启，省资源捏'),
  }).description('🤖 你的 OneBot 具体实现平台 是哪一个捏？'),

  // ===== 🗑️ 自动撤回 =====
  Schema.object({
    enableAutoRecall: Schema.boolean()
      .default(false)
      .description('🗑️ 是否启用自动撤回。开启后 bot 发送的消息会在指定时间后自动撤回。'),
    autoRecallDelay: Schema.number()
      .min(5).max(120).step(1)
      .default(45)
      .description('⏱️ 自动撤回延迟（秒）。消息发出后经过该时间自动撤回。'),
  }).description('🗑️ 自动撤回配置'),

  // ===== ⚙️ 基础指令 =====
  Schema.object({
    enableUserInfoCommand: Schema.boolean()
      .default(true)
      .description('ℹ️ 是否启用用户信息命令。'),
    userinfoCommandName: Schema.string()
      .default('用户信息')
      .description('🔍 用户信息命令名称。'),
    hidePhoneNumber: Schema.boolean()
      .default(true)
      .experimental()
      .description('📱 是否隐藏手机号。开启后手机号将显示为【已隐藏】。</br> <i> 保护隐私捏 </i>'),
    enableGroupAdminListCommand: Schema.boolean()
      .default(true)
      .description('👥 是否启用群管理员列表命令。'),
    groupAdminListCommandName: Schema.string()
      .default('群管理列表')
      .description('👥 群管理员列表命令名称。'),
    enableGroupEssenceCommand: Schema.boolean()
      .default(true)
      .description('📌 是否启用群精华消息命令。'),
    groupEssenceCommandName: Schema.string()
      .default('群精华列表')
      .description('📌 群精华列表命令名称。'),
    groupEssenceDetailCommandName: Schema.string()
      .default('群精华详情')
      .description('🔍 群精华消息详情命令名称。'),
    groupEssencePageSize: Schema.number()
      .min(1).max(20).step(1)
      .default(10)
      .description('📌 群精华列表每页显示条数。'),
    enableGroupNoticeCommand: Schema.boolean()
      .default(true)
      .description('📢 是否启用群公告命令。'),
    groupNoticeCommandName: Schema.string()
      .default('群公告列表')
      .description('📢 群公告列表命令名称。'),
    groupNoticeDetailCommandName: Schema.string()
      .default('群公告详情')
      .description('🔍 群公告详情命令名称。'),
    groupNoticePageSize: Schema.number()
      .min(1).max(20).step(1)
      .default(10)
      .description('📢 群公告每页显示条数。'),
    inspectStyleCommandName: Schema.string()
      .default('查看puppeteer图片样式')
      .description('🎨 查看puppeteer图片样式列表命令名称。'),
  }).description('⚙️ 基础配置'),

  // ===== 💬 文本消息 =====
  Schema.object({
    sendText: Schema.boolean()
      .default(false)
      .description('💬 是否启用文本回复。'),
    enableQuoteWithText: Schema.boolean()
      .default(true)
      .description('↩️ 回复文本的时候，是否带引用触发指令的消息。'),
  }).description('💬 发送 文本 配置'),

  // ===== 🖼️ Puppeteer 图片 =====
  Schema.object({
    sendImage: Schema.boolean()
      .default(true)
      .description('🖼️ 是否启用 Puppeteer 渲染图片（需启用 puppeteer 服务）。'),
    enableQuoteWithImage: Schema.boolean()
      .default(true)
      .description('📸 回复图片的时候，是否带引用触发指令的消息。'),
    imageStyleDetails: Schema
      .array(
        Schema.object({
          styleKey: Schema
            .union(IMAGE_STYLE_KEY_ARR.map((key) => Schema.const(key).description(IMAGE_STYLES[key])))
            .role('radio')
            .description("🎨 图片样式"),
          darkMode: Schema
            .boolean()
            .description("🌙 启用深色模式"),
        })
      )
      .role('table')
      .default([
        { styleKey: IMAGE_STYLE_KEY_ARR[0], darkMode: false },
        { styleKey: IMAGE_STYLE_KEY_ARR[0], darkMode: true },
        { styleKey: IMAGE_STYLE_KEY_ARR[1], darkMode: false },
        { styleKey: IMAGE_STYLE_KEY_ARR[1], darkMode: true },
        { styleKey: IMAGE_STYLE_KEY_ARR[2], darkMode: false },
        { styleKey: IMAGE_STYLE_KEY_ARR[2], darkMode: true },
      ])
      .description("🎨 图片样式配置。第一行是默认使用的样式，指定样式请使用 -i 参数"),
    imageType: Schema.union([
      Schema.const(IMAGE_TYPES.PNG).description(`🖼️ ${IMAGE_TYPES.PNG}, ❌ 不支持调整quality`),
      Schema.const(IMAGE_TYPES.JPEG).description(`🌄 ${IMAGE_TYPES.JPEG}, ✅ 支持调整quality`),
      Schema.const(IMAGE_TYPES.WEBP).description(`🌐 ${IMAGE_TYPES.WEBP}, ✅ 支持调整quality`),
    ])
      .role('radio')
      .default(IMAGE_TYPES.PNG)
      .description("📤 渲染图片的输出类型。"),
    screenshotQuality: Schema.number()
      .min(0).max(100).step(1)
      .default(80)
      .description('📏 Puppeteer 截图质量 (0-100)。'),
    imageShowRenderInfo: Schema.boolean()
      .default(true)
      .description('📊 是否在Puppeteer图片消息段后面增加文字消息段，显示Puppeteer渲染的 渲染耗时、图片类型、截图质量的信息'),
  }).description('🖼️ 发送 Puppeteer渲染的图片 配置'),

  // ===== 🚀 resvg 图片 =====
  Schema.object({
    sendImageSvg: Schema.boolean()
      .default(false)
      .description('🚀 是否启用 resvg 渲染图片（轻量快速，推荐！）'),
    enableQuoteWithImageSvg: Schema.boolean()
      .default(true)
      .description('↩️ 回复 resvg 图片的时候，是否带引用触发指令的消息。'),
    svgEnableDarkMode: Schema.boolean()
      .default(false)
      .description('🌙 resvg 渲染默认启用深色模式'),
    svgScale: Schema.number()
      .min(1).max(10)
      .default(2.25)
      .description('🔍 resvg 渲染缩放倍数 [1,10]，数值越大图片越清晰但渲染越慢'),
    svgEnableEmoji: Schema.boolean()
      .default(false)
      .experimental()
      .description('🎨 resvg 渲染是否启用 Emoji 转图片（使用 twemoji 本地数据，无需网络请求）</br> <i>目前 SVG 还是无法渲染 emoji，这个配置项打开也没用，未来某个版本可能能实现~</i>'),
    svgEnableEmojiCache: Schema.boolean()
      .default(false)
      .experimental()
      .description('💾 resvg 渲染是否缓存 Emoji 图片（开启后重复 Emoji 会更快）</br> <i>目前 SVG 还是无法渲染 emoji，这个配置项打开也没用，未来某个版本可能能实现~</i>'),
    svgThemeColor: Schema.string()
      .role('color')
      .default('#7e57c2')
      .description('🎨 resvg 渲染主题颜色，默认是 Koishi 紫~ 古明地恋的眼睛~'),
    svgShowRenderInfo: Schema.boolean()
      .default(true)
      .description('📊 是否在svg图片消息段后面增加文字消息段，显示resvg图片渲染耗时、缩放倍数的信息'),
    svgEnableCustomFont: Schema.boolean()
      .default(true)
      .description('🔤 是否启用自定义字体渲染。开启后下方的「字体文件路径」和「font-family名称」配置才会生效。关闭则使用系统默认字体 sans-serif'),
    svgFontFiles: Schema.array(Schema.string())
      .role('table')
      .default([
        getFontPathByBaseDir(process.cwd(), 'LXGWWenKaiMono-Regular.ttf'),
        '/usr/share/fonts/truetype/lxgw/LXGWWenKaiMono-Regular.ttf',
        'C:\\Windows\\Fonts\\LXGWWenKaiMono-Regular.ttf',
      ])
      .description('🔤 resvg 渲染使用的字体文件路径 <b>(绝对路径)</b>，默认运行时优先使用 ctx.baseDir/data/fonts/LXGWWenKaiMono-Regular.ttf'),
    svgFontFamilies: Schema.array(Schema.string())
      .role('table')
      .default(['LXGWWenKaiMono, sans-serif'])
      .description('🔤 resvg 渲染使用的 font-family 名称（需要与字体文件对应）'),
  }).description('🚀 发送 resvg渲染的图片 配置'),

  // ===== ✉️ 合并转发 =====
  Schema.object({
    sendForward: Schema.boolean()
      .default(false)
      .description('➡️ 是否启用 onebot合并转发。'),
  }).description('✉️ 发送 onebot合并转发 配置'),

  // ===== 🐞 调试输出 =====
  Schema.object({
    verboseSessionOutput: Schema.boolean()
      .default(false)
      .description('🗣️ 是否在会话中输出详细信息。(生产环境别开，东西很多)'),
    verboseConsoleOutput: Schema.boolean()
      .default(false)
      .description('💻 是否在控制台输出详细信息。'),
    verboseFileOutput: Schema.boolean()
      .default(false)
      .description('📄 是否在文件中输出详细信息。(生产环境不要开)'),
  }).description('🐞 调试 (Debug) 配置'),
]);
