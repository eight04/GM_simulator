// ==UserScript==
// @name            Test GM_simulator
// @namespace       eight04.blogspot.com
// @description     Just a testing script.
// @version         0.1.0
// @author          eight
// @license         MIT
// @resource        sourceCode https://rawgit.com/eight04/GM_simulator/master/test.user.js
// @include         *
// @grant           GM_addStyle
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_registerMenuCommand
// ==/UserScript==

var config = GM_config.init("GM Simulator", {
	test1: {
		label: "Test checkbox",
		type: "checkbox",
		default: true
	},
	test2: {
		label: "Test number",
		type: "number",
		default: 999
	},
	test3: {
		label: "Test text",
		type: "text",
		default: "Some text..."
	},
	test4: {
		label: "Test textarea",
		type: "textarea",
		default: "Line 1...\nLine 2...\nLine 3..."
	}
});
GM_config.onclose = showConfig;

function showConfig() {
	config = GM_config.get();
	document.querySelector(".show-config").textContent = JSON.stringify(config, null, 4);
}

function showInfo() {
	document.querySelector(".show-info").textContent = JSON.stringify(GM_info, null, 4);
}

function showResource() {
	document.querySelector(".show-resource").textContent = GM_getResourceText("sourceCode");
}

GM_registerMenuCommand("GM simulator tester - configure", function(){
	GM_config.open();
});

showConfig();
showInfo();
showResource();
