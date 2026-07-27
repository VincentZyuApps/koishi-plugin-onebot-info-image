# 🧩 延迟解析类型注解，使 Path 等类型在运行时不会被立即求值。
from __future__ import annotations

# 🔐 hashlib 提供标准哈希算法，Path 用于跨平台、安全地处理文件路径。
import hashlib
from pathlib import Path


# 🧮 按固定顺序输出四种常用摘要，顺序也决定最终报表的展示顺序。
ALGORITHMS = ("md5", "sha1", "sha256", "sha512")
# 🔤 只处理常见的桌面字体、字体集合以及 Web 字体格式。
FONT_EXTENSIONS = {".ttf", ".otf", ".ttc", ".otc", ".woff", ".woff2"}


# 🎨 集中保存 ANSI 转义序列，避免在输出代码中散落难以理解的控制字符。
class Style:
    # 🧹 RESET 会清除前面应用的样式，防止颜色影响后续终端内容。
    RESET = "\033[0m"
    # ✨ 下面三项分别控制粗体、斜体和暗淡显示效果。
    BOLD = "\033[1m"
    ITALIC = "\033[3m"
    DIM = "\033[2m"
    # 🌈 下面的颜色用于区分标题、状态和不同哈希算法。
    CYAN = "\033[36m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    GRAY = "\033[90m"


# 🗺️ 为每种哈希算法分配固定颜色，让长摘要更容易区分和查阅。
ALGORITHM_STYLES = {
    "md5": Style.YELLOW,
    "sha1": Style.BLUE,
    "sha256": Style.GREEN,
    "sha512": Style.MAGENTA,
}


# 🖌️ 将任意数量的 ANSI 样式拼接到文本前，并在末尾自动恢复默认样式。
def color(text: str, *styles: str) -> str:
    return "".join(styles) + text + Style.RESET


# 🔐 只读取文件一次，同时计算全部配置算法的十六进制摘要。
def file_hashes(path: Path) -> dict[str, str]:
    # 🏗️ 根据算法名称动态创建哈希对象，便于以后扩展 ALGORITHMS 而无需修改本函数。
    hashes = {algorithm: hashlib.new(algorithm) for algorithm in ALGORITHMS}

    # 📖 使用二进制模式打开字体，避免文本编码或换行转换改变原始字节。
    with path.open("rb") as file:
        # 📦 每次读取 1 MiB，既控制内存占用，也适合当前几十 MiB 的共享字体文件。
        # 🔁 iter 会持续调用读取函数，直到返回空字节串 b"" 为止。
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            # ⚡ 同一数据块依次喂给所有算法，避免为四种摘要重复读取磁盘。
            for hash_obj in hashes.values():
                hash_obj.update(chunk)

    # 🧾 hexdigest 将二进制摘要转换为便于复制、比对和记录的十六进制字符串。
    return {algorithm: hash_obj.hexdigest() for algorithm, hash_obj in hashes.items()}


# 🚀 组织字体发现、校验、统计和终端报表输出的完整流程。
def main() -> None:
    # 📍 先定位脚本自身目录，再通过相对路径找到 Koishi 工作区共享字体目录。
    script_dir = Path(__file__).resolve().parent
    fonts_dir = (script_dir / "../../../data/fonts").resolve()

    # 🚧 目录缺失时立即退出，避免后续错误被误解为“没有字体文件”。
    if not fonts_dir.exists():
        raise SystemExit(f"fonts directory not found: {fonts_dir}")

    # 🔎 仅保留目录第一层中的受支持字体文件，并排序以保证每次输出稳定一致。
    fonts = sorted(
        path
        for path in fonts_dir.iterdir()
        if path.is_file() and path.suffix.lower() in FONT_EXTENSIONS
    )

    # 🚫 目录存在但未找到字体时给出独立错误，方便区分路径和文件类型问题。
    if not fonts:
        raise SystemExit(f"no font files found in: {fonts_dir}")

    # 📊 先输出报表标题、扫描目录、字体数量以及预计生成的摘要总数。
    print(color("🔤 Shared Font Hash Report", Style.BOLD, Style.CYAN))
    print(color("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", Style.CYAN))
    print(f"📁 {color('fonts_dir', Style.BOLD)}: {color(str(fonts_dir), Style.ITALIC, Style.GRAY)}")
    print(f"🔢 {color('font_count', Style.BOLD)}: {color(str(len(fonts)), Style.GREEN)}")
    print(f"🧮 {color('hash_count', Style.BOLD)}: {color(str(len(fonts) * len(ALGORITHMS)), Style.GREEN)}")
    print()

    # 🔄 按排序后的字体逐个展示文件大小，并计算所有配置的哈希摘要。
    for index, path in enumerate(fonts, start=1):
        print(color(f"📦 [{index}/{len(fonts)}] {path.name}", Style.BOLD, Style.CYAN))
        print(f"  【📏 {color('size', Style.BOLD)}: {path.stat().st_size} bytes】")
        # 🎯 ljust 统一算法标签宽度，使不同长度的算法名称和摘要保持列对齐。
        for algorithm, digest in file_hashes(path).items():
            algorithm_label = color(algorithm.ljust(6), Style.BOLD, ALGORITHM_STYLES.get(algorithm, ""))
            print(f"  🔐 {algorithm_label}: {color(digest, ALGORITHM_STYLES.get(algorithm, ''))}")
        print()

    # ✅ 到达这里说明所有字体均已成功读取并完成摘要计算。
    print(color("✅ Done. Hash text is unchanged and safe to copy.", Style.BOLD, Style.GREEN))


# 🛡️ 只有直接运行本文件时才执行 main，作为模块导入时不会自动扫描字体。
if __name__ == "__main__":
    main()
