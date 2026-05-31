# 成都地铁签到

## 功能说明

- 自动完成成都地铁 App 会员中心签到
- 签到成功获取积分

## 支持平台

- Quantumult X
- Loon
- Surge

## 使用说明

1. 打开成都地铁 App → 我的 → 会员中心，点击签到按钮触发请求
2. 脚本自动保存请求头
3. 每天 9:10 自动执行签到

## 配置

### Quantumult X

```ini
[rewrite_local]
^https://app\.cdmetro\.chengdurail\.cn/platform/users/user/sign-in-integral(-day)?(\?.*)?$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js, tag=成都地铁签到, enabled=true

[MITM]
hostname = app.cdmetro.chengdurail.cn
```

### Loon

```ini
[Script]
http-request ^https://app\.cdmetro\.chengdurail\.cn/platform/users/user/sign-in-integral(-day)? script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js, requires-body=false, tag=成都地铁 抓包
cron "10 9 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js, tag=成都地铁签到, enabled=true

[MITM]
hostname = app.cdmetro.chengdurail.cn
```

### Surge

```ini
[Script]
成都地铁 抓包 = type=http-request, pattern=^https://app\.cdmetro\.chengdurail\.cn/platform/users/user/sign-in-integral(-day)?, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js
成都地铁签到 = type=cron, cronexp="10 9 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js, timeout=60

[MITM]
hostname = %APPEND% app.cdmetro.chengdurail.cn
```

## 注意事项

- 需要手动触发一次签到请求来保存请求头
- 请求头包含 token 等认证信息，过期后需重新获取
- code=1102 表示今日已签到

## 更新记录

- v1.1.0 - 统一日志规范、六阶段结构、Logger 模块
- v1.0.0 - 初始版本
