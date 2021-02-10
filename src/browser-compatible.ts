type Browser = 'msie' | 'edge' | 'chrome' | 'safari' | 'firefox' | 'opera' | 'unknown';
type AudioExtension = '.ogg' | '.mp4';

/**
 * Browser compatible class.
 */
export class BrowserCompatible {
    private _browser: Browser;
    private _audioFileExtension: AudioExtension;

    constructor() {
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (userAgent.includes('msie') || userAgent.includes('trident')) {
            this._browser = 'msie';
        } else if (userAgent.includes('edge')) {
            this._browser = 'edge';
        } else if (userAgent.includes('chrome')) {
            this._browser = 'chrome';
        } else if (userAgent.includes('safari')) {
            this._browser = 'safari';
        } else if (userAgent.includes('firefox')) {
            this._browser = 'firefox';
        } else if (userAgent.includes('opera')) {
            this._browser = 'opera';
        } else {
            this._browser = 'unknown';
        }

        //if (this.browser === 'safari' || this.browser === 'chrome' || this.browser === 'firefox') {
        if (this._browser === 'safari') {
            this._audioFileExtension = '.mp4';
            this.setSpan = (sn, d) => {
                sn.loopEnd = d * 1.5;
                sn.loopStart = d * 0.5;
            };
        } else {
            this._audioFileExtension = '.ogg';
            this.setSpan = (sn, d) => {
                sn.loopEnd = d;
                sn.loopStart = 0;
            };
        }
    }

    /**
     *
     * @param sourceNode
     * @param duration
     */
    setSpan(sourceNode: AudioBufferSourceNode, duration: number): void {}

    /** Returns string which represents current browser. */
    public get browser(): Browser {
        return this._browser;
    }
    /** Returns extention of audio file which is should be loaded in current browser. */
    public get audioFileExtension(): AudioExtension {
        return this._audioFileExtension;
    }
}
