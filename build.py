from __future__ import annotations

import json
import re
import shutil
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from hashlib import sha256
from html import escape
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
STYLE_VERSION = sha256((ROOT / "site/style.css").read_bytes()).hexdigest()[:12]
BLOG = "https://frodo2875.github.io/xinghao.github.io/"
PHOTOWALL_LAUNCHED = date(2026, 11, 19)
CATEGORIES = {"travel": "旅行", "daily": "日常", "people": "人物", "events": "活动"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass
class Photo:
    number: int
    width: int
    height: int
    alt: str
    caption: str


@dataclass
class Album:
    slug: str
    title: str
    date: date
    category: str
    description: str
    cover: Photo
    photos: list[Photo]


def page(title, current, prefix, content, head="", script=""):
    def nav(label, href, key):
        active = ' aria-current="page"' if key == current else ""
        return f'<a href="{href}"{active}>{label}</a>'

    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f8f7f3">
  <title>{escape(title)}</title>
  <script src="{prefix}assets/theme.js"></script>
  <link rel="stylesheet" href="{prefix}assets/style.css?v={STYLE_VERSION}">
  {head}
</head>
<body>
  <header class="masthead">
    <div class="shell masthead-inner">
      <a class="wordmark" href="{prefix}">Photowall<span aria-hidden="true">.</span></a>
      <nav aria-label="主导航">
        {nav("照片墙", prefix, "home")}
        {nav("关于", prefix + "about/", "about")}
        {nav("返回博客", BLOG, "blog")}
        <button type="button" class="theme-toggle" aria-label="深色模式" aria-pressed="false" hidden>
          <span class="theme-moon" aria-hidden="true">☾</span>
          <span class="theme-sun" aria-hidden="true">☀</span>
        </button>
      </nav>
    </div>
  </header>
  <main class="shell">{content}</main>
  <footer class="shell footer"><span>Photowall</span><a href="{BLOG}">Xinghao’s Blog</a></footer>
  {script}
</body>
</html>
"""


def save_image(image, destination, max_edge, quality):
    variant = image.copy()
    variant.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    variant.save(destination, "WEBP", quality=quality, method=5)
    return variant.size


def build_album(manifest, output):
    data = json.loads(manifest.read_text(encoding="utf-8-sig"))
    slug = manifest.parent.name
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise ValueError(f"{manifest}: 相册目录名需使用小写英文、数字和连字符。")
    title = data["title"].strip()
    captured = date.fromisoformat(data["date"])
    category = data["category"]
    if not title or category not in CATEGORIES:
        raise ValueError(f"{manifest}: 请填写标题并使用受支持的类型。")
    images = sorted(
        (file for file in manifest.parent.iterdir() if file.is_file()
         and file.suffix.lower() in IMAGE_EXTENSIONS),
        key=lambda path: path.name.casefold(),
    )
    if not images:
        raise ValueError(f"{manifest}: 相册里至少放一张 JPG、PNG 或 WebP。")
    cover_name = data.get("cover", images[0].name)
    captions = data.get("captions", {})
    if cover_name not in {photo.name for photo in images}:
        raise ValueError(f"{manifest}: 找不到封面 {cover_name}。")

    photo_dir = output / "media" / slug
    photo_dir.mkdir(parents=True)
    photos = []
    for number, image_path in enumerate(images, 1):
        caption = captions.get(image_path.name, "")
        with Image.open(image_path) as source:
            normalized = ImageOps.exif_transpose(source)
            if "A" in normalized.getbands() or "transparency" in normalized.info:
                normalized = normalized.convert("RGBA")
            else:
                normalized = normalized.convert("RGB")
            # Copy pixels into a fresh image so source metadata stays out of public derivatives.
            image = Image.new(normalized.mode, normalized.size)
            image.paste(normalized)
            width, height = save_image(image, photo_dir / f"{number}.webp", 2000, 84)
            save_image(image, photo_dir / f"{number}-thumb.webp", 760, 79)
        photos.append(Photo(number, width, height, caption or f"{title}，第 {number} 张", caption))
    cover = photos[[path.name for path in images].index(cover_name)]
    return Album(slug, title, captured, category, data.get("description", ""), cover, photos)


def month(album):
    return f"{album.date.year} 年 {album.date.month} 月"


def card(album, index):
    action = 'fetchpriority="high"' if index == 0 else 'loading="lazy"'
    return f"""
    <article class="album-card" data-album data-year="{album.date.year}" data-category="{album.category}">
      <a href="albums/{album.slug}/">
        <img src="media/{album.slug}/{album.cover.number}-thumb.webp" alt="" {action}>
        <div class="card-meta"><span>{month(album)} · {CATEGORIES[album.category]}</span>
          <span>{len(album.photos)} 张</span></div>
        <h2>{escape(album.title)}</h2>
        {f'<p>{escape(album.description)}</p>' if album.description else ''}
      </a>
    </article>"""


def homepage(albums, demo):
    years = sorted({album.date.year for album in albums}, reverse=True)
    options = "".join(f'<option value="{year}">{year} 年</option>' for year in years)
    buttons = "".join(
        f'<button type="button" data-filter="{key}" aria-pressed="false">{label}</button>'
        for key, label in CATEGORIES.items()
    )
    cards = "".join(card(album, index) for index, album in enumerate(albums))
    sample_note = '<span class="sample-note">示例相册</span>' if demo else ""
    content = f"""
    <section class="intro">
      <h1>照片墙</h1>
      <p>记录和家人、朋友在一起的快乐时光。</p>
    </section>
    <section class="archive" aria-label="相册列表">
      <div class="toolbar">
        <label class="year-control"><span class="sr-only">拍摄年份</span>
          <select id="year"><option value="">全部年份</option>{options}</select>
        </label>
        <div class="categories" role="group" aria-label="相册类型">
          <button type="button" data-filter="" aria-pressed="true">全部类型</button>{buttons}
        </div>
        <div class="archive-meta">{sample_note}
          <span id="album-count" role="status">{len(albums)} 本相册</span>
        </div>
      </div>
      <div class="album-grid">{cards}</div>
      <div class="empty" id="empty" hidden>
        <p>这个年份和类型下还没有相册。</p>
        <button type="button" id="clear-filters">清除筛选</button>
      </div>
    </section>"""
    return page("照片墙 | Photowall", "home", "./", content,
                script='<script type="module" src="assets/filter.js"></script>')


def album_page(album, demo):
    items = []
    for photo in album.photos:
        path = f"../../media/{album.slug}/{photo.number}"
        ratio = photo.width / photo.height
        loading = 'fetchpriority="high"' if photo.number == 1 else 'loading="lazy"'
        items.append(f"""
      <a href="{path}.webp" class="photo" style="--ratio: {ratio:.6f}"
         data-pswp-width="{photo.width}" data-pswp-height="{photo.height}"
         data-caption="{escape(photo.caption)}">
        <img src="{path}-thumb.webp" alt="{escape(photo.alt)}"
             width="{photo.width}" height="{photo.height}" {loading}>
      </a>""")
    label = " · 示例相册" if demo else ""
    content = f"""
    <section class="album-intro">
      <a class="back" href="../../">所有相册</a>
      <h1>{escape(album.title)}</h1>
      <p class="album-meta">{month(album)} · {CATEGORIES[album.category]} · {len(album.photos)} 张{label}</p>
      {f'<p>{escape(album.description)}</p>' if album.description else ''}
    </section>
    <div class="photos">{"".join(items)}</div>"""
    return page(f"{album.title} | Photowall", "home", "../../", content,
                head='<link rel="stylesheet" href="../../assets/vendor/photoswipe.css">',
                script='<script type="module" src="../../assets/gallery.js"></script>')


def about_page(albums, demo):
    photo_count = sum(len(album.photos) for album in albums)
    category_count = len({album.category for album in albums})
    today = datetime.now(timezone(timedelta(hours=8))).date()
    days = max(0, (today - PHOTOWALL_LAUNCHED).days)
    credit = ('<p>当前展示的是示例相册，照片来自 <a href="https://unsplash.com/">Unsplash</a>。</p>'
              if demo else "")
    return page("关于 | Photowall", "about", "../", f"""
    <article class="about">
      <h1>关于</h1>
      <section class="profile-card" aria-labelledby="profile-name">
        <div class="profile-identity">
          <img src="../assets/profile.webp" alt="Frodo2875 的头像" width="320" height="320" decoding="async">
          <div>
            <h2 id="profile-name">Frodo2875</h2>
            <p>记录成长的一切，享受世界给予我的一切</p>
          </div>
        </div>
        <dl class="profile-stats">
          <div><dt>张照片</dt><dd>{photo_count}</dd></div>
          <div><dt>个分类</dt><dd>{category_count}</dd></div>
          <div><dt>天陪伴</dt><dd data-companion-since="{PHOTOWALL_LAUNCHED.isoformat()}">{days}</dd></div>
        </dl>
      </section>
      <div class="about-copy">
        <p>你好，我是 <strong>Xinghao</strong>，欢迎来到我的照片墙。</p>
        <blockquote><p><strong>研究甥 · AI Coding 重度患者</strong></p></blockquote>
        <p>我的个人博客用来记录技术学习、项目实践，以及日常的观察与思考。把问题写清楚，把过程留下来，也让下一次探索有迹可循。</p>

        <h2>关于我</h2>
        <ul>
          <li><strong>学习轨迹</strong>：DUTer → ECNUer。</li>
          <li><strong>技术兴趣</strong>：AI Infra → Agent。</li>
          <li><strong>人格标签</strong>：ENFJ 🌞，对人格心理学充满好奇。</li>
          <li><strong>另一面</strong>：人际关系针扎者，关注人与人之间的理解与连接。</li>
        </ul>
        <p>作为一名 <strong>AI Coding 重度患者</strong>，我喜欢借助 AI 把想法变成可以运行的东西，也记录过程中的尝试、问题与思考。</p>

        <h2>你可以在博客里找到</h2>
        <ul>
          <li><strong>技术笔记</strong>：概念梳理、代码示例与问题排查。</li>
          <li><strong>学习记录</strong>：数学推导、课程笔记与阅读整理。</li>
          <li><strong>项目实践</strong>：从一个想法到具体实现的过程。</li>
          <li><strong>日常思考</strong>：关于学习、人格心理学，以及人与人之间的相处。</li>
        </ul>
        <p><a href="{BLOG}about/">在博客里认识我</a></p>

        <h2>爱好</h2>
        <h3>运动娱乐</h3>
        <ul>
          <li><strong>乒乓球</strong>：用银河 U2。</li>
          <li><strong>篮球</strong>：刚开始学，喜欢投篮。</li>
          <li><strong>麻将</strong>：喜欢打川麻。</li>
        </ul>
        <h3>影视</h3>
        <ul>
          <li><strong>动漫</strong>：《斗破苍穹》《神印王座》《吞噬星空》。</li>
          <li><strong>电影</strong>：《海蒂和爷爷》《寻梦环游记》《头脑特工队》系列。</li>
          <li><strong>综艺</strong>：《喜剧大赛》系列，还有脱口秀和音乐综艺。</li>
          <li><strong>电视剧</strong>：《海市蜃楼》等悬疑剧。</li>
        </ul>
        <h3>其他</h3>
        <ul>
          <li>爱猫</li>
          <li>看直播：飞车、世界杯、英雄联盟 S 赛</li>
          <li>玩魔方</li>
          <li>散步</li>
          <li>听音乐、K 歌</li>
          <li>德华牢舅假期带娃</li>
        </ul>

        <h2>找到我</h2>
        <ul>
          <li><strong>GitHub</strong>：<a href="https://github.com/Frodo2875">Frodo2875</a></li>
          <li><strong>小红书</strong>：6025032171</li>
        </ul>

        <h2>关于照片墙</h2>
        <p>这里想留下我和家人、朋友在一起的快乐时光。一起旅行、聚餐，或是平常见面时随手拍的一张合影，都值得以后再翻出来看看。</p>
        <p>照片和分类按当前展示的相册统计，陪伴天数从照片墙于 2026 年 11 月 19 日上线起算。</p>
        {credit}
      </div>
    </article>""", script='<script defer src="../assets/about-companion.js"></script>')


def write_page(destination, html):
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html, encoding="utf-8")


def main():
    manifests = list((ROOT / "albums").glob("*/album.json"))
    demo = not manifests
    if demo:
        manifests = list((ROOT / "samples").glob("*/album.json"))
    if not manifests:
        raise ValueError("没有找到任何相册清单。")
    dist = ROOT / "dist"
    if dist.resolve() != dist:
        raise ValueError("dist 必须是项目内的普通目录。")
    with TemporaryDirectory(dir=ROOT) as temp:
        output = Path(temp) / "site"
        shutil.copytree(ROOT / "site", output / "assets")
        albums = sorted(
            (build_album(manifest, output) for manifest in manifests),
            key=lambda album: (album.date, album.slug), reverse=True,
        )
        write_page(output / "index.html", homepage(albums, demo))
        write_page(output / "about/index.html", about_page(albums, demo))
        for album in albums:
            write_page(output / "albums" / album.slug / "index.html", album_page(album, demo))
        if dist.exists():
            shutil.rmtree(dist)
        output.rename(dist)
    print(f"Built {len(albums)} albums in {dist}")


if __name__ == "__main__":
    main()
