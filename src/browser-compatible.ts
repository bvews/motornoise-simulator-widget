type Browser = 'msie' | 'edge' | 'chrome' | 'safari' | 'firefox' | 'opera' | 'unknown';
type AudioExtention = '.ogg' | '.mp4';

export class BrowserCompatible {
    private _browser: Browser;
    private _audioFileExtension: AudioExtention;

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
    setSpan(sourceNode: AudioBufferSourceNode, duration: number): void { }
    
    public get browser(): Browser {
        return this._browser;
    }
    public get audioFileExtension(): AudioExtention {
        return this._audioFileExtension;
    }
}