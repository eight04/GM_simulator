GM_simulator
============
Create a greasemonkey-like environment in browser for testing.

Support Firefox, Google Chrome.

Usage
-----
Put GM_simulator in `<head>` before your userscript.
```
<link rel="stylesheet" href="https://rawgit.com/eight04/GM_simulator/master/simulator.css">
<script src="https://rawgit.com/eight04/GM_simulator/master/simulator.js"></script>
<script src="my-userscript.user.js"></script>
```
The script will export a `window.GM` object, which contains `GM_*` APIs. These `GM_*` methods and properties are also added to `window` so the userscript can see them.

Live example
------------
<https://rawgit.com/eight04/GM_simulator/master/test.html>

How does it work
----------------
1. Detect userscript with `.user.js` extension.
2. Stop script execution and use ajax to get the source.
3. Parse GM_info and re-insert the script element.

Known restriction
-----------------
* This simulator was created to support multiple scripts. But sometimes it is hard to detect which script is runnung. (E.g. register a callback on document.body wich calls GM_setValue)
* Cross-domain request restriction.
* Userscript might execute AFTER page loaded. DOMContentLoaded will not fire in such situation.

Todos
-----
* Support IE?
* Currently we doesn't insure the execution order of injected script. Fix this!!
