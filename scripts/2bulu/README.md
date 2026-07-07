# 两步路 VIP 解锁

## 功能说明

- 解锁两步路 VIP/SVIP 会员信息
- 修改 `myVipInfo` 接口返回，将会员到期时间设置为 `2099-12-31`
- 修改 `vip/message` 接口返回，展示脚本标识和已开通状态

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 安装并信任 MITM 证书
2. 添加下方重写规则
3. 打开两步路 App 并进入会员信息页面即可生效

## 配置

### Quantumult X

```ini
[rewrite_local]
^https:\/\/h5\.2bulu\.com\/api\/v9\/vip\/myVipInfo\?userId=[^&]+ url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/2bulu/2bulu.js
^https:\/\/helper\.2bulu\.com\/vip\/message(?:\?.*)?$ url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/2bulu/2bulu.js

[MITM]
hostname = h5.2bulu.com, helper.2bulu.com
```

### Loon

```ini
[Script]
http-response ^https:\/\/h5\.2bulu\.com\/api\/v9\/vip\/myVipInfo\?userId=[^&]+ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/2bulu/2bulu.js, requires-body=true, timeout=10, tag=两步路VIP解锁, enable=true
http-response ^https:\/\/helper\.2bulu\.com\/vip\/message(?:\?.*)?$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/2bulu/2bulu.js, requires-body=true, timeout=10, tag=两步路会员文案, enable=true

[MITM]
hostname = h5.2bulu.com, helper.2bulu.com
```

### Surge

```ini
[Script]
两步路VIP解锁 = type=http-response,pattern=^https:\/\/h5\.2bulu\.com\/api\/v9\/vip\/myVipInfo\?userId=[^&]+,requires-body=1,max-size=1048576,binary-body-mode=0,timeout=888,script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/2bulu/2bulu.js
两步路会员文案 = type=http-response,pattern=^https:\/\/helper\.2bulu\.com\/vip\/message(?:\?.*)?$,requires-body=1,max-size=1048576,binary-body-mode=0,timeout=888,script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/2bulu/2bulu.js

[MITM]
hostname = %APPEND% h5.2bulu.com, helper.2bulu.com
```

## 注意事项

- 需要开启 MITM 并信任证书
- 仅修改 `https://h5.2bulu.com/api/v9/vip/myVipInfo?userId=...` 接口响应
- 仅修改 `https://helper.2bulu.com/vip/message` 接口响应中的 `subTitle` 和 `linkName`

## 更新记录

- v1.0.0 - 初始版本
