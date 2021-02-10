export class BrowserCompatible {
    private _browser: string | undefined;
    private _audioFileExtention: string | undefined;
    public get browser(): string | undefined {
        return this._browser;
    }
    public get audioFileExtention(): string | undefined {
        return this._audioFileExtention;
    }
    constructor() {
        this._browser = undefined;
        this._audioFileExtention = undefined;

        const userAgent = window.navigator.userAgent.toLowerCase();
        if (userAgent.includes('msie') || userAgent.includes('trident')) {
            this._browser = 'msif';
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
            this._audioFileExtention = '.mp4';
            this.setSpan = (sn, d) => {
                sn.loopEnd = d * 1.5;
                sn.loopStart = d * 0.5;
            };
        } else {
            this._audioFileExtention = '.ogg';
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