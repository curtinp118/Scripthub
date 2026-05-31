# 布丁锁屏解锁

## 功能说明

- MITM 重写响应体，解锁布丁锁屏会员功能
- 设置 VIP 状态、到期时间 2999-01-01

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 安装并信任 MITM 证书
2. 添加下方重写规则
3. 打开布丁锁屏 App 即可生效

## 配置

### Quantumult X

```ini
[rewrite_local]
^https://screen-lock\.sm-check\.com/ url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/buding/buding.js

[MITM]
hostname = screen-lock.sm-check.com
```

### Loon

```ini
[Script]
http-response ^https://screen-lock\.sm-check\.com/ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/buding/buding.js, requires-body=true

[MITM]
hostname = screen-lock.sm-check.com
```

### Surge

```ini
[Script]
布丁锁屏 = type=http-response, pattern=^https://screen-lock\.sm-check\.com/, requires-body=1, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/buding/buding.js

[MITM]
hostname = %APPEND% screen-lock.sm-check.com
```

## 注意事项

- 需要开启 MITM 并信任证书
- 仅修改 `/userApi/saveUser` 接口响应

## 更新记录

- v1.1.0 - 统一头部注释格式
- v1.0.0 - 初始版本
