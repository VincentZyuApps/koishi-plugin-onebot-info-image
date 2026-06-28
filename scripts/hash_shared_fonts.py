from __future__ import annotations

import hashlib
from pathlib import Path


ALGORITHMS = ("md5", "sha1", "sha256", "sha512")
FONT_EXTENSIONS = {".ttf", ".otf", ".ttc", ".otc", ".woff", ".woff2"}


class Style:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    ITALIC = "\033[3m"
    DIM = "\033[2m"
    CYAN = "\033[36m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    GRAY = "\033[90m"


ALGORITHM_STYLES = {
    "md5": Style.YELLOW,
    "sha1": Style.BLUE,
    "sha256": Style.GREEN,
    "sha512": Style.MAGENTA,
}


def color(text: str, *styles: str) -> str:
    return "".join(styles) + text + Style.RESET


def file_hashes(path: Path) -> dict[str, str]:
    hashes = {algorithm: hashlib.new(algorithm) for algorithm in ALGORITHMS}

    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            for hash_obj in hashes.values():
                hash_obj.update(chunk)

    return {algorithm: hash_obj.hexdigest() for algorithm, hash_obj in hashes.items()}


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    fonts_dir = (script_dir / "../../../data/fonts").resolve()

    if not fonts_dir.exists():
        raise SystemExit(f"fonts directory not found: {fonts_dir}")

    fonts = sorted(
        path
        for path in fonts_dir.iterdir()
        if path.is_file() and path.suffix.lower() in FONT_EXTENSIONS
    )

    if not fonts:
        raise SystemExit(f"no font files found in: {fonts_dir}")

    print(color("🔤 Shared Font Hash Report", Style.BOLD, Style.CYAN))
    print(color("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", Style.CYAN))
    print(f"📁 {color('fonts_dir', Style.BOLD)}: {color(str(fonts_dir), Style.ITALIC, Style.GRAY)}")
    print(f"🔢 {color('font_count', Style.BOLD)}: {color(str(len(fonts)), Style.GREEN)}")
    print(f"🧮 {color('hash_count', Style.BOLD)}: {color(str(len(fonts) * len(ALGORITHMS)), Style.GREEN)}")
    print()

    for index, path in enumerate(fonts, start=1):
        print(color(f"📦 [{index}/{len(fonts)}] {path.name}", Style.BOLD, Style.CYAN))
        print(f"  【📏 {color('size', Style.BOLD)}: {path.stat().st_size} bytes】")
        for algorithm, digest in file_hashes(path).items():
            algorithm_label = color(algorithm.ljust(6), Style.BOLD, ALGORITHM_STYLES.get(algorithm, ""))
            print(f"  🔐 {algorithm_label}: {color(digest, ALGORITHM_STYLES.get(algorithm, ''))}")
        print()

    print(color("✅ Done. Hash text is unchanged and safe to copy.", Style.BOLD, Style.GREEN))


if __name__ == "__main__":
    main()
