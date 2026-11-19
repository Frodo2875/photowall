# Photowall

以中文为主的家庭照片墙。相册可按拍摄年份与类型交叉筛选，每组有独立地址。

## 新增相册

1. 在 `albums/` 下建一个目录，例如 `albums/2026-hangzhou/`。目录名会成为相册链接的一部分，使用小写英文字母、数字和连字符。
2. 放入准备公开的 JPG、PNG 或 WebP。以文件名排序，建议用 `01.jpg`、`02.jpg`。本地保留原片。
3. 在同一个文件夹添加 UTF-8 编码的 `album.json`，可参照下面的例子。

```json
{
  "title": "杭州周末",
  "date": "2026-10-03",
  "category": "travel",
  "description": "沿着西湖走了一圈。",
  "cover": "01.jpg",
  "captions": {
    "01.jpg": "傍晚的湖面"
  }
}
```

类型填写 `travel`（旅行）、`daily`（日常）、`people`（人物）或 `events`（活动）。`description`、`cover`、`captions` 可省略，默认用第一张做封面。年份按相册日期计算。发布首个正式相册后，构建自动隐藏所有示例。

公开仓库里的输入图片本身也公开。含位置等 EXIF 信息的原片请留在本地，上传前导出公开副本。构建出的 WebP 会移除源图元数据。

## 本地预览

在项目目录运行以下命令，然后打开 [本地照片墙](http://localhost:8000/)。

```powershell
python -m pip install -r requirements.txt
python build.py
python -m http.server 8000 --directory dist
```

## GitHub Pages 发布

在 GitHub 仓库进入 **Settings → Pages → Build and deployment**，将 **Source** 设为 **GitHub Actions**。推送 `main` 后，工作流会构建并发布。也可以到 **Actions → Publish Photowall → Run workflow** 手动运行。

站点地址为 [Photowall](https://frodo2875.github.io/photowall/)。更新照片时，提交相册文件夹到 `main` 即可。

## 素材

大图查看器采用 [PhotoSwipe 5.4.4](https://photoswipe.com/)，随项目提供 [MIT 许可](site/vendor/LICENSE)。

示例照片来自 [Unsplash](https://unsplash.com/license)。示例相册名称、日期和说明用于演示。

- 山湖之间　[湖畔](https://images.unsplash.com/photo-1470770841072-f978cf4d019e) · [公路](https://images.unsplash.com/photo-1500530855697-b586d89ba3ee)
- 林中散步　[树林](https://images.unsplash.com/photo-1441974231531-c6227db76b6e) · [溪谷](https://images.unsplash.com/photo-1511884642898-4c92249e20b6)
- 山谷一日　[鹿与山谷](https://images.unsplash.com/photo-1472396961693-142e6e269027)
- 傍晚的光　[日落](https://images.unsplash.com/photo-1470252649378-9c29740c9fa8)
