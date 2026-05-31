/****************************** 
脚本功能：Dreamface 3.0.0 - 解锁会员
Version  : v1.1.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X

[rewrite_local]
https://www.dreamfaceapp.com/df-server/user/save_user_login url script-response-body https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/dreamface/dreamface.js

[mitm]
hostname = www.dreamfaceapp.com
*******************************/

var body = {
  data: {
    rights: {
      expires_date_format: "2099-09-09 19:27:05.000",
      vip_type: "TRY_YEAR_PACKAGE",
      have_trial: false,
      vip_remainder_day: 9999,
      vip_label: true,
      expires_date: 4092595200000,
    },
    device_name: "iPhone13,3",
    system_version: "17.1.1",
    app_version: "3.0.0",
    app_package_name: "DreamFace",
    device_system: "iOS",
    country_code: "cn",
  },
  status_code: "THS12140000000",
  extend: {},
  status_msg: "Success",
};

$done({ body: JSON.stringify(body) });
