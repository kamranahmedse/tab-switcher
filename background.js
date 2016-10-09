'use strict';

chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {

    var handler = {

        /**
         * Gets all the opened tabs
         *
         * @returns {boolean}
         */
        getTabs: function () {
            chrome.tabs.query({}, function (tabs) {
                sendResponse(tabs);
            });

            return true;
        },

        /**
         * Switches the browser tab to the one with required tabId
         *
         * @param params
         * @returns {boolean}
         */
        switchTab: function (params) {
            chrome.tabs.update(params.tabId, {active: true}, function () {
                chrome.windows.update(params.windowId, {focused: true});
            });

            return true;
        },

        /**
         * Toggle pinned state of the the currently selected browser tab
         */
        togglePin: function (params) {
            chrome.tabs.get(params.tabId, function (tab) {
                chrome.tabs.update(params.tabId, {pinned: !tab.pinned}, function () {
                    chrome.windows.update(params.windowId, {focused: true});
                    return true;
                });
                return true;
            });

            return true;
        },

        /**
         * Closes the tab with passed tabId
         *
         * @param params
         * @returns {boolean}
         */
        closeTab: function (params) {
            chrome.tabs.remove(params.tabId);
            return true;
        }

    };

    return handler[req.type](req.params);

});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {

    if (changeInfo.status !== 'loading')
        return;

    // Inject the required assets
    chrome.tabs.executeScript(tabId, {
        code: 'var injected = window.tabSwitcherInjected; window.tabSwitcherInjected = true; injected;',
        runAt: 'document_start'
    }, function (res) {

        if (chrome.runtime.lastError ||  // don't continue if error
            res[0]) // value of `injected` above: don't inject twice
            return;

        var cssFiles = [
                'assets/css/tab-switcher.css'
            ],
            jsFiles = [
                'assets/lib/sanitize-html.js',
                'assets/lib/jquery.js',
                'assets/lib/keymaster.js',
                'tab-switcher.js'
            ];

        eachTask([function (cb) {
            return eachItem(cssFiles, inject('insertCSS'), cb);
        }, function (cb) {
            return eachItem(jsFiles, inject('executeScript'), cb);
        }]);

        function inject(fn) {
            return function (file, cb) {
                chrome.tabs[fn](tabId, {file: file, runAt: 'document_start'}, cb);
            };
        }
    });

});

function eachTask(tasks, done) {
    (function next() {
        var index = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

        if (index === tasks.length) {
            done && done();
        } else {
            tasks[index](function () {
                return next(++index);
            });
        }
    })();
}

function eachItem(arr, iter, done) {
    var tasks = arr.map(function (item) {
        return function (cb) {
            return iter(item, cb);
        };
    });
    return eachTask(tasks, done);
}
