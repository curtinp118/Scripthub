# Fine Pro 会员解锁

## 功能说明

- 重写 RevenueCat 订阅响应，解锁 Fine Pro 会员权益
- 同时支持 `subscribers` 和 `receipts` 接口
- 保留原响应中的用户信息及其他订阅，只补齐 Fine Pro 权益
- 将会员到期时间设置为 `2099-12-30 23:59:59 UTC`

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 安装并信任 MITM 证书
2. 添加对应平台的重写规则
3. 重新打开 Fine App，使客户端刷新订阅状态

## 配置

### Quantumult X

```ini
[rewrite_local]
^https?:\/\/api\.rc-backup\.com\/v1\/(subscribers\/[^/]+|receipts)$ url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/finepro/finepro.js

[MITM]
hostname = api.rc-backup.com
```

### Loon

```ini
[Script]
http-response ^https?:\/\/api\.rc-backup\.com\/v1\/(subscribers\/[^/]+|receipts)$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/finepro/finepro.js, requires-body=true, timeout=10, tag=Fine Pro会员解锁, enable=true

[MITM]
hostname = api.rc-backup.com
```

### Surge

```ini
[Script]
Fine Pro会员解锁 = type=http-response,pattern=^https?:\/\/api\.rc-backup\.com\/v1\/(subscribers\/[^/]+|receipts)$,requires-body=1,max-size=1048576,binary-body-mode=0,timeout=888,script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/finepro/finepro.js

[MITM]
hostname = %APPEND% api.rc-backup.com
```

## 注意事项

- 需要开启 MITM 并信任证书
- 脚本仅处理 `api.rc-backup.com` 的 RevenueCat 订阅接口响应
- 响应会被设置为不缓存，避免客户端继续使用 `304 Not Modified`

## 更新记录

- v1.1.0 - 按仓库规范入库，保留原用户数据并补齐三端配置
- v1.0.3 - 初始版本
