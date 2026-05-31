/******************************
脚本功能：布丁锁屏 - 解锁会员
Version  : v1.1.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
MITM 重写响应体，解锁布丁锁屏会员功能。

[rewrite_local]
^https://screen-lock\.sm-check\.com/ url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/buding/buding.js

[MITM]
hostname = screen-lock.sm-check.com
*******************************/

var body = JSON.parse($response.body);

if ($request.url.indexOf("/userApi/saveUser") !== -1) {
  body.data.freeFlag = 1;
  body.data.newVipStatus = 1;
  body.data.vipStatus = 1;
  body.data.endTime = "2999-01-01";
  body.data.expireDate = 32472115200;
}

$done({ body: JSON.stringify(body) });