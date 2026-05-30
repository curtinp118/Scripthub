     1|# V2EX 每日签到
     2|
     3|## 功能
     4|
     5|- 自动完成 V2EX 每日签到领取铜币
     6|- 显示连续签到天数和奖励信息
     7|- 已签到时显示余额
     8|
     9|## 配置
    10|
    11|### 1. 抓包保存 Cookie
    12|
    13|访问 `https://www.v2ex.com/` 个人主页，脚本自动保存 Cookie。
    14|
    15|**QX**
    16|```ini
    17|[rewrite_local]
    18|^https:\/\/www\.v2ex\.com\/(mission|member).* url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js
    19|
    20|[MITM]
    21|hostname = %APPEND% www.v2ex.com
    22|```
    23|
    24|**Loon**
    25|```ini
    26|[Script]
    27|http-request ^https://www\.v2ex\.com/(mission|member).*$ script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, requires-body=false, timeout=10, tag=V2EX抓包, enable=true
    28|cron "10 9 * * *" script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, timeout=60, tag=V2EX签到, enable=true
    29|
    30|[MITM]
    31|hostname = www.v2ex.com
    32|```
    33|
    34|**Surge**
    35|```ini
    36|[Script]
    37|V2EX 抓包 = type=http-request, pattern=^https://www\.v2ex\.com/(mission|member).*$, requires-body=0, script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, timeout=10
    38|V2EX 签到 = type=cron, cronexp="10 9 * * *", script-path=https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/v2ex/v2ex.js, timeout=60
    39|
    40|[MITM]
    41|hostname = %APPEND% www.v2ex.com
    42|```
    43|
    44|### 2. 定时签到
    45|
    46|每天 9:10 自动执行，配置见各客户端的 task_local / cron 部分。
    47|