# Notability 解锁

## 功能说明

- MITM 重写响应体，解锁 Notability 会员功能
- 设置 premium 订阅状态，到期时间 2999-09-09

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 安装并信任 MITM 证书
2. 添加下方重写规则
3. 打开 Notability App 即可生效

## 配置

### Quantumult X

```ini
[rewrite_local]
^https?://notability\.com/(global|subscriptions) url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/notability/notability.js

[MITM]
hostname = notability.com
```

### Loon

```ini
[Script]
http-response ^https?://notability\.com/(global|subscriptions) script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/notability/notability.js, requires-body=true

[MITM]
hostname = notability.com
```

### Surge

```ini
[Script]
Notability = type=http-response, pattern=^https?://notability\.com/(global|subscriptions), requires-body=1, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/notability/notability.js

[MITM]
hostname = %APPEND% notability.com
```

## 注意事项

- 需要开启 MITM 并信任证书
- 仅修改订阅相关接口响应

## 更新记录

- v1.1.0 - 统一头部注释格式
- v1.0.0 - 初始版本
