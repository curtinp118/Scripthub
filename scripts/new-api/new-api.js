/******************************
脚本功能：通用签到脚本（多站点 + 多账号版）
Version  : v1.1.0
更新时间：2026-05-31
作者：Curtinp118
Platform : Quantumult X / Loon / Surge

使用说明：
访问 new-api 类站点的 /api/user/self 页面抓包保存请求头，定时任务自动签到。支持任意 new-api 站点，同一站点支持多账号。

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
  info: function (msg) { console.log("ℹ️ INFO    │ " + msg); },
  success: function (msg) { console.log("✅ SUCCESS │ " + msg); },
  warn: function (msg) { console.log("⚠️ WARN    │ " + msg); },
  error: function (msg) { console.log("❌ ERROR   │ " + msg); },
  debug: function (msg) { console.log("🐛 DEBUG   │ " + msg); },

  scriptStart: function (name, version) {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var time = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    console.log("🚀 [" + name + "] Script Start");
    console.log("📅 Time: " + time);
    console.log("📦 Version: " + version);
  },

  envCheck: function (platform, requestType, notifyEnabled, proxyEnabled) {
    console.log("🔍 Environment Check");
    console.log("Platform   : " + platform);
    console.log("Request    : " + requestType);
    console.log("Notify     : " + (notifyEnabled ? "Enabled" : "Disabled"));
    console.log("Proxy      : " + (proxyEnabled === null ? "N/A" : (proxyEnabled ? "Enabled" : "Disabled")));
    console.log("");
    console.log("✅ Environment Ready");
  },

  configLoading: function (cookieValid, tokenStatus, accountCount) {
    console.log("📂 Config Loading");
    var cookieIcon = cookieValid === true ? "Valid ✅" : cookieValid === false ? "Invalid ❌" : "Missing ⚠️";
    console.log("Cookie Status  : " + cookieIcon);
    console.log("Token Status   : " + tokenStatus);
    console.log("Account Count  : " + accountCount);
    console.log("");
    console.log("✅ Config Ready");
  },

  accountHeader: function (index, domain) {
    console.log("━━━━━━━━━━━━━━━━━━");
    if (index !== undefined && index !== null) {
      console.log("👤 Account #" + index);
    } else {
      console.log("👤 Account");
    }
    if (domain) console.log("🌐 Domain : " + domain);
    console.log("━━━━━━━━━━━━━━━━━━");
  },

  status: function (icon, text) { console.log("📊 Status   : " + icon + " " + text); },
  points: function (val) { console.log("🎯 Points   : " + val); },
  balance: function (val) { console.log("💰 Balance  : " + val); },

  taskSummary: function (total, success, duplicate, failed) {
    console.log("📋 Task Summary");
    console.log("");
    console.log("Total     : " + total);
    console.log("Success   : " + success);
    console.log("Duplicate : " + duplicate);
    console.log("Failed    : " + failed);
  },

  scriptFinished: function () { console.log("✅ Script Finished"); }
};

// ========== 工具函数 ==========
var SCRIPT_NAME = "NewAPI";
var SCRIPT_VERSION = "v1.1.0";
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
  try {
    var u = new URL($request.url);
    return u.hostname;
  } catch (_) {
    return "";
  }
}

function parseArgs(str) {
  var out = {};
  if (!str) return out;
  var s = String(str).trim();
  if (!s) return out;
  var parts = s.split("&");
  for (var i = 0; i < parts.length; i++) {
    var seg = parts[i].trim();
    if (!seg) continue;
    var idx = seg.indexOf("=");
    if (idx === -1) { out[decodeURIComponent(seg)] = ""; }
    else {
      out[decodeURIComponent(seg.slice(0, idx))] = decodeURIComponent(seg.slice(idx + 1));
    }
  }
  return out;
}

function notifyTitleForHost(host, account) {
  var siteName = host;
  try {
    var name = host.replace(/^www\./, "");
    var parts = name.split(".");
    name = parts[0].trim();
    if (!name) name = parts[1] || host;
    name = name.replace(/[-_]api$/i, "").replace(/[-_]service$/i, "").replace(/[-_]app$/i, "").replace(/^api[-_]/i, "");
    siteName = name.toUpperCase() || host.toUpperCase();
  } catch (_) {}
  return account && account.trim() ? siteName + "(" + account + ")" : siteName;
}

// ========== 存储函数 ==========
function getSavedHosts() {
  try {
    var raw = $store.read(HOSTS_LIST_KEY);
    if (!raw) return [];
    var list = safeJsonParse(raw) || [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch (e) {
    Logger.error("读取站点列表失败: " + e);
    return [];
  }
}

function addHostToList(host) {
  try {
    var list = getSavedHosts();
    if (list.indexOf(host) === -1) {
      list.push(host);
      $store.write(JSON.stringify(list), HOSTS_LIST_KEY);
    }
  } catch (e) {
    Logger.error("保存站点失败: " + e);
  }
}

function getAccountsForHost(host) {
  try {
    var raw = $store.read(ACCOUNTS_KEY_PREFIX + ":" + host);
    if (!raw) return [""];
    var list = safeJsonParse(raw);
    return Array.isArray(list) && list.length > 0 ? list : [""];
  } catch (e) {
    Logger.error("读取账号列表失败: " + e);
    return [""];
  }
}

function addAccountToHost(host, account) {
  try {
    if (!account) return;
    var list = getAccountsForHost(host).filter(Boolean);
    if (list.indexOf(account) === -1) {
      list.push(account);
      $store.write(JSON.stringify(list), ACCOUNTS_KEY_PREFIX + ":" + host);
    }
  } catch (e) {
    Logger.error("保存账号失败: " + e);
  }
}

function isAccountFailed(host, account) {
  try {
    var failedKey = FAILED_KEY_PREFIX + ":" + host + ":" + account;
    return $store.read(failedKey) === "true";
  } catch (e) { return false; }
}

function markAccountFailed(host, account) {
  try {
    $store.write("true", FAILED_KEY_PREFIX + ":" + host + ":" + account);
    Logger.warn("标记 " + notifyTitleForHost(host, account) + " 为失败");
  } catch (e) {
    Logger.error("标记失败状态出错: " + e);
  }
}

function clearAccountFailed(host, account) {
  try {
    $store.remove(FAILED_KEY_PREFIX + ":" + host + ":" + account);
    Logger.info("清除 " + notifyTitleForHost(host, account) + " 失败标记");
  } catch (e) {
    Logger.error("清除失败状态出错: " + e);
  }
}

// ========== 签到逻辑 ==========
function doCheckin(host, account) {
  var title = notifyTitleForHost(host, account);

  if (isAccountFailed(host, account)) {
    Logger.warn(title + " 已标记失败，跳过");
    return Promise.resolve({ status: "skip", code: -1 });
  }

  var key = headerKeyForHost(host, account);
  var raw = $store.read(key);
  if (!raw) {
    Logger.error(title + " 缺少参数");
    notifyFn(title, "缺少参数", "请先抓包保存 /api/user/self 请求头");
    return Promise.resolve({ status: "skip", code: -1 });
  }

  var savedHeaders = safeJsonParse(raw);
  if (!savedHeaders) {
    Logger.error(title + " 参数异常");
    notifyFn(title, "参数异常", "请求头解析失败，请重新抓包");
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
        notifyFn(title, "登录失效 ✗", "已停止执行，请重新抓包");
        return { status: "failed", code: -2 };
      } else if (status >= 200 && status < 300) {
        clearAccountFailed(host, account);
        if (success) {
          var content = checkinDate ? "日期: " + checkinDate : "签到成功";
          if (quotaAwarded) content += " | 额度: " + quotaAwarded;
          Logger.status("✅", "签到成功");
          if (quotaAwarded) Logger.points(quotaAwarded);
          notifyFn(title, "✅ 签到成功", content);
          return { status: "success", code: 0 };
        } else {
          Logger.status("🔄", message || "今日已签到");
          notifyFn(title, "签到信息", message || body);
          return { status: "duplicate", code: 1 };
        }
      } else {
        Logger.status("❌", "接口异常 " + status);
        notifyFn(title, "接口异常 " + status, message || body);
        return { status: "failed", code: -2 };
      }
    },
    function (reason) {
      var err = reason && reason.error ? String(reason.error) : String(reason || "");
      Logger.error(title + " 网络错误: " + err);
      notifyFn(title, "✗ 网络错误", err);
      return { status: "failed", code: -2 };
    }
  );
}

// ========== 主流程 ==========
if (isGetHeader) {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION);

  var allHeaders = $request.headers || {};
  var host = getHostFromRequest();
  var picked = pickNeedHeaders(allHeaders);

  if (!host || !picked || !picked.Cookie || !picked["new-api-user"]) {
    Logger.error("抓包失败: 缺少 Cookie 或 new-api-user");
    notifyFn("通用签到", "未抓到关键信息", "请在触发 /api/user/self 请求时抓包（需要 Cookie 和 new-api-user）");
    $done({});
  } else {
    var account = (picked["new-api-user"] || "").trim();
    var key = headerKeyForHost(host, account);
    var ok = $store.write(JSON.stringify(picked), key);
    var title = notifyTitleForHost(host, account);

    if (ok) {
      addHostToList(host);
      if (account) addAccountToHost(host, account);
      clearAccountFailed(host, account);
      Logger.success(title + " 参数获取成功");
      notifyFn(title + " 参数获取成功", "失败标记已清除", "");
    } else {
      Logger.error(title + " 参数保存失败");
      notifyFn(title + " 参数保存失败", "", "");
    }
    Logger.scriptFinished();
    $done({});
  }
} else {
  Logger.scriptStart(SCRIPT_NAME, SCRIPT_VERSION);
  Logger.envCheck(getPlatform(), "Cron", true, null);

  var args = parseArgs(typeof $argument !== "undefined" ? $argument : "");
  var onlyHost = (args.host || args.hostname || "").trim();
  var hostsToRun = onlyHost ? [onlyHost] : getSavedHosts();

  if (!onlyHost && hostsToRun.length === 0) {
    Logger.configLoading(false, "Missing", 0);
    Logger.warn("无可用站点，请先抓包");
    notifyFn("通用签到", "无可用站点", "请先抓包保存至少一个站点");
    Logger.scriptFinished();
    $done();
  } else {
    // 统计总账号数
    var totalAccounts = 0;
    for (var h = 0; h < hostsToRun.length; h++) {
      totalAccounts += getAccountsForHost(hostsToRun[h]).length;
    }
    Logger.configLoading(true, "Found", totalAccounts);

    var results = { success: 0, duplicate: 0, failed: 0 };
    var hostIdx = 0;
    var accIdx = 0;
    var currentAccounts = [];

    function nextHost() {
      if (hostIdx >= hostsToRun.length) {
        var total = results.success + results.duplicate + results.failed;
        Logger.taskSummary(total, results.success, results.duplicate, results.failed);
        Logger.scriptFinished();
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

      Logger.accountHeader(accIdx, host);
      doCheckin(host, acc).then(function (result) {
        if (result.code === 0) results.success++;
        else if (result.code === 1) results.duplicate++;
        else if (result.code !== -1) results.failed++;
        nextAccount();
      });
    }

    nextHost();
  }
}