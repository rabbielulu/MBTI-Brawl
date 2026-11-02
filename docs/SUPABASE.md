# Supabase 周榜数据库接入

现有 Phaser + Node.js / Socket.IO 继续负责实时对战，Supabase Postgres 负责冠军战绩与周榜持久化。本次不新增账号系统，也不改对战协议。

## 初始化数据库

在项目 `sulgpctvstocsjpjrhji` 的 SQL Editor 执行 `supabase/migrations/202611020001_brawl_wins.sql`。只新增 `public.brawl_wins` 表及时间索引；RLS 已启用，匿名和登录客户端没有读写权限。只有游戏服务端使用服务端密钥访问。此 SQL 需由可信项目管理员运行。

## 游戏服务器配置

使用 Node.js 22.13+。复制 `.env.example` 为 `.env`，从 Supabase 项目设置的 API Keys 页面获取现有 Secret key（或旧版 service_role key），填入 `SUPABASE_SECRET_KEY`。`.env` 已被 Git 忽略。不要发送密钥到聊天、不要使用 `VITE_` 前缀，也不要填到 GitHub Pages 构建变量中。

```sh
cp .env.example .env
# 在本机编辑 .env，填入 SUPABASE_SECRET_KEY
npm run build
npm run start:lan
```

`start:lan` 自动读取根目录 `.env`；托管环境也可直接设置进程环境变量。仅配置 URL 或仅配置密钥会拒绝启动，避免误用本地模式。两者均未配置时继续使用本地 JSON 周榜，保持 LAN 开发兼容。

## 数据流和故障处理

比赛结算仍排除试炼场、平局、机器人冠军及异常时间。先原子写入 `BRAWL_DATA_DIR/leaderboard.json`，再异步同步到 Supabase。比赛 ID 为数据库主键，重复同步不会重复计分。现有 JSON 数据启动时自动同步，无须单独导入。

断网时比赛继续运行，未同步结果每 15 秒重试，重启后从本地记录重试。必须保留持久目录，防止断网期间重启或重新部署丢失尚未同步的记录。成功同步后的数据保存在云端；新服务器查询也能读到其他实例同步的战绩。

`GET /api/leaderboard/weekly` 从 Supabase 分页读取本周记录，沿用北京时间周一 00:00、同昵称合并、并列排名及前 100 名规则。云端读写失败时返回 HTTP 503，避免把不完整的本地榜单显示为全服周榜。当前仍以昵称标识玩家，重名会合并。

## 验证

```sh
npm run test:supabase
npm run test:leaderboard
npm run build
```

前两项分别测试断网/重启补传、重复导入、跨实例查询、分页、跨周，以及原有多人结算与 HTTP 接口。`test:supabase` 使用模拟 REST 服务，不向生产数据库写测试成绩。

真实连接验收：建表并配置密钥后启动服务，访问 `/api/leaderboard/weekly` 应返回 200；完成一次真人冠军的多人比赛，再确认 Supabase 表出现同一比赛 ID 的一条记录。重启后周榜胜场数应保持不变。生产库尚未通过此验收时，不能称为已经上线。

## 公网对战服务

Supabase 不能直接托管本项目的常驻 Node.js / Socket.IO 进程。仍需一个支持常驻 Node.js、HTTPS、WebSocket 的公网部署平台（或自己的云主机）。建议先使用单实例，避免房间分散到不同进程。启动命令 `npm run start:lan`，端口由 `PORT` 提供；`BRAWL_DATA_DIR` 放到持久磁盘。

前端与服务同域部署可直接使用现有相对路径。若继续使用 GitHub Pages，需要先配置服务端允许的前端来源，再将 Pages 的 `VITE_SERVER_URL` 设置为该服务的 HTTPS 地址并重新构建。不要将 Supabase 项目 URL 当作 `VITE_SERVER_URL`；Supabase URL 是数据库 API，不是对战服务。

官方参考：[REST API](https://supabase.com/docs/guides/api)、[服务端密钥](https://supabase.com/docs/guides/api/api-keys)、[Edge Functions 限制](https://supabase.com/docs/guides/functions/limits)。

## 推荐部署：Render 新加坡单实例

仓库根目录已提供 `render.yaml`。它定义一个付费 0.5 CPU / 512 MB Node.js Web Service、1 GB 持久磁盘及健康检查。部署前以 Render 界面显示的费用为准；本配置文件不会自动购买或创建服务。自动发布关闭，避免提交代码时中断正在进行的比赛。

1. 将接入代码提交推送到你拥有的 GitHub 仓库。
2. 登录 Render，新建 Blueprint，选择该仓库；审核新加坡区域、付费套餐和磁盘费用。
3. 按提示在服务端环境变量填写 `SUPABASE_SECRET_KEY`，只提供给这个游戏服务，不放入源码。
4. 数据库 SQL 成功运行后再部署。前端和 Socket.IO 使用同一个 `https://...onrender.com` 地址，不需要设置 `VITE_SERVER_URL`。
5. 首次上线先打开 `/health` 和 `/api/leaderboard/weekly`，再用两台设备完成真人联机验收。

此规格用于初期小规模试运行；并发容量需要压测后确定。Render 磁盘挂载会使更新期间服务短暂停止，安排在无比赛时更新。

Supabase 当前区域为 Ireland（控制台显示 eu-west-1）。周榜写入异步进行，不占实时对战帧；后续可根据玩家所在地区评估数据库位置，暂不迁移或删除现有项目。
