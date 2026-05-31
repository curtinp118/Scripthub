# NewAPI 通用签到

## 功能说明

- 支持任意 new-api 类站点的自动签到
- 同一站点支持多账号
- 失败账号自动跳过，需重新抓包激活

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 访问站点的 `/api/user/self` 页面，脚本自动保存请求头
2. 每天 7:30 自动执行签到
3. 401/403 响应自动标记账号为失败

## 配置

### Quantumult X

```ini
[rewrite_local]
^https://[^/]+/api/user/self$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/new-api/new-api.js

[task_local]
30 7 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/new-api/new-api.js, tag=通用签到, enabled=true

[MITM]
hostname = %APPEND% *
```

### Loon

```ini
[Script]
http-request ^https://[^/]+/api/user/self$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/new-api/new-api.js, requires-body=false, tag=通用签到 抓包
cron "30 7 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/new-api/new-api.js, tag=通用签到, enabled=true

[MITM]
hostname = *
```

### Surge

```ini
[Script]
通用签到 抓包 = type=http-request, pattern=^https://[^/]+/api/user/self$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/new-api/new-api.js
通用签到 = type=cron, cronexp="30 7 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/new-api/new-api.js, timeout=60

[MITM]
hostname = %APPEND% *
```

## 注意事项

- 需要 Cookie 和 `new-api-user` 请求头
- 登录失效（401/403）的账号自动跳过，需重新抓包
- 同一站点多次抓包可保存不同账号

## 更新记录

- v1.1.0 - 统一日志规范、六阶段结构、Logger 模块
- v1.0.0 - 初始版本
