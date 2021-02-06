function loadImages(imageEntries, onload, onupdate) {
    if (!imageEntries) {
        if (onload) {
            onload();
        }
        return;
    }

    let loadCount = 0;
    const imageCount = imageEntries.length;
    onupdate(loadCount, imageCount);

    imageEntries.forEach(function (entry) {
        const image = new Image();
        image.onload = function () {
            entry.image = image;

            loadCount++;
            if (onupdate) {
                onupdate(loadCount, imageCount);
            }
            if (loadCount >= imageCount) {
                onload(imageEntries);
            }
        };
        image.onerror = function () {
            entry.image = null;

            loadCount++;
            if (onupdate) {
                onupdate(loadCount, imageCount);
            }
            if (loadCount >= imageCount) {
                onload(imageEntries);
            }
        }
        image.src = entry.url;
    });
}

function loadAudios(audioContext, audioEntries, onload, onupdate) {
    if (!audioContext || !audioEntries) {
        if (onload) {
            onload();
        }
        return;
    }
    
    let loadCount = 0;
    const audioCount = audioEntries.length;
    onupdate(loadCount, audioCount);

    audioEntries.forEach(function (entry) {
        // Load buffer asynchronously
        const request = new XMLHttpRequest();
        request.open('GET', entry.url, true);
        request.responseType = 'arraybuffer';
        request.onload = function () {
            // Asynchronously decode the audio file data from arrayBufferrequest.response
            audioContext.decodeAudioData(request.response, function (buffer) {
                loadCount++;

                if (!buffer) {
                    console.error('Error decoding file data: ' + entry.url);
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
            }, function (error) {
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
        request.onerror = function () {
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