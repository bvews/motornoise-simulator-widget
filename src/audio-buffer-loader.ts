import { AudioEntry } from './audio-entry';

class BufferLoader {
    private context: AudioContext;
    private urlList: string[] = [];
    private bufferList: AudioBuffer[] = [];
    private durationList: number[] = [];
    private loadCount = 0;
    private soundParams = '';
    private onload: (bufferList?: AudioBuffer[]) => void;

    /**
     * 
     * @param context 
     * @param urlList 
     * @param callback 
     * @param extension
     */
    constructor(context: AudioContext, urlList: string[], callback: (bufferList?: AudioBuffer[]) => void, extension: string) {
        this.context = context;
        this.urlList = urlList;
        this.onload = callback;
        this.bufferList = [];
        this.durationList = [];
        this.loadCount = 0;

        this.soundParams = '';
    }

    // -------------------- Public methods.

    load(): void {
        for (let i = 0; i < this.urlList.length; ++i) {
            this.loadBuffer(this.urlList[i], i);
        }
    }

    // -------------------- Private methods.

    /**
     * 
     * @param url 
     * @param index 
     */
    loadBuffer(url: string, index: number): void {
        const duration = parseFloat(url.split(',')[1]) || 0;
        url = url.split(',')[0];

        // Load buffer asynchronously
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';

        const loader = this;

        request.onload = () => {
            // Get audio duration.
            /*
            let duration = 0;
            duration = getVorbisAudioLength(request.response);
            loader.soundParams += url + ', ' + duration + '\r\n';
            */

            // Asynchronously decode the audio file data from arrayBufferrequest.response
            loader.context.decodeAudioData(
                request.response,
                buffer => {
                    if (!buffer) {
                        console.error(`error decoding file data: ${url}`);
                        return;
                    }

                    loader.bufferList[index] = buffer;
                    loader.durationList[index] = duration;
                    loader.loadCount++;
                    if (loader.onupdate) {
                        // Report progress.
                        loader.onupdate(loader.loadCount, loader.urlList.length);
                    }
                    if (loader.loadCount === loader.urlList.length) {
                        // Process after files load complete.
                        loader.onload(loader.bufferList);
                        /* console.log(loader.soundParams); */
                    }
                },
                error => {
                    console.error('decodeAudioData error', error);
                }
            );
        }

        request.onerror = () => {
            console.error('BufferLoader: XHR error');
        }

        request.setRequestHeader('Cache-Control', 'no-cache');
        request.send();
    }
    
    private onupdate: (loadCount: number, entryCount: number) => void = (loadCount, entryCount) => { };
}

function audioBufferLoader(audioContext: AudioContext, audioEntries: AudioEntry[], onload: (entries?: AudioEntry[]) => void, onupdate: (loadCount: number, entryCount: number) => void): void {
    let loadCount = 0;
    const audioCount = audioEntries.length;
    onupdate(loadCount, audioCount);

    audioEntries.forEach(entry => {
        // Load buffer asynchronously
        const request = new XMLHttpRequest();
        request.open('GET', entry.url, true);
        request.responseType = 'arraybuffer';
        request.onload = () => {
            // Asynchronously decode the audio file data from arrayBufferrequest.response
            audioContext.decodeAudioData(request.response, buffer => {
                loadCount++;

                if (!buffer) {
                    console.error(`Error decoding file data: ${entry.url}`);
                    entry.buffer = undefined;
                } else {
                    entry.buffer = buffer;
                }

                if (onupdate) {
                    // Report progress.
                    onupdate(loadCount, audioCount);
                }
                if (loadCount >= audioCount) {
                    onload(audioEntries);
                }
            }, error => {
                loadCount++;
                entry.buffer = undefined;
                console.error('decodeAudioData error', error);

                if (onupdate) {
                    // Report progress.
                    onupdate(loadCount, audioCount);
                }
                if (loadCount >= audioCount) {
                    onload(audioEntries);
                }
            });
        }
        request.onerror = () => {
            loadCount++;
            entry.buffer = undefined;
            console.error('BufferLoader: XHR error');

            if (onupdate) {
                // Report progress.
                onupdate(loadCount, audioCount);
            }
            if (loadCount >= audioCount) {
                onload(audioEntries);
            }
        }
        request.setRequestHeader('Cache-Control', 'no-cache');
        request.send();
    });
}