GM_simulator
============
Create a greasemonkey-like environment in browser for testing.

Support Firefox, Google Chrome.

Usage
-----
* Put GM_simulator in `<head>`.
* Put required scripts in `<head>`.
* Put your userscript in `<head>`.
* The script will export a `GM` object.

A simple test file
------------------
[Test page][1]

[1]: https://rawgit.com/eight04/GM_simulator/master/test.html

How does it works
-----------------
1. Detect userscript with `.user.js` extension.
2. Stop script execution and use ajax to get the source.
3. Parse GM_info and re-insert the script element.

Known restriction
-----------------
* This simulator was created to support multiple scripts. But sometimes it is hard to detect which script is runnung. (E.g. register a callback on document.body wich calls GM_setValue)
* Cross-domain request restriction.
* Userscript might execute AFTER page loaded. DOMContentLoaded might be not functioning well.

Todos
-----
* Check @grant before calling APIs.
* Autoload required scripts.
* Do not replace context menu if threre is no registered command.
* Support IE?
* Do not replace context menu if holding modifier keys.
