class AudioContextHandler {
    constructor() {
        try {
            // Fix up prefixing
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            /** @type {AudioContext} */
            this.audioContext = new AudioContext();
            /** @type {boolean} */
            this.enabledWebAudioApi = true;
        } catch (e) {
            console.warn('Web Audio API is not supported in this browser.');
            /** @type {AudioContext} */
            this.audioContext = null;
            /** @type {boolean} */
            this.enabledWebAudioApi = false;
        }
    }
}