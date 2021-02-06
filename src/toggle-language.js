(() => {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const lang = (navigator.browserLanguage || navigator.language || navigator.userLanguage).substr(0, 2);
            if (lang !== 'ja') {
                Array.prototype.forEach.call(document.getElementsByClassName('lang-ja'), ({style}) => { style.display = 'none'; });
                Array.prototype.forEach.call(document.getElementsByClassName('lang-en'), ({style}) => { style.display = ''; });
            }
        }
        catch (e) { }
    }, false)
})();