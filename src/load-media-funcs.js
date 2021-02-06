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

/**
 * 
 * @param {Array} imageEntries 
 * @param {callback} onupdate 
 */
async function loadImagesModern(imageEntries, onupdate) {
    if (!imageEntries) {
        return;
    }
    if (typeof onupdate !== 'function') {
        onupdate = () => { };
    }

    const length = audioEntries.length;
    onupdate(0, length);
    await Promise.all(imageEntries.map(async (entry, i) => {
        try {
            entry.image = await loadImage(entry.url);
        } catch (e) {
            entry.image = null;
            console.error(`Failed to load "${entry.url}".`);
        }
        onupdate(i + 1, length);
    }));

    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('error', function handleError() {
                reject();
            });
            image.addEventListener('load', function handleLoad() {
                image.removeEventListener('load', handleLoad);
                image.removeEventListener('error', handleError);
                resolve(image);
            });
            image.src = url;
        }, reject => reject(image));
    };
}

/**
 * 
 * @param {AudioContext} audioContext 
 * @param {AudioEntry[]} audioEntries 
 * @param {callback} onupdate 
 */
async function loadAudiosModern(audioContext, audioEntries, onupdate) {
    if (!audioContext || !audioEntries) {
        return;
    }
    if (typeof onupdate !== 'function') {
        onupdate = () => { };
    }

    const length = audioEntries.length;
    onupdate(0, length);
    await Promise.all(audioEntries.map(async (entry, i) => {
        try {
            const response = await fetch(entry.url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await decodeAudioData(audioContext, arrayBuffer);
            entry.buffer = audioBuffer;
        } catch (e) {
            entry.buffer = null;
            console.error(`Failed to load "${entry.url}".`);
        }
        onupdate(i + 1, length);
    }));

    function decodeAudioData(audioContext, arrayBuffer) {
        return new Promise((resolve, reject) => {
            audioContext.decodeAudioData(arrayBuffer, audioBuffer => resolve(audioBuffer), () => reject());
        }, null);
    };
}