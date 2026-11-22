# -*- coding: utf-8 -*-
"""Подставляет настоящий домен вместо заглушки https://forsaj-mk.ru.

Использование:
    python set_domain.py forsaj-mk.ru
    python set_domain.py https://forsaj-mk.ru

Меняет canonical, og:url, og:image, sitemap.xml, robots.txt.
"""
import pathlib
import re
import sys

PLACEHOLDER = "forsaj-mk.ru"
TARGETS = [
    "*.html",
    "sitemap.xml",
    "robots.txt",
]


def normalize(arg: str) -> str:
    arg = arg.strip().rstrip("/")
    arg = re.sub(r"^https?://", "", arg)
    return arg


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    domain = normalize(sys.argv[1])
    if not domain or "." not in domain:
        print("Похоже, это не домен:", domain)
        return 1

    root = pathlib.Path(__file__).resolve().parent
    changed = 0

    for pattern in TARGETS:
        for path in root.rglob(pattern):
            if not path.is_file() or path.name.startswith("set_domain"):
                continue
            text = path.read_text(encoding="utf-8")
            if PLACEHOLDER in text:
                path.write_text(text.replace(PLACEHOLDER, domain), encoding="utf-8")
                print("обновлён:", path.relative_to(root))
                changed += 1

    print(f"\nГотово. Заменено файлов: {changed}. Домен: https://{domain}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
