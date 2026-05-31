# GLaDOS 自动签到

## 功能说明

- 支持 glados.network、railgun.info、glados.vip、glados.one、glados.space 五个域名
- 每个域名支持多账号
- 自动签到 + 积分查询 + 积分兑换（≥500 积分自动兑换 plan500）

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 访问任意域名的 `/console/account` 页面，脚本自动保存 Cookie
2. 每天 7:10 自动执行签到
3. 同一域名多次访问可保存不同账号

## 配置

### Quantumult X

```ini
[rewrite_local]
^https://glados\.network/console/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https://railgun\.info/console/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https://glados\.vip/console/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https://glados\.one/console/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
^https://glados\.space/console/account$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js

[task_local]
10 7 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, tag=GLaDOS 签到, enabled=true

[MITM]
hostname = %APPEND% glados.network, railgun.info, glados.vip, glados.one, glados.space
```

### Loon

```ini
[Script]
http-request ^https://(glados\.network|railgun\.info|glados\.vip|glados\.one|glados\.space)/console/account$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, requires-body=false, tag=GLaDOS 抓包
cron "10 7 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, tag=GLaDOS 签到, enabled=true

[MITM]
hostname = glados.network, railgun.info, glados.vip, glados.one, glados.space
```

### Surge

```ini
[Script]
GLaDOS 抓包 = type=http-request, pattern=^https://glados\.network/console/account$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
GLaDOS 抓包2 = type=http-request, pattern=^https://railgun\.info/console/account$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
GLaDOS 抓包3 = type=http-request, pattern=^https://glados\.vip/console/account$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js
GLaDOS 签到 = type=cron, cronexp="10 7 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/glados/glados.js, timeout=60

[MITM]
hostname = %APPEND% glados.network, railgun.info, glados.vip, glados.one, glados.space
```

## 多账号

同一域名多次访问 `/console/account` 页面，每次抓包保存不同账号的 Cookie。

## 注意事项

- 积分 ≥500 时自动兑换 plan500
- Cookie 失效后需重新访问控制台获取

## 更新记录

- v1.1.0 - 统一日志规范、六阶段结构、Logger 模块
- v1.0.0 - 初始版本
