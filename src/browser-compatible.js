function BrowserCompatible() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.indexOf('msie') != -1 || userAgent.indexOf('trident') != -1) {
        this.browser = 'msif';
    } else if (userAgent.indexOf('edge') != -1) {
        this.browser = 'edge';
    } else if (userAgent.indexOf('chrome') != -1) {
        this.browser = 'chrome';
    } else if (userAgent.indexOf('safari') != -1) {
        this.browser = 'safari';
    } else if (userAgent.indexOf('firefox') != -1) {
        this.browser = 'firefox';
    } else if (userAgent.indexOf('opera') != -1) {
        this.browser = 'opera';
    } else {
        this.browser = undefined;
    }

    //if (this.browser === 'safari' || this.browser === 'chrome' || this.browser === 'firefox') {
    if (this.browser === 'safari') {
        this.audioFileExtention = '.mp4';
        this.setSpan = function (sn, d) {
            sn.loopEnd = d * 1.5;
            sn.loopStart = d * 0.5;
        };
    } else {
        this.audioFileExtention = '.ogg';
        this.setSpan = function (sn, d) {
            sn.loopEnd = d;
            sn.loopStart = 0;
        };
    }
}
BrowserCompatible.prototype = {
    /** @type {string} */
    browser: undefined,
    /** @type {string} */
    audioFileExtention: null,
    /**
     * 
     * @param {AudioBufferSourceNode} sourceNode
     * @param {number} duration 
     */
    setSpan: function (sourceNode, duration) { }
};