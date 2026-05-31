/****************************** 
脚本功能：成都地铁签到(积分)
Version  : v1.2.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
打开成都地铁 App 签到页面保存请求头，定时任务自动签到。

[rewrite_local]
^https://app\.cdmetro\.chengdurail\.cn/platform/users/user/sign-in-integral(-day)?(\?.*)?$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/cd-rail/cd-rail.js, tag=成都地铁签到, enabled=true

[MITM]
hostname = app.cdmetro.chengdurail.cn
*******************************/

// ========== 三端适配层 ==========
var isQX = typeof $task !== "undefined";
var isLoon = typeof $loon !== "undefined";
var isSurge = typeof $httpClient !== "undefined" && !isLoon;

var $http = {
  fetch: function (opts) {
    if (isQX) return $task.fetch(opts);
    return new Promise(function (resolve, reject) {
      var method = (opts.method || "GET").toUpperCase();
      var handler = function (err, resp, data) {
        if (err) reject(err);
        else resolve({ statusCode: resp.statusCode, headers: resp.headers, body: data });
      };
      if (method === "POST") $httpClient.post(opts, handler);
      else $httpClient.get(opts, handler);
    });
  }
};

var $store = {
  read: function (key) { return isQX ? $prefs.valueForKey(key) : $persistentStore.read(key); },
  write: function (val, key) { return isQX ? $prefs.setValueForKey(val, key) : $persistentStore.write(val, key); }
};

var notifyFn = isQX
  ? function (t, s, b) { $notify(t, s, b); }
  : function (t, s, b) { $notification.post(t, s, b); };

// ========== Logger 模块 ==========
var Logger = {
  scriptStart: function (name, version, platform, requestType) {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var time = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    console.log("🚀 Script Start");
    console.log("Time     : " + time);
    console.log("Version  : " + version + " | " + platform + " | " + requestType);
    console.log("Platform : " + platform);
    console.log("------------------------------------");
  },

  envCheck: function (cookieValid, tokenStatus) {
    console.log("📂 Environment");
    console.log("- Cookie : " + (cookieValid ? "Valid" : "Invalid"));
    console.log("- Token  : " + tokenStatus);
    console.log("------------------------------------");
  },

  accountHeader: function (index, domain) {
    console.log("👤 Account | " + domain);
  },

  field: function (label, value) {
    var padding = "              ";
    var key = (label + padding).substring(0, 14);
    console.log(key + ": " + value);
  },

  status: function (icon, text) { this.field("Status", icon + " " + text); },
  points: function (val) { this.field("Points", val); },
  action: function (val) { this.field("Action", val); },
  message: function (val) { this.field("Message", val); },

  separator: function () { console.log("------------------------------------"); },

  summary: function (total, success, duplicate, failed, result) {
    console.log("📊 Summary");
    console.log("Total      : " + total);
    console.log("Success    : " + success);
    console.log("Duplicate  : " + duplicate);
    console.log("Failed     : " + failed);
    console.log("🎯 Result  : " + result);
    console.log("End");
  }
};

// ========== 工具函数 ==========
var SCRIPT_NAME = "CDRail";
var SCRIPT_VERSION = "v1.2.0";
var CD_HEADER_KEY = "CD_CDRailHeaders";
var isGetHeader = typeof $request !== "undefined";

var NEED_KEYS = [
  "Connection", "Accept-Encoding", "Accept", "Accept-Language", "Content-Type",
  "Host", "User-Agent", "system-version", "system", "app-version", "appVersion",
  "device-id", "deviceId", "source", "vendor", "language", "user", "token", "app-token", "Cookie"
];

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

function getPlatform() {
  if (isQX) return "Quantumult X";
  if (isLoon) return "Loon";
  if (isSurge) return "Surge";
  return "Unknown";
}

function pickNeedHeaders(src) {
  var dst = {};
  var get = function (name) {
    return src[name] !== undefined ? src[name] : (src[name.toLowerCase()] !== undefined ? src[name.toLowerCase()] : src[name.toUpperCase()]);
  };
  for (var i = 0; i < NEED_KEYS.length; i++) {
    var v = get(NEED_KEYS[i]);
    if (v !== undefined) dst[NEED_KEYS[i]] = v;
  }
  return dst;
}

// ========== 主流程 ==========
if (isGetHeader) {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Manual");

  var allHeaders = $request.headers || {};
  var picked = pickNeedHeaders(allHeaders);

  if (!picked || Object.keys(picked).length === 0) {
    Logger.status("⚠️", "未抓到请求头");
    notifyFn("成都地铁 抓包", "", "状态：失败\n未获取到请求头");
    $done({});
  } else {
    var ok = $store.write(JSON.stringify(picked), CD_HEADER_KEY);
    Logger.status("✅", ok ? "请求头已保存" : "保存失败");
    Logger.field("Fields", Object.keys(picked).length);
    notifyFn("成都地铁 抓包", "", ok ? "状态：成功\n请求头已保存" : "状态：失败\n保存失败");
    $done({});
  }
} else {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Cron");

  var raw = $store.read(CD_HEADER_KEY);
  if (!raw) {
    Logger.envCheck(false, "Missing");
    Logger.status("⚠️", "缺少请求头");
    notifyFn("成都地铁签到", "", "状态：失败\n原因：缺少请求头，请先抓包");
    $done();
  } else {
    var savedHeaders = safeJsonParse(raw);
    if (!savedHeaders) {
      Logger.envCheck(false, "Invalid");
      Logger.status("⚠️", "请求头解析失败");
      notifyFn("成都地铁签到", "", "状态：失败\n原因：请求头解析失败");
      $done();
    } else {
      Logger.envCheck(true, "Found");
      Logger.accountHeader(null, "app.cdmetro.chengdurail.cn");

      var headers = {
        Connection: savedHeaders["Connection"] || "keep-alive",
        "Accept-Encoding": savedHeaders["Accept-Encoding"] || "gzip, deflate, br",
        Accept: savedHeaders["Accept"] || "*/*",
        "Accept-Language": savedHeaders["Accept-Language"] || "zh-CN,zh-Hans;q=0.9",
        Host: savedHeaders["Host"] || "app.cdmetro.chengdurail.cn",
        "User-Agent": savedHeaders["User-Agent"] || "CDMetro",
        "system-version": savedHeaders["system-version"] || "",
        system: savedHeaders["system"] || "",
        "app-version": savedHeaders["app-version"] || "",
        appVersion: savedHeaders["appVersion"] || "",
        "device-id": savedHeaders["device-id"] || savedHeaders["deviceId"] || "",
        deviceId: savedHeaders["deviceId"] || savedHeaders["device-id"] || "",
        source: savedHeaders["source"] || "",
        vendor: savedHeaders["vendor"] || "",
        language: savedHeaders["language"] || "",
        user: savedHeaders["user"] || "",
        token: savedHeaders["token"] || "",
        "app-token": savedHeaders["app-token"] || "",
        Cookie: savedHeaders["Cookie"] || ""
      };

      $http.fetch({
        url: "https://app.cdmetro.chengdurail.cn/platform/users/user/sign-in-integral",
        method: "GET", headers: headers
      }).then(function (resp) {
        var status = resp.statusCode;
        var body = resp.body || "";
        var obj = safeJsonParse(body);
        var msg = "", code = "", integralIncrement;

        if (obj) {
          msg = obj.message ? String(obj.message) : (obj.msg ? String(obj.msg) : "");
          code = obj.code !== undefined ? String(obj.code) : (obj.status !== undefined ? String(obj.status) : "");
          integralIncrement = obj.data && obj.data.integralIncrement;
        }

        if (status === 401 || status === 403) {
          Logger.status("❌", "登录失效 HTTP " + status);
          Logger.separator();
          Logger.summary(1, 0, 0, 1, "登录失效");
          notifyFn("成都地铁签到", "", "状态：失败\n原因：登录失效 HTTP " + status);
        } else if (status >= 200 && status < 300) {
          if (code === "0" && (msg === "SUCCESS" || msg === "")) {
            var inc = integralIncrement !== undefined ? String(integralIncrement) : "";
            Logger.status("✅", "签到成功");
            if (inc) Logger.points("+" + inc);
            Logger.separator();
            Logger.summary(1, 1, 0, 0, "签到成功");
            notifyFn("成都地铁签到", "", "状态：成功" + (inc ? "\n积分：+" + inc : ""));
          } else if (code === "1102") {
            Logger.status("🔁", "今日已签到");
            Logger.separator();
            Logger.summary(1, 0, 1, 0, "今日已签到");
            notifyFn("成都地铁签到", "", "状态：重复签到\n" + (msg || "请勿重复签到"));
          } else {
            Logger.status("❌", msg || "未知返回");
            Logger.separator();
            Logger.summary(1, 0, 0, 1, msg || "返回异常");
            notifyFn("成都地铁签到", "", "状态：失败\n原因：" + (msg || "未知返回"));
          }
        } else {
          Logger.status("❌", "接口异常 " + status);
          Logger.separator();
          Logger.summary(1, 0, 0, 1, "接口异常");
          notifyFn("成都地铁签到", "", "状态：失败\n原因：接口异常 " + status);
        }
        $done();
      }, function (reason) {
        Logger.status("❌", "网络错误");
        Logger.separator();
        Logger.summary(1, 0, 0, 1, "网络错误");
        notifyFn("成都地铁签到", "", "状态：失败\n原因：网络错误");
        $done();
      });
    }
  }
}
