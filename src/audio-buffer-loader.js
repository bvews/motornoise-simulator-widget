/**
 * 
 * @param {AudioContext} context 
 * @param {string[]} urlList 
 * @param {EventListener} callback 
 */
class BufferLoader {
    constructor(context, urlList, callback, extention) {
        /** @type {AudioContext} */
        this.context = context;
        /** @type {string[]} */
        this.urlList = urlList;
        /** @type {EventListener} */
        this.onload = callback;
        /** @type {AudioBuffer[]} */
        this.bufferList = new Array();
        /** @type {number[]} */
        this.durationList = new Array();
        /** @type {number} */
        this.loadCount = 0;

        this.soundParams = '';
    }

    // -------------------- Public methods.

    load() {
        for (let i = 0; i < this.urlList.length; ++i) {
            this.loadBuffer(this.urlList[i], i);
        }
    }

    // -------------------- Private methods.

    /**
     * 
     * @param {string} url 
     * @param {number} index 
     */
    loadBuffer(url, index) {
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
}

function audioBufferLoader(audioContext, audioEntries, onload, onupdate) {
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
                    entry.buffer = null;
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
                entry.buffer = null;
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
            entry.buffer = null;
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