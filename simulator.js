var GM = function(){

	"use strict";

	var GM = {
		script: null
	};

	var storage,
		menus = [];

	function isGMScript(script) {
		if (!script.src || script.src.lastIndexOf(".user.js") != script.src.length - 8) {
			return false;
		}
		return true;
	}

	function loadRequire(script, done) {
		if (!script.meta.require) {
			done();
			return;
		}

		var count = 0;
		var countDown = function(){
			count--;
			if (!count) {
				done();
			}
		};
		script.meta.require.forEach(function(url){
			count++;
			injectScriptUrl(url, countDown);
		});
	}

	function loadResource(script, done) {
		var resources = script.info.script.resources,
			count = 0;

		script.resources = {};

		Object.keys(resources).forEach(function(key){
			count++;
			xmlhttpRequest({
				method: "GET",
				url: resources[key],
				onload: function(response) {
					script.resources[key] = response.responseText;
					count--;
					if (done && !count) {
						done();
					}
				}
			});
		});

		if (done && !count) {
			done();
		}
	}

	function parseMeta(script, done) {
		var match = script.source.match(/^\/\/ ==UserScript==[^]+?^\/\/ ==\/UserScript==/m);

		if (!match) {
			throw "Can not read meta data from " + script.url;
		}

		script.metaRaw = match[0];

		script.meta = createMeta(script.metaRaw);

		script.grants = createGrant(script.meta);

		script.info = {
			script: createScriptInfo(script.meta),
			scriptMetaStr: script.metaRaw,
			scriptWillUpdate: false,
			version: "GM Simulator"
		};

		if (done) {
			done();
		}
	}

	function loadSource(script, done) {
		// Load source
		xmlhttpRequest({
			method: "GET",
			url: script.url,
			onload: function(response){
				script.source = response.responseText;
				if (done) {
					done();
				}
			}
		});
	}

	function createTaskRunner(tasks) {
		var args;

		function next() {
			var task = tasks.shift();
			if (!task) {
				return;
			}
			task.apply(null, args);
		}

		function start() {
			args = Array.prototype.slice.call(arguments, 0);
			args.push(next);
			next();
		}

		return {
			start: start
		};
	}

	function loadScript(script) {
		createTaskRunner([loadSource, parseMeta, loadResource, loadRequire, injectScript]).start(script);
	}

	function beforeExecute(node, stopExecute) {
		if (!isGMScript(node)) {
			return;
		}
		if (node.IS_INJECTED) {
			return;
		}

		stopExecute();

		var script = GM.script = {
			url: node.src
		};

		loadScript(script);
	}

	function addResouce(resource, list) {
		var i, line;
		for (i = 0; i < list.length; i++) {
			line = list[i].split(/\s+/);
			resource[line[0]] = line[1];
		}
	}

	function createScriptInfo(meta) {
		var infoScript = {
			description: "",
			excludes: [],
			includes: [],
			matches: [],
			name: "",
			namespace: "",
			resources: {},
			"run-at": "document-end",
			unwrap: false,
			version: ""
		};

		var key, values;
		for (key in meta) {
			values = meta[key];

			switch (key) {
				case "include":
					infoScript.includes.push.apply(infoScript.includes, values);
					break;
				case "exclude":
					infoScript.excludes.push.apply(infoScript.excludes, values);
					break;
				case "match":
					infoScript.matches.push.apply(infoScript.matches, values);
					break;
				case "resource":
					addResouce(infoScript.resources, values);
					break;
				case "unwrap":
					infoScript.unwrap = true;
					break;
				default:
					if (key in infoScript) {
						infoScript[key] = values[0];
					}
			}
		}

		return infoScript;
	}

	function createMeta(meta) {
		var re = /^\/\/ @(\S+)(.+)$/gm,
			metaObj = {},
			match;

		while ((match = re.exec(meta))) {
			if (!(match[1] in metaObj)) {
				metaObj[match[1]] = [];
			}
			metaObj[match[1]].push(match[2].trim());
		}

		return metaObj;
	}

	function createGrant(meta) {
		var grants = {
			none: true
		};
		if (!meta.grant) {
			return grants;
		}
		var i;
		for (i = 0; i < meta.grant.length; i++) {
			grants[meta.grant[i]] = true;
		}
		return grants;
	}

	function getStorage() {
		if (!storage) {
			if ("GM_simulator" in localStorage) {
				storage = JSON.parse(localStorage.GM_simulator);
			} else {
				storage = {};
			}
		}
		return storage;
	}

	function saveStorage() {
		localStorage.GM_simulator = JSON.stringify(storage);
	}

	function getValue(key, preValue) {
		var storage = getStorage();
		if (key in storage) {
			return storage[key];
		}
		return preValue;
	}

	function setValue(key, value) {
		getStorage()[key] = value;
		saveStorage();
	}

	function deleteValue(key) {
		delete getStorage()[key];
		saveStorage();
	}

	function listValues() {
		return Object.keys(getStorage());
	}

	function getInfo() {
		if (!GM.script.info) {
			GM.script.info = createScriptInfo(GM.script);
		}
		return GM.script.info;
	}

	function getResourceURL(key) {
		var resources = GM.script.script.resources;
		if (!(key in resources)) {
			throw new Error("Can not find resource: " + key);
		}
		return resources[key];
	}

	function getResourceText(key) {
		var resources = GM.script.resources;
		if (!(key in resources)) {
			throw new Error("Can not find resource: " + key);
		}
		return resources[key];
	}

	function addStyle(css) {
		var style = document.createElement("style");
		style.textContent = css;
		document.head.appendChild(style);
	}

	function log(message) {
		console.log(message);
	}

	function openInTab(url, background) {
		open(url);
		if (background) {
			focus();
		}
	}

	function registerMenuCommand(caption, callback, accessKey) {
		var menuItem = {
			caption: caption,
			callback: callback,
			accessKey: accessKey
		};
		menus.push(menuItem);
		addMenuItem(menuItem);
	}

	function setClipboard(text) {
		prompt("Copy:", text);
	}

	function xmlhttpRequest(detail) {
		var req = new XMLHttpRequest,
			i, key,
			response = {
				content: detail.context,
				finalUrl: detail.url,
				lengthComputable: false,
				loaded: 0,
				total: 0,
				get readyState() {
					return req.readyState;
				},
				get responseHeaders() {
					return req.getAllResponseHeaders();
				},
				get responseText() {
					return req.responseText;
				},
				get status() {
					return req.status;
				},
				get statusText() {
					return req.statusText;
				}
			};

		// Bind detail, response
		function wrap(func) {
			return function() {
				func.call(detail, response);
			};
		}

		if (detail.headers) {
			for (key in detail.headers) {
				req.setRequestHeader(key, detail.headers[key]);
			}
		}

		var events = ["abort", "error", "load", "loadstart", "progress", "timeout", "loadend"];

		events.forEach(function(name){
			if (detail["on" + name]) {
				req["on" + name] = wrap(detail["on" + name]);
			}
		});

		if (detail.overrideMimeType) {
			req.overrideMimeType(detail.overrideMimeType);
		}

		if (detail.timeout) {
			req.timeout = detail.timeout;
		}

		if (detail.upload) {
			events = ["progress", "load", "error", "abort"];
			events.forEach(function(name){
				if ("on" + name in detail.upload) {
					req.upload.addEventListener(name, wrap(detail.upload["on" + name]));
				}
			});
		}

		if (!detail.synchronous && detail.onreadystatechange) {
			req.onreadystatechange = wrap(detail.onreadystatechange);
		}

		req.open(detail.method, detail.url, !detail.synchronous, detail.user, detail.password);

		if (detail.binary) {
			// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
			var data = detail.data,
				ui8Data = new Uint8Array(data.length);

			for (i = 0; i < data.length; i++) {
				ui8Data[i] = data.charCodeAt(i) & 0xff;
			}
			req.send(ui8Data);
		} else {
			req.send(detail.data);
		}

		var ret = {
			abort: function () {
				req.abort();
			}
		};

		if (detail.synchronous) {
			var props = ["finalUrl", "readyState", "responseHeaders", "responseText", "status",
						 "statusText"];

			props.forEach(function(name){
				Object.defineProperty(ret, name, {
					get: function() {
						return response[name];
					}
				});
			});
		}

		return ret;
	}

	function getWindow() {
		return window;
	}

	function getMenu() {
		return document.querySelector("#gm-simulator-menu");
	}

	function addMenuItem(menuObj) {
		var menu = getMenu();
		if (!menu) {
			return;
		}

		var row = document.createElement("tr"),
			item = document.createElement("td");

		item.textContent = menuObj.caption;
		item.className = "gm-simulator-menu-item";
		item.onclick = menuObj.callback;

		row.appendChild(item);
		menu.querySelector(".gm-simulator-menu-body").appendChild(row);
	}

	function createMenu() {
		var menu;

		menu = document.createElement("div");
		menu.id = "gm-simulator-menu";
		menu.innerHTML = "<table><tbody class='gm-simulator-menu-body'></tbody></table>";
		document.body.appendChild(menu);

		menus.forEach(addMenuItem);

		return menu;
	}

	function showMenu(e) {
		if (!menus.length) {
			return;
		}
		if (e.shiftKey || e.altKey || e.ctrlKey) {
			return;
		}

		var menu = getMenu();

		if (!menu) {
			menu = createMenu();
		}

		menu.style.display = "block";
		menu.style.left = e.pageX + "px";
		menu.style.top = e.pageY + "px";

		e.preventDefault();
	}

	function hideMenu() {
		var menu = getMenu();
		if (!menu) {
			return;
		}
		menu.style.display = "none";
	}

	function injectScriptUrl(url, done) {
		var element = document.createElement("script");
		if (done) {
			element.onload = done;
		}
		element.src = url;
		element.IS_INJECTED = true;
		document.head.appendChild(element);
		return element;
	}

	function injectScript(script) {
		if (script.injected || !script.info) {
			return;
		}
		if (script.info.script["run-at"] == "document-end" && document.readyState == "loading") {
			return;
		}
		script.injected = true;
		script.element = injectScriptUrl(script.url);
	}

	// This is a decorator. Check grant value before calling the function
	function checkGrant(name, func) {
		return function() {
			if (name in GM.script.grants || name == "GM_info") {
				return func.apply(0, arguments);
			} else {
				alert("Need grant @" + name + "!");
				return null;
			}
		};
	}

	// Collect userscripts
	if ("onbeforescriptexecute" in document) {
		document.addEventListener("beforescriptexecute", function(e){
			if (e.target.parentNode == document.head) {
				beforeExecute(e.target, function(){
					e.preventDefault();
					e.target.parentNode.removeChild(e.target);
				});
			}
		});
	} else {
		new MutationObserver(function(e){
			var i, nodes = [];
			for (i = 0; i < e.length; i++) {
				nodes.push.apply(nodes, e[i].addedNodes);
			}
			nodes.forEach(function(node){
				if (node.nodeName == "SCRIPT") {
					beforeExecute(node, function(){
						node.parentNode.removeChild(node);
					});
				}
			});
		}).observe(document.head, {
			childList: true,
			subtree: true
		});
	}

	// Handle context menu
	document.addEventListener("contextmenu", showMenu);
	document.addEventListener("click", hideMenu);

	// Handle document-end scripts
	document.addEventListener("DOMContentLoaded", function(){
		injectScript(GM.script);
	});

	var apis = [
		["GM_info", getInfo, "PROP"],
		["GM_setValue", setValue, "FUNC"],
		["GM_getValue", getValue, "FUNC"],
		["GM_deleteValue", deleteValue, "FUNC"],
		["GM_listValues", listValues, "FUNC"],
		["GM_getResourceText", getResourceText, "FUNC"],
		["GM_getResourceURL", getResourceURL, "FUNC"],
		["GM_addStyle", addStyle, "FUNC"],
		["GM_log", log, "FUNC"],
		["GM_openInTab", openInTab, "FUNC"],
		["GM_registerMenuCommand", registerMenuCommand, "FUNC"],
		["GM_setClipboard", setClipboard, "FUNC"],
		["GM_xmlhttpRequest", xmlhttpRequest, "FUNC"],
		["unsafeWindow", getWindow, "PROP"]
	];

	var targets = [window, GM];

	targets.forEach(function(target){
		apis.forEach(function(api){
			var descriptor;
			if (api[2] == "PROP") {
				descriptor = {
					get: checkGrant(api[0], api[1])
				};
			} else {
				descriptor = {
					value: checkGrant(api[0], api[1])
				};
			}
			Object.defineProperty(target, api[0], descriptor);
		});
	});

	return GM;
}();

