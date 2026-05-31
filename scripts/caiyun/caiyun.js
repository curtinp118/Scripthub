/****************************** 
脚本功能：彩云天气 - 登陆后解锁会员
Version  : v1.1.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X

[rewrite_local]
^https:\/\/biz\.cyapi\.cn\/ url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/caiyun/caiyun.js
[mitm]
hostname = biz.cyapi.cn
*******************************/

var body = JSON.parse($response.body);

if ($request.url.indexOf("/v2/user") !== -1) {
  body.result.is_vip = true;
  body.result.vip_type = "s";
  body.result.svip_expired_at = 4070951226;
}

$done({ body: JSON.stringify(body) });
