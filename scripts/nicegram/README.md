# Nicegram 解锁

## 功能说明

- MITM 重写响应体，解锁 Nicegram 会员功能
- 设置 lifetime_subscription、store_subscription、subscription 为 true

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 安装并信任 MITM 证书
2. 添加下方重写规则
3. 打开 Nicegram App 即可生效

## 配置

### Quantumult X

```ini
[rewrite_local]
https://nicegram.cloud/api/v6/user/info url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nicegram/nicegram.js

[MITM]
hostname = nicegram.cloud
```

### Loon

```ini
[Script]
http-response https://nicegram.cloud/api/v6/user/info script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nicegram/nicegram.js, requires-body=true

[MITM]
hostname = nicegram.cloud
```

### Surge

```ini
[Script]
Nicegram = type=http-response, pattern=https://nicegram.cloud/api/v6/user/info, requires-body=1, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nicegram/nicegram.js

[MITM]
hostname = %APPEND% nicegram.cloud
```

## 注意事项

- 需要开启 MITM 并信任证书
- 仅修改用户信息接口响应

## 更新记录

- v1.1.0 - 统一头部注释格式
- v1.0.0 - 初始版本
