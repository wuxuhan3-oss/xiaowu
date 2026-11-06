> 注意：下文出现的 cdn.example.com 只是占位符，并未真实部署，直接访问会出现 ERR_CONNECTION_CLOSED。
> 当前可用预览：http://127.0.0.1:8377/media/（本机）。真实公网链接需要先上传到 R2/OSS/COS 或服务器。

# 媒体库 · 发布说明

## 现状

- 位置：media/，与 index.html 同级。
- 文件：16 支作品母带，H.264 / 720p / AAC，总计 **162.27 MB**；另有 16 个悬停预览（3.37 MB）。
- 路径规范：/media/<slug>.mp4，预览 /media/previews/<slug>.mp4。
- 清单：/media/manifest.json（含字节数、时长、SHA-256、URL）。
- 浏览页：/media/。
- 主站作品弹窗与悬停预览已切换到这些文件。

> 本目录是“可直接上传”的发布包。上传到任何支持静态文件/Range 的对象存储或 Web 服务器后，
> /media/... 路径保持不变，即为永久稳定链接。

## 为什么是 16 支而不是 47 支

本机实际只找到 16 支母带（1.22 GB）：

- 12 支在 C:\Users\HP\.workbuddy\projects\c-Users-HP-WorkBuddy-2026-11-02-11-32-48\
- 4 支在其中的 视频作品\ 子目录

未发现其余 31 支（约 1.27 GB 总量中的差值）。把缺失源目录给我后，可用同一套参数补压，
目标仍是 **150–200 MB** 总量。

## 上传示例

### Cloudflare R2（推荐，无出站流量费）

~~~
# 1) 在 Cloudflare 控制台创建 R2 bucket，并绑定自定义域名（如 cdn.example.com）
# 2) 本机配置 rclone 的 S3 remote（endpoint 用 R2 的 S3 endpoint）
rclone config

# 3) 上传（脚本会保留目录结构）
bash deploy/scripts/publish-media.sh r2:my-bucket/media https://<你的CDN域名>/media
~~~

### 腾讯云 COS / 阿里云 OSS

两者都兼容 S3 协议，rclone 配置对应 remote 后执行同一脚本即可。

### 自有 VPS（复用 deploy/README.md 的 Nginx）

~~~
rsync -avz media/ user@server:/var/www/portfolio/media/
# Nginx 对 mp4 默认支持 Range；确认没有被 CDN/反向代理吞掉 Range 头
~~~

## 切换 CDN 域名

若 CDN 域名不是本站域名：

1. 把 js/works-data.js 里的 media/<slug>.mp4 批量替换为 https://<你的CDN域名>/media/<slug>.mp4；
2. 同步替换 media/previews/...；
3. 或者更稳妥：在 Nginx 把 /media/ 反代/别名到对象存储，这样前端路径无需改。

## 验收

- HEAD /media/<slug>.mp4 返回 200，Content-Type: video/mp4；
- Range: bytes=0-1023 返回 206；
- 主站弹窗能播放、能拖动进度条；
- 悬停预览只请求 media/previews/*.mp4（约 0.1–0.5 MB），不请求母带。
