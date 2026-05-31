/******************************
脚本功能：Nicegram - 解锁会员
Version  : v1.1.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
MITM 重写响应体，解锁 Nicegram 会员功能。

[rewrite_local]
https://nicegram.cloud/api/v6/user/info url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/nicegram/nicegram.js

[MITM]
hostname = nicegram.cloud
*******************************/

var body = JSON.parse($response.body);
body.data.user.lifetime_subscription = true;
body.data.user.store_subscription = true;
body.data.user.subscription = true;
$done({ body: JSON.stringify(body) });