# NodeSeek 论坛签到

## 功能说明

- 自动完成 NodeSeek 论坛每日签到
- 签到结果通过通知推送

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 访问 `https://www.nodeseek.com/` 个人页面，脚本自动保存请求头
2. 每天 8:30 自动执行签到

## 配置

### Quantumult X

```ini
[rewrite_local]
^https://www\.nodeseek\.com/api/account/getInfo/\d+\?readme=1$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js

[task_local]
30 8 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js, tag=NS签到, enabled=true

[MITM]
hostname = www.nodeseek.com
```

### Loon

```ini
[Script]
http-request ^https://www\.nodeseek\.com/api/account/getInfo/\d+\?readme=1$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js, requires-body=false, tag=NS 抓包
cron "30 8 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js, tag=NS签到, enabled=true

[MITM]
hostname = www.nodeseek.com
```

### Surge

```ini
[Script]
NS 抓包 = type=http-request, pattern=^https://www\.nodeseek\.com/api/account/getInfo/\d+\?readme=1$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js
NS签到 = type=cron, cronexp="30 8 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nodeseek/nodeseek.js, timeout=60

[MITM]
hostname = %APPEND% www.nodeseek.com
```

## 注意事项

- 需要 `refract-sign` 和 `refract-key` 请求头
- 403 响应表示被风控，稍后重试
- 请求头过期后需重新访问个人页面获取

## 更新记录

- v1.1.0 - 统一日志规范、六阶段结构、Logger 模块
- v1.0.0 - 初始版本
