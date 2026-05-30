# V2EX 每日签到

## 功能

- 自动完成 V2EX 每日签到领取铜币
- 显示连续签到天数和奖励信息
- 已签到时显示余额

## 配置

### 1. 抓包保存 Cookie

访问 `https://www.v2ex.com/` 个人主页，脚本自动保存 Cookie。

**QX**
```ini
[rewrite_local]
^https:\/\/www\.v2ex\.com\/(mission|member).* url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js

[MITM]
hostname = %APPEND% www.v2ex.com
```

**Loon**
```ini
[Script]
http-request ^https://www\.v2ex\.com/(mission|member).*$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, requires-body=false, timeout=10, tag=V2EX抓包, enable=true
cron "10 9 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, timeout=60, tag=V2EX签到, enable=true

[MITM]
hostname = www.v2ex.com
```

**Surge**
```ini
[Script]
V2EX 抓包 = type=http-request, pattern=^https://www\.v2ex\.com/(mission|member).*$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, timeout=10
V2EX 签到 = type=cron, cronexp="10 9 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, timeout=60

[MITM]
hostname = %APPEND% www.v2ex.com
```

### 2. 定时签到

每天 9:10 自动执行，配置见各客户端的 task_local / cron 部分。
