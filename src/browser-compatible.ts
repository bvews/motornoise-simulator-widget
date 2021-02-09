export class BrowserCompatible {
    private browser: string | undefined;
    private audioFileExtention: string | undefined;
    constructor() {
        this.browser = undefined;
        this.audioFileExtention = undefined;

        const userAgent = window.navigator.userAgent.toLowerCase();
        if (userAgent.includes('msie') || userAgent.includes('trident')) {
            this.browser = 'msif';
        } else if (userAgent.includes('edge')) {
            this.browser = 'edge';
        } else if (userAgent.includes('chrome')) {
            this.browser = 'chrome';
        } else if (userAgent.includes('safari')) {
            this.browser = 'safari';
        } else if (userAgent.includes('firefox')) {
            this.browser = 'firefox';
        } else if (userAgent.includes('opera')) {
            this.browser = 'opera';
        } else {
            this.browser = undefined;
        }

        //if (this.browser === 'safari' || this.browser === 'chrome' || this.browser === 'firefox') {
        if (this.browser === 'safari') {
            this.audioFileExtention = '.mp4';
            this.setSpan = (sn, d) => {
                sn.loopEnd = d * 1.5;
                sn.loopStart = d * 0.5;
            };
        } else {
            this.audioFileExtention = '.ogg';
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