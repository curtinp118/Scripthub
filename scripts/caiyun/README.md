# 彩云天气解锁

## 功能说明

- MITM 重写响应体，解锁彩云天气会员功能
- 修改 `/v2/user` 接口返回，设置 VIP 状态

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 安装并信任 MITM 证书
2. 添加下方重写规则
3. 打开彩云天气 App 即可生效

## 配置

### Quantumult X

```ini
[rewrite_local]
^https://biz\.cyapi\.cn/ url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/caiyun/caiyun.js

[MITM]
hostname = biz.cyapi.cn
```

### Loon

```ini
[Script]
http-response ^https://biz\.cyapi\.cn/ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/caiyun/caiyun.js, requires-body=true

[MITM]
hostname = biz.cyapi.cn
```

### Surge

```ini
[Script]
彩云天气 = type=http-response, pattern=^https://biz\.cyapi\.cn/, requires-body=1, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/caiyun/caiyun.js

[MITM]
hostname = %APPEND% biz.cyapi.cn
```

## 注意事项

- 需要开启 MITM 并信任证书
- 仅修改 `/v2/user` 接口响应

## 更新记录

- v1.1.0 - 统一头部注释格式
- v1.0.0 - 初始版本
