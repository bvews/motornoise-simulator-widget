// AudioContext and webkitAudioContext missing in Window definition in lib.dom.d.ts #31686
// https://github.com/microsoft/TypeScript/issues/31686#issuecomment-636257758
declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}

export class AudioContextHandler {
    private audioContext?: AudioContext;
    public enabledWebAudioApi = false;
    constructor() {
        try {
            // Fix up prefixing
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.enabledWebAudioApi = true;
        } catch (e) {
            console.warn('Web Audio API is not supported in this browser.');
            this.audioContext = undefined;
            this.enabledWebAudioApi = false;
        }
    }
}