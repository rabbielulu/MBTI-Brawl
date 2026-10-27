# 公司电脑部署

GitHub 保存源代码；同事实际访问的是公司电脑运行的 Node.js 服务。

## 第一次部署

安装 Git 和 Node.js（满足项目 README 的版本要求），在终端执行：

```sh
git clone https://github.com/rabbielulu/MBTI-Brawl.git
cd MBTI-Brawl
npm install
npm run build
npm run start:lan
```

私有仓库需要用有权限的 GitHub 账户登录。启动后把终端打印的 LAN 地址发给同事，例如 `http://192.168.5.100:3000`。`localhost` 仅供服务器电脑自己使用。

公司电脑保持开机、联网和服务运行。由公司 IT 配置固定局域网 IP，并按公司规定允许内网访问 TCP 3000。当前命令需要保持终端打开；尚未配置系统服务或开机自动启动。Mac 可使用项目内的 `启动Host.command`；Windows 使用上述 npm 命令。

## 从笔记本发布更新

笔记本测试完成后提交和推送：

```sh
git add .
git commit -m "Describe the update"
git push origin main
```

公司电脑在无人比赛时按 Ctrl+C 停止旧服务，执行：

```sh
git pull --ff-only
npm install
npm run build
npm run start:lan
```

重启会丢失内存中的房间和比赛。更新后各设备刷新页面；服务端逻辑或协议改变时，必须重启服务，不能只刷新网页。

## 范围

GitHub Pages 无法运行本项目的 Node.js / Socket.IO 服务。上述方案用于公司内网，尚未配置公网域名、HTTPS、自动发布、进程守护或数据库。
