var GM = function(){

	"use strict";

	var scripts = {},
		storage,
		menus = [],
		currentScript;

	function isGMScript(script) {
		if (!script.src || script.src.lastIndexOf(".user.js") != script.src.length - 8) {
			return false;
		}
		return true;
	}

	function beforeExecute(script, stopExecute) {
		if (!isGMScript(script)) {
			return;
		}
		if (script.src in scripts) {
			return;
		}

		stopExecute();

		var scriptObj = {
			element: script,
			url: script.src
		};

		scripts[script.src] = scriptObj;

		createScriptInfo(scriptObj, function(){
			var resources = scriptObj.info.script.resources,
				count = 0;

			scriptObj.resources = {};

			Object.keys(resources).forEach(function(key){
				count++;
				xmlhttpRequest({
					method: "GET",
					url: resources[key],
					onload: function(response) {
						scriptObj.resources[key] = response.responseText;
						count--;
						if (!count) {
							injectScript(scriptObj);
						}
					}
				});
			});

			if (!count) {
				injectScript(scriptObj);
			}
		});

		currentScript = scriptObj;
	}

	function addResouce(resource, list) {
		var i, line;
		for (i = 0; i < list.length; i++) {
			line = list[i].split(/\s+/);
			resource[line[0]] = line[1];
		}
	}

	function createInfoScript(meta) {
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
					addResouce(infoScript, values);
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

	function parseMeta(meta) {
		var re = /^\/\/ @(\S+)(.+)$/gm,
			metaObj = {},
			match;

		while ((match = re.exec(meta))) {
			if (!(meta[1] in metaObj)) {
				metaObj[meta[1]] = [];
			}
			metaObj[meta[1]].push(match[2].trim());
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

	function createScriptInfo(script, callback) {
		xmlhttpRequest({
			method: "GET",
			url: script.url,
			onload: function(response){
				var meta;

				script.source = response.responseText;

				meta = script.source.match(/^\/\/ ==UserScript==[^]+?^\/\/ ==\/UserScript==/m);

				if (!meta) {
					throw "Can not read meta data from " + script.url;
				}
				meta = meta[0];

				script.meta = parseMeta(meta);

				script.grants = createGrant(script.meta);

				script.info = {
					script: createInfoScript(script.meta),
					scriptMetaStr: meta,
					scriptWillUpdate: false,
					version: "GM Simulator"
				};

				callback();
			}
		});
	}

	function getRawStack() {
		var err = new Error;
		if (err.stack) {
			return err.stack;
		}
		try {
			throw err;
		} catch (e) {
			return e.stack;
		}
	}

	function urljoin(base, url) {
		if (url[0] == "/") {
			return base.match(/^.+?:\/\/[^\/]+/)[0] + url;
		}
		if (/^https?:\/\//.test(url)) {
			return url;
		}
		return base.match(/^(.+?\/)[^\/]*$/)[1] + url;
	}

	function getStack() {
		var raw = getRawStack(),
			swap = [],
			re = /^(?:\s+at)? ?([^@\n]*)?[@ ]\(?(.+?):\d+:\d+\)?$/gm,
			match;

		while ((match = re.exec(raw))) {
			swap.push({
				name: match[1],
				file: urljoin(location.href, match[2])
			});
		}

		return swap;
	}

	function getCurrentScript() {
		var stack = getStack(),
			i;

		for (i = 0; i < stack.length; i++) {
			if (stack[i].file in scripts) {
				return scripts[stack[i].file];
			}
		}

		return null;
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

	function getInfo(script) {
		if (!script.info) {
			script.info = createScriptInfo(script);
		}
		return script.info;
	}

	function getResourceURL(script, key) {
		var resources = getInfo(script).script.resources;
		if (!(key in resources)) {
			throw Error;
		}
		return resources[key];
	}

	function getResourceText(script, key) {
		var resources = script.resources;
		if (!(key in resources)) {
			throw Error;
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

		if (detail.headers) {
			for (key in detail.headers) {
				req.setRequestHeader(key, detail.headers[key]);
			}
		}

		var events = ["abort", "error", "load", "loadstart", "progress", "timeout", "loadend"];

		events.forEach(function(name){
			if (detail["on" + name]) {
				req["on" + name] = function(){
					detail["on" + name](response);
				};
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
					req.upload.addEventListener(name, function(){
						detail.upload["on" + name](response);
					});
				}
			});
		}

		if (!detail.synchronous && detail.onreadystatechange) {
			req.onreadystatechange = function () {
				detail.onreadystatechange(response);
			};
		}

		function abort() {
			req.abort();
			if (detail.onabort) {
				detail.onabort(response);
			}
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
			abort: abort
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

	function bindScript(func) {
		return function() {
			var script = getCurrentScript() || currentScript,
				args = [script];

			args.push.apply(args, arguments);
			currentScript = script;

			return func.apply(this, args);
		};
	}

	function bindUrl(func) {
		return function(url) {
			if (!(url in scripts)) {
				throw "Can not find userscript: " + url;
			}
			arguments[0] = scripts[url];
			return func.apply(this, arguments);
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

	function injectScript(script) {
		if (script.injected || !script.info) {
			return;
		}
		if (script.info.script["run-at"] == "document-end" && document.readyState == "loading") {
			return;
		}
		currentScript = script;

		script.element = document.createElement("script");
		script.element.src = script.url;
		script.injected = true;

		document.head.appendChild(script.element);
	}

	// Handle context menu
	document.addEventListener("contextmenu", showMenu);
	document.addEventListener("click", hideMenu);

	// Handle document-end scripts
	document.addEventListener("DOMContentLoaded", function(){
		var key;
		for (key in scripts) {
			injectScript(scripts[key]);
		}
	});

	var exports = {
		menus: menus,
		scripts: scripts,
		getInfo: bindUrl(getInfo),
		getValue: getValue,
		setValue: setValue,
		deleteValue: deleteValue,
		listValues: listValues,
		getResourceText: bindUrl(getResourceText),
		getResourceURL: bindUrl(getResourceURL),
		addStyle: addStyle,
		log: log,
		openInTab: openInTab,
		registerMenuCommand: registerMenuCommand,
		setClipboard: setClipboard,
		xmlhttpRequest: xmlhttpRequest,
		getWindow: getWindow
	};

	Object.defineProperties(window, {
		GM_info: {
			get: bindScript(getInfo)
		},
		GM_getValue: {
			value: getValue
		},
		GM_deleteValue: {
			value: deleteValue
		},
		GM_listValues: {
			value: listValues
		},
		GM_setValue: {
			value: setValue
		},
		GM_getResourceText: {
			value: bindScript(getResourceText)
		},
		GM_getResourceURL: {
			value: bindScript(getResourceURL)
		},
		GM_addStyle: {
			value: addStyle
		},
		GM_log: {
			value: log
		},
		GM_openInTab: {
			value: openInTab
		},
		GM_registerMenuCommand: {
			value: registerMenuCommand
		},
		GM_setClipboard: {
			value: setClipboard
		},
		GM_xmlhttpRequest: {
			value: xmlhttpRequest
		},
		unsafeWindow: {
			get: getWindow
		}
	});

	return exports;
}();

