/****************************** 
脚本功能：通用签到脚本（多站点 + 多账号版）
Version  : v1.2.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
访问 new-api 类站点的 /api/user/self 页面抓包保存请求头，定时任务自动签到。
支持任意 new-api 站点，同一站点支持多账号。

[rewrite_local]
^https://[^/]+/api/user/self$ url script-request-header https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/new-api/new-api.js

[task_local]
30 7 * * * https://raw.githubusercontent.com/curtinp118/Scripthub/main/scripts/new-api/new-api.js, tag=通用签到, enabled=true

[MITM]
hostname = %APPEND% *
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
  write: function (val, key) { return isQX ? $prefs.setValueForKey(val, key) : $persistentStore.write(val, key); },
  remove: function (key) { return isQX ? $prefs.removeValueForKey(key) : $persistentStore.write(null, key); }
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
    if (index !== undefined && index !== null) {
      console.log("👤 Account #" + index + " | " + domain);
    } else {
      console.log("👤 Account | " + domain);
    }
  },

  field: function (label, value) {
    var padding = "              ";
    var key = (label + padding).substring(0, 14);
    console.log(key + ": " + value);
  },

  status: function (icon, text) { this.field("Status", icon + " " + text); },
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
var SCRIPT_NAME = "NewAPI";
var SCRIPT_VERSION = "v1.2.0";
var HEADER_KEY_PREFIX = "NewAPI_Headers";
var HOSTS_LIST_KEY = "NewAPI_Hosts";
var ACCOUNTS_KEY_PREFIX = "NewAPI_Accounts";
var FAILED_KEY_PREFIX = "NewAPI_Failed";
var isGetHeader = typeof $request !== "undefined";

var NEED_KEYS = ["Cookie", "User-Agent", "Accept", "Accept-Language", "Accept-Encoding", "Origin", "Referer", "new-api-user", "Host"];

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
  var lowerMap = {};
  for (var k in (src || {})) lowerMap[String(k).toLowerCase()] = src[k];
  var get = function (name) {
    if (src[name] !== undefined) return src[name];
    return lowerMap[String(name).toLowerCase()];
  };
  for (var i = 0; i < NEED_KEYS.length; i++) {
    var v = get(NEED_KEYS[i]);
    if (v !== undefined) dst[NEED_KEYS[i]] = v;
  }
  return dst;
}

function headerKeyForHost(host, account) {
  if (account && account.trim()) return HEADER_KEY_PREFIX + ":" + host + ":" + account;
  return HEADER_KEY_PREFIX + ":" + host;
}

function getHostFromRequest() {
  var h = ($request && $request.headers) || {};
  var host = h.Host || h.host;
  if (host) return String(host).trim();
  try { var u = new URL($request.url); return u.hostname; } catch (_) { return ""; }
}

function parseArgs(str) {
  var out = {};
  if (!str) return out;
  var parts = String(str).trim().split("&");
  for (var i = 0; i < parts.length; i++) {
    var seg = parts[i].trim();
    if (!seg) continue;
    var idx = seg.indexOf("=");
    if (idx === -1) { out[decodeURIComponent(seg)] = ""; }
    else { out[decodeURIComponent(seg.slice(0, idx))] = decodeURIComponent(seg.slice(idx + 1)); }
  }
  return out;
}

function siteName(host) {
  try {
    var name = host.replace(/^www\./, "").split(".")[0].trim();
    name = name.replace(/[-_]api$/i, "").replace(/[-_]service$/i, "").replace(/^api[-_]/i, "");
    return (name || host).toUpperCase();
  } catch (_) { return host; }
}

function notifyTitleForHost(host, account) {
  var name = siteName(host);
  return account && account.trim() ? name + "(" + account + ")" : name;
}

// ========== 存储函数 ==========
function getSavedHosts() {
  try {
    var raw = $store.read(HOSTS_LIST_KEY);
    if (!raw) return [];
    var list = safeJsonParse(raw) || [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch (e) { return []; }
}

function addHostToList(host) {
  try {
    var list = getSavedHosts();
    if (list.indexOf(host) === -1) { list.push(host); $store.write(JSON.stringify(list), HOSTS_LIST_KEY); }
  } catch (e) {}
}

function getAccountsForHost(host) {
  try {
    var raw = $store.read(ACCOUNTS_KEY_PREFIX + ":" + host);
    if (!raw) return [""];
    var list = safeJsonParse(raw);
    return Array.isArray(list) && list.length > 0 ? list : [""];
  } catch (e) { return [""]; }
}

function addAccountToHost(host, account) {
  try {
    if (!account) return;
    var list = getAccountsForHost(host).filter(Boolean);
    if (list.indexOf(account) === -1) { list.push(account); $store.write(JSON.stringify(list), ACCOUNTS_KEY_PREFIX + ":" + host); }
  } catch (e) {}
}

function isAccountFailed(host, account) {
  try { return $store.read(FAILED_KEY_PREFIX + ":" + host + ":" + account) === "true"; } catch (e) { return false; }
}

function markAccountFailed(host, account) {
  try { $store.write("true", FAILED_KEY_PREFIX + ":" + host + ":" + account); } catch (e) {}
}

function clearAccountFailed(host, account) {
  try { $store.remove(FAILED_KEY_PREFIX + ":" + host + ":" + account); } catch (e) {}
}

// ========== 签到逻辑 ==========
function doCheckin(host, account, accountIndex) {
  var title = notifyTitleForHost(host, account);

  if (isAccountFailed(host, account)) {
    Logger.accountHeader(accountIndex, host);
    Logger.status("⚠️", "已标记失败，跳过");
    Logger.separator();
    return Promise.resolve({ status: "skip", code: -1 });
  }

  var key = headerKeyForHost(host, account);
  var raw = $store.read(key);
  if (!raw) {
    Logger.accountHeader(accountIndex, host);
    Logger.status("⚠️", "缺少参数");
    Logger.separator();
    return Promise.resolve({ status: "skip", code: -1 });
  }

  var savedHeaders = safeJsonParse(raw);
  if (!savedHeaders) {
    Logger.accountHeader(accountIndex, host);
    Logger.status("⚠️", "参数异常");
    Logger.separator();
    return Promise.resolve({ status: "skip", code: -1 });
  }

  var headers = {
    Host: savedHeaders.Host || host,
    Accept: savedHeaders.Accept || "application/json, text/plain, */*",
    "Accept-Language": savedHeaders["Accept-Language"] || "zh-CN,zh-Hans;q=0.9",
    "Accept-Encoding": savedHeaders["Accept-Encoding"] || "gzip, deflate, br",
    Origin: savedHeaders.Origin || "https://" + host,
    Referer: savedHeaders.Referer || "https://" + host + "/console/personal",
    "User-Agent": savedHeaders["User-Agent"] || "QuantumultX",
    Cookie: savedHeaders.Cookie || "",
    "new-api-user": savedHeaders["new-api-user"] || ""
  };

  Logger.accountHeader(accountIndex, host);

  return $http.fetch({ url: "https://" + host + "/api/user/checkin", method: "POST", headers: headers, body: "" }).then(
    function (resp) {
      var status = resp.statusCode;
      var body = resp.body || "";
      var obj = safeJsonParse(body) || {};
      var success = Boolean(obj.success);
      var message = obj.message ? String(obj.message) : "";
      var checkinDate = obj.data && obj.data.checkin_date ? String(obj.data.checkin_date) : "";
      var quotaAwarded = obj.data && obj.data.quota_awarded !== undefined ? String(obj.data.quota_awarded) : "";

      if (status === 401 || status === 403) {
        markAccountFailed(host, account);
        Logger.status("❌", "登录失效");
        Logger.action("已停止执行");
        Logger.separator();
        return { status: "failed", code: -2 };
      } else if (status >= 200 && status < 300) {
        clearAccountFailed(host, account);
        if (success) {
          Logger.status("✅", "签到成功");
          if (checkinDate) Logger.action("日期: " + checkinDate);
          if (quotaAwarded) Logger.points(quotaAwarded);
          Logger.separator();
          return { status: "success", code: 0 };
        } else {
          Logger.status("🔁", message || "今日已签到");
          Logger.separator();
          return { status: "duplicate", code: 1 };
        }
      } else {
        Logger.status("❌", "接口异常 " + status);
        Logger.separator();
        return { status: "failed", code: -2 };
      }
    },
    function (reason) {
      Logger.status("❌", "网络错误");
      Logger.separator();
      return { status: "failed", code: -2 };
    }
  );
}

// ========== 主流程 ==========
if (isGetHeader) {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Manual");

  var allHeaders = $request.headers || {};
  var host = getHostFromRequest();
  var picked = pickNeedHeaders(allHeaders);

  if (!host || !picked || !picked.Cookie || !picked["new-api-user"]) {
    Logger.status("⚠️", "抓包失败");
    Logger.message("缺少 Cookie 或 new-api-user");
    notifyFn("通用签到", "❌ 抓包失败", "缺少关键信息");
    $done({});
  } else {
    var account = (picked["new-api-user"] || "").trim();
    var key = headerKeyForHost(host, account);
    var ok = $store.write(JSON.stringify(picked), key);

    if (ok) {
      addHostToList(host);
      if (account) addAccountToHost(host, account);
      clearAccountFailed(host, account);
      Logger.status("✅", "参数已保存");
      Logger.field("Site", siteName(host));
      if (account) Logger.field("Account", account);
    } else {
      Logger.status("❌", "保存失败");
    }
    notifyFn("通用签到", ok ? "✅ 抓包成功" : "❌ 抓包失败", ok ? siteName(host) : "保存失败");
    $done({});
  }
} else {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION, getPlatform(), "Cron");

  var args = parseArgs(typeof $argument !== "undefined" ? $argument : "");
  var onlyHost = (args.host || args.hostname || "").trim();
  var hostsToRun = onlyHost ? [onlyHost] : getSavedHosts();

  if (!onlyHost && hostsToRun.length === 0) {
    Logger.envCheck(false, "Missing");
    Logger.status("⚠️", "无可用站点");
    notifyFn("通用签到", "❌ 执行失败", "无可用站点，请先抓包");
    $done();
  } else {
    var totalAccounts = 0;
    for (var h = 0; h < hostsToRun.length; h++) {
      totalAccounts += getAccountsForHost(hostsToRun[h]).length;
    }
    Logger.envCheck(true, "Found (" + totalAccounts + " accounts)");

    var results = { success: 0, duplicate: 0, failed: 0, skip: 0 };
    var notifyResults = [];
    var hostIdx = 0;
    var accIdx = 0;
    var currentAccounts = [];
    var globalAccIdx = 0;

    function nextHost() {
      if (hostIdx >= hostsToRun.length) {
        var total = results.success + results.duplicate + results.failed;
        var resultText = "成功" + results.success + " 重复" + results.duplicate + " 失败" + results.failed;
        Logger.summary(total, results.success, results.duplicate, results.failed, resultText);

        // 汇总弹窗（3行）
        notifyFn("NewAPI", "签到完成", "账号 " + total + " | ✅" + results.success + " 🔁" + results.duplicate + " ❌" + results.failed);

        // 逐账号弹窗（每个3行）
        for (var r = 0; r < notifyResults.length; r++) {
          var nr = notifyResults[r];
          if (nr.code === -1) continue; // skip
          var icon = nr.code === 0 ? "✅" : nr.code === 1 ? "🔁" : "❌";
          notifyFn(nr.title, icon + " " + nr.status, nr.detail);
        }
        $done();
        return;
      }
      currentAccounts = getAccountsForHost(hostsToRun[hostIdx]);
      accIdx = 0;
      nextAccount();
    }

    function nextAccount() {
      if (accIdx >= currentAccounts.length) {
        hostIdx++;
        nextHost();
        return;
      }
      var host = hostsToRun[hostIdx];
      var acc = currentAccounts[accIdx];
      accIdx++;
      globalAccIdx++;

      doCheckin(host, acc, globalAccIdx).then(function (result) {
        if (result.code === 0) results.success++;
        else if (result.code === 1) results.duplicate++;
        else if (result.code !== -1) results.failed++;
        if (result.code !== -1) {
          notifyResults.push({ title: notifyTitleForHost(host, acc), status: result.status, code: result.code, detail: siteName(host) });
        }
        nextAccount();
      });
    }

    nextHost();
  }
}
