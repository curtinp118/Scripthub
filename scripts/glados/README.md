# GLaDOS 自动签到

## 功能

- 支持 glados.network、railgun.info、glados.vip、glados.one、glados.space 五个域名
- 每个域名支持多账号
- 自动签到 + 积分查询 + 积分兑换（≥500 积分自动兑换 plan500）

## 配置

### 1. 抓包保存 Cookie

访问任意域名的 `/console/account` 页面，脚本自动保存 Cookie。

**QX**
```ini
[rewrite_local]
^https:\/\/glados\.network\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https:\/\/railgun\.info\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https:\/\/glados\.vip\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https:\/\/glados\.one\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https:\/\/glados\.space\/console\/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js

[MITM]
hostname = %APPEND% glados.network, railgun.info, glados.vip, glados.one, glados.space
```

**Loon**
```ini
[Script]
http-request ^https://glados\.network/console/account$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, requires-body=false, tag=GLaDOS 抓包
http-request ^https://railgun\.info/console/account$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, requires-body=false, tag=GLaDOS 抓包
http-request ^https://glados\.vip/console/account$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, requires-body=false, tag=GLaDOS 抓包
cron "10 7 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, tag=GLaDOS 签到, enabled=true

[MITM]
hostname = glados.network, railgun.info, glados.vip
```

**Surge**
```ini
[Script]
GLaDOS 抓包 = type=http-request, pattern=^https://glados\.network/console/account$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
GLaDOS 抓包2 = type=http-request, pattern=^https://railgun\.info/console/account$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
GLaDOS 抓包3 = type=http-request, pattern=^https://glados\.vip/console/account$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
GLaDOS 签到 = type=cron, cronexp="10 7 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, timeout=60

[MITM]
hostname = %APPEND% glados.network, railgun.info, glados.vip
```

### 2. 定时签到

每天 7:10 自动执行，配置见各客户端的 task_local / cron 部分。

## 多账号

同一域名多次访问 `/console/account` 页面，每次抓包保存不同账号的 Cookie。
