# 蛋蛋不语 VIP 解锁

## 功能说明

- 解锁VIP

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 安装并信任 MITM 证书
2. 添加下方重写规则
3. 打开蛋蛋不语 App 即可生效

## 配置

### Quantumult X

```ini
[rewrite_local]
^http:\/\/38\.76\.202\.248:8000\/.*profiles.* url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/dandanvip/dandanvip_unlock.js

[MITM]
hostname = 38.76.202.248
```

### Loon

```ini
[Script]
http-response ^http:\/\/38\.76\.202\.248:8000\/.*profiles.* script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/dandanvip/dandanvip_unlock.js, requires-body=true

[MITM]
hostname = 38.76.202.248
```

### Surge

```ini
[Script]
蛋蛋不语VIP解锁 = type=http-response, pattern=^http:\/\/38\.76\.202\.248:8000\/.*profiles.*, requires-body=1, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/dandanvip/dandanvip_unlock.js

[MITM]
hostname = %APPEND% 38.76.202.248
```

## 注意事项

- 需要开启 MITM 并信任证书
- 仅修改用户信息接口响应

## 更新记录

- v1.0.0 - 初始版本
