/**
 * 
 * @param {AudioContext} context 
 * @param {string[]} urlList 
 * @param {EventListener} callback 
 */
function BufferLoader(context, urlList, callback, extention) {
    'use strict';
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

BufferLoader.prototype.load = function () {
    'use strict';
    for (var i = 0; i < this.urlList.length; ++i) {
        this.loadBuffer(this.urlList[i], i);
    }
}

// -------------------- Private methods.

/**
 * 
 * @param {string} url 
 * @param {number} index 
 */
BufferLoader.prototype.loadBuffer = function (url, index) {
    'use strict';
    const duration = parseFloat(url.split(',')[1]) || 0;
    url = url.split(',')[0];

    // Load buffer asynchronously
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    const loader = this;

    request.onload = function () {
        // Get audio duration.
        /*
        let duration = 0;
        duration = getVorbisAudioLength(request.response);
        loader.soundParams += url + ', ' + duration + '\r\n';
        */

        // Asynchronously decode the audio file data from arrayBufferrequest.response
        loader.context.decodeAudioData(
            request.response,
            function (buffer) {
                if (!buffer) {
                    console.error('error decoding file data: ' + url);
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
            function (error) {
                console.error('decodeAudioData error', error);
            }
        );
    }

    request.onerror = function () {
        console.error('BufferLoader: XHR error');
    }

    request.setRequestHeader('Cache-Control', 'no-cache');
    request.send();
}