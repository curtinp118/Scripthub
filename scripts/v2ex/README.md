# V2EX 每日签到

## 功能说明

- 自动完成 V2EX 每日签到领取铜币
- 显示连续签到天数和余额信息
- 签到失败自动重试（最多 3 次）

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 访问 `https://www.v2ex.com/` 个人主页，脚本自动保存 Cookie
2. 每天 9:10 自动执行签到
3. 签到结果通过通知推送

## 配置

### Quantumult X

```ini
[rewrite_local]
^https://www\.v2ex\.com/(mission|member).* url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, tag=V2EX 每日签到, enabled=true

[MITM]
hostname = %APPEND% www.v2ex.com
```

### Loon

```ini
[Script]
http-request ^https://www\.v2ex\.com/(mission|member).*$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, requires-body=false, tag=V2EX 抓包
cron "10 9 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, tag=V2EX 签到, enabled=true

[MITM]
hostname = www.v2ex.com
```

### Surge

```ini
[Script]
V2EX 抓包 = type=http-request, pattern=^https://www\.v2ex\.com/(mission|member).* , requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js
V2EX 签到 = type=cron, cronexp="10 9 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, timeout=60

[MITM]
hostname = %APPEND% www.v2ex.com
```

## 注意事项

- Cookie 失效后需重新访问个人主页获取
- 签到结果依赖 V2EX 页面解析，页面变动可能导致失败

## 更新记录

- v1.1.0 - 统一日志规范、六阶段结构、Logger 模块
- v1.0.0 - 初始版本
