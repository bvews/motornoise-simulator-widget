function AudioContextHandler() {
    try {
        // Fix up prefixing
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        this.enabledWebAudioApi = true;
    }
    catch (e) {
        console.warn('Web Audio API is not supported in this browser.');
        this.audioContext = null;
        this.enabledWebAudioApi = false;
    }
}
AudioContextHandler.prototype = {
    /** @type {AudioContext} */
    audioContext: null,
    /** @type {boolean} */
    enabledWebAudioApi: false
};