export class BrowserCompatible {
    private _browser: string | undefined;
    private _audioFileExtension: string | undefined;
    public get browser(): string | undefined {
        return this._browser;
    }
    public get audioFileExtension(): string | undefined {
        return this._audioFileExtension;
    }
    constructor() {
        this._browser = undefined;
        this._audioFileExtension = undefined;

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
            this._browser = undefined;
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
}