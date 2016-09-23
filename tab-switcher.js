'use strict';

$(document).ready(function () {

    var MAIN_TEMPLATE = '<div class="tab-switcher" style="display: none;">' +
                            '<input type="text">' +
                            '<ul class="tabs-list">' +
                            '</ul>' +
                        '</div>',
        TAB_SWITCHER  = '.tab-switcher',
        DOWN_KEY      = 40,
        UP_KEY        = 38,
        ESCAPE_KEY    = 27,
        ENTER_KEY     = 13,
        SEMICOLON_KEY = 186,
        allTabs       = [],
        HOLDER_IMG    = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAMklEQVR4AWMgEkT9R4INWBUgKX0Q1YBXQYQCkhKEMDILogSnAhhEV4AGRqoCTEhkPAMAbO9DU+cdCDkAAAAASUVORK5CYII=',
        MASTER_KEY    = '⌘+⇧+k, ⌃+⇧+k',
        TAB_TEMPLATE  = '<li data-tab-id="{id}" data-window-id="{windowId}" class="tab-item">' +
                            '<img src="{favicon}" class="left" onerror="this.src=\'' + HOLDER_IMG + '\'">' +
                            '<span>{title}</span>' +
                        '</li>';

    function loadExtension() {
        var $html = $('html');
        var $document = $(document);

        $html.append(MAIN_TEMPLATE);

        bindUI();
    }

    function bindUI() {
        var $tabSwitcher = $(TAB_SWITCHER);

        // mouse-down instead of click because click gets triggered after the blur event in which case tab
        // switcher would already be hidden (@see blur event below) and click will not be performed
        $(document).on('mousedown', TAB_SWITCHER + ' .tab-item', function () {
            var $this = $(this),
                tabId = $this.data('tabId'),
                windowId = $this.data('windowId');

            switchToTab(tabId, windowId);
        });

        $(document).on('blur', TAB_SWITCHER, function () {
            $tabSwitcher.hide();
            $tabSwitcher.find('input').val('');
        });

        $(document).on('keydown', function (e) {

            var keyCode = e.keyCode,
                goingUp        = (keyCode === UP_KEY),
                goingDown      = (keyCode === DOWN_KEY),
                escaping       = (keyCode === ESCAPE_KEY),
                switchingTab   = (keyCode === ENTER_KEY),
                closingTab     = (keyCode === SEMICOLON_KEY),
                $firstSelected = $tabSwitcher.find('.tab-item.selected-tab').first();

            // Switcher was visible and either down or up key was pressed
            if ($tabSwitcher.is(':visible')) {

                if ((goingUp || goingDown)) {
                    var $firstTab      = $tabSwitcher.find('.tab-item').first(),
                        $lastTab       = $tabSwitcher.find('.tab-item').last(),
                        $nextSelected;

                    if ($firstSelected.length === 0) {
                        $nextSelected = $firstTab.addClass('selected-tab');
                    } else {
                        $firstSelected.removeClass('selected-tab');

                        var $nextTab = $firstSelected.next('.tab-item'),
                            $prevTab = $firstSelected.prev('.tab-item');

                        if (goingDown) {

                            if ($nextTab.length !== 0) {
                                $nextSelected = $nextTab.addClass('selected-tab');
                            } else {
                                $nextSelected = $firstTab.addClass('selected-tab');
                            }

                        } else if (goingUp) {
                            if ($prevTab.length !== 0) {
                                $nextSelected = $prevTab.addClass('selected-tab');
                            } else {
                                $nextSelected = $lastTab.addClass('selected-tab');
                            }
                        }
                    }

                    $nextSelected.get(0).scrollIntoViewIfNeeded();
                } else if (escaping) {
                    $tabSwitcher.hide();
                } else if (switchingTab && $firstSelected.length !== 0) {
                    switchToTab($firstSelected.data('tabId'), $firstSelected.data('windowId'));
                } else if (closingTab && $firstSelected.length !== 0) {
                    e.preventDefault();

                    if (closeTab($firstSelected.data('tabId'))) {
                        $firstSelected.remove();
                    }
                }
            }
        });

        $(document).on('keyup', TAB_SWITCHER + ' input', function (e) {

            var keyCode = e.keyCode,
                goingUp        = (keyCode === UP_KEY),
                goingDown      = (keyCode === DOWN_KEY),
                escaping       = (keyCode === ESCAPE_KEY),
                switchingTab   = (keyCode === ENTER_KEY),
                closingTab     = (keyCode === SEMICOLON_KEY);

            if (!goingUp && !goingDown && !escaping && !switchingTab && !closingTab) {
                var keywords = $(this).val();

                if ($.trim(keywords) !== '') {
                    filterTabs(keywords);
                } else {
                    populateTabs(allTabs);
                }
            }

        });

        key(MASTER_KEY, function () {
            $(TAB_SWITCHER).show().find('input').focus();
            fetchTabs();
        });
    }

    function getTabsHtml(tabs) {
        var tabsHtml = '';
        tabs.forEach(function(tab){

            var tempTabTemplate = TAB_TEMPLATE,
                faviconUrl = tab.favIconUrl || HOLDER_IMG;

            tempTabTemplate = tempTabTemplate.replace('{favicon}', faviconUrl);
            tempTabTemplate = tempTabTemplate.replace('{title}', tab.title);
            tempTabTemplate = tempTabTemplate.replace('{id}', tab.id);
            tempTabTemplate = tempTabTemplate.replace('{windowId}', tab.windowId);

            tabsHtml += tempTabTemplate;
        });

        return tabsHtml;
    }

    function fetchTabs() {
        chrome.extension.sendMessage({ type: 'getTabs' }, function(tabs) {
            if (!tabs) {
                return false;
            }

            // Cache the tabs, this is the list, we will be filtering
            allTabs = tabs;

            populateTabs(tabs);
        });
    }

    function filterTabs(keywords) {

        keywords = keywords.toLowerCase();

        var matches   = [],
            tempTitle = '',
            tempUrl   = '';

        allTabs.map(function (tab) {
            tempTitle = tab.title.toLowerCase();
            tempUrl   = tab.url.toLowerCase();

            if (tempTitle.match(keywords) || tempUrl.match(keywords)) {
                matches.push(tab);
            }
        });

        populateTabs(matches);
    }

    function populateTabs(tabs) {
        var tabsHtml = getTabsHtml(tabs);
        $('.tabs-list').html(tabsHtml);
        $('.tabs-list').find('li').first().addClass('selected-tab');
    }

    function switchToTab(tabId, windowId) {
        chrome.extension.sendMessage({
            type: 'switchTab',
            params: {
                tabId: tabId,
                windowId: windowId
            }
        }, function(res) {});
    }

    function closeTab(tabId) {

        chrome.extension.sendMessage({
            type: 'closeTab',
            params: {
                tabId: tabId
            }
        }, function(res) {});

        return true;
    }

    loadExtension();
});
