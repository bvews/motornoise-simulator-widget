(function () {
    document.addEventListener('DOMContentLoaded', function () {
        'use strict';
        try {
            const lang = (navigator.browserLanguage || navigator.language || navigator.userLanguage).substr(0, 2);
            if (lang !== 'ja') {
                Array.prototype.forEach.call(document.getElementsByClassName('lang-ja'), function (e) { e.style.display = 'none'; });
                Array.prototype.forEach.call(document.getElementsByClassName('lang-en'), function (e) { e.style.display = ''; });
            }
        }
        catch (e) { }
    }, false)
})();