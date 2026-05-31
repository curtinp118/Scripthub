# 中国移动签到

## 功能说明

- 自动完成中国移动 App 签到
- 自动领取签到奖励

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 打开中国移动 App 进入签到页面，脚本自动保存 Cookie
2. 每天 8:35 自动执行签到和领奖

## 配置

### Quantumult X

```ini
[rewrite_local]
^https?://wx\.10086\.cn/qwhdhub/ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cmcc/cmcc.js

[task_local]
35 8 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cmcc/cmcc.js, tag=中国移动签到, enabled=true

[MITM]
hostname = %APPEND% wx.10086.cn
```

### Loon

```ini
[Script]
http-request ^https?://wx\.10086\.cn/qwhdhub/ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cmcc/cmcc.js, requires-body=false, tag=中国移动 抓包
cron "35 8 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cmcc/cmcc.js, tag=中国移动签到, enabled=true

[MITM]
hostname = wx.10086.cn
```

### Surge

```ini
[Script]
中国移动 抓包 = type=http-request, pattern=^https?://wx\.10086\.cn/qwhdhub/, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cmcc/cmcc.js
中国移动签到 = type=cron, cronexp="35 8 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cmcc/cmcc.js, timeout=60

[MITM]
hostname = %APPEND% wx.10086.cn
```

## 注意事项

- Cookie 需包含 `QWHD_SESSION_TOKEN`
- Cookie 失效后需重新打开 App 签到页面获取

## 更新记录

- v1.1.0 - 统一日志规范、六阶段结构、Logger 模块
- v1.0.0 - 初始版本
