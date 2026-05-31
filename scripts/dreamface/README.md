# DreamFace 解锁

## 功能说明

- MITM 重写响应体，解锁 DreamFace 会员功能
- 设置 VIP 年套餐、9999 天剩余天数

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 安装并信任 MITM 证书
2. 添加下方重写规则
3. 打开 DreamFace App 即可生效

## 配置

### Quantumult X

```ini
[rewrite_local]
https://www.dreamfaceapp.com/df-server/user/save_user_login url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/dreamface/dreamface.js

[MITM]
hostname = www.dreamfaceapp.com
```

### Loon

```ini
[Script]
http-response https://www.dreamfaceapp.com/df-server/user/save_user_login script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/dreamface/dreamface.js, requires-body=true

[MITM]
hostname = www.dreamfaceapp.com
```

### Surge

```ini
[Script]
DreamFace = type=http-response, pattern=https://www.dreamfaceapp.com/df-server/user/save_user_login, requires-body=1, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/dreamface/dreamface.js

[MITM]
hostname = %APPEND% www.dreamfaceapp.com
```

## 注意事项

- 需要开启 MITM 并信任证书
- 仅修改登录接口响应

## 更新记录

- v1.1.0 - 统一头部注释格式
- v1.0.0 - 初始版本
