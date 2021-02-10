import { AudioEntry } from './motornoise-track';

export function loadImages(imageEntries: any[] | undefined, onload: (imageEntries?: any[]) => void, onupdate?: (loadCount: number, entryCount: number) => void): void {
    if (!imageEntries) {
        if (onload) {
            onload();
        }
        return;
    }

    let loadCount = 0;
    const imageCount = imageEntries.length;
    onupdate?.(loadCount, imageCount);

    imageEntries.forEach(entry => {
        const image = new Image();
        image.onload = () => {
            entry.image = image;

            loadCount++;
            if (onupdate) {
                onupdate(loadCount, imageCount);
            }
            if (loadCount >= imageCount) {
                onload(imageEntries);
            }
        };
        image.onerror = () => {
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

export function loadAudios(audioContext: AudioContext, audioEntries: AudioEntry[], onload: (entries?: AudioEntry[]) => void, onupdate: (loadCount: number, entryCount: number) => void): void {
    if (!audioContext || !audioEntries) {
        if (onload) {
            onload();
        }
        return;
    }

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

/**
 * 
 * @param imageEntries 
 * @param onupdate 
 */
export async function loadImagesModern(imageEntries: any[], onupdate: (loadCount: number, entryCount: number) => void): Promise<undefined> {
    if (!imageEntries) {
        return;
    }
    if (typeof onupdate !== 'function') {
        onupdate = () => { };
    }

    const length = imageEntries.length;
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

    function loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.addEventListener('error', function handleError() {
                reject();
            });
            image.addEventListener('load', function handleLoad() {
                image.removeEventListener('load', handleLoad);
                // image.removeEventListener('error', handleError);
                resolve(image);
            });
            image.src = url;
        });
    };
}

/**
 * 
 * @param audioContext 
 * @param audioEntries 
 * @param onupdate 
 */
export async function loadAudiosModern(audioContext: AudioContext, audioEntries: AudioEntry[], onupdate: (loadCount: number, entryCount: number) => void): Promise<undefined> {
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
            entry.buffer = undefined;
            console.error(`Failed to load "${entry.url}".`);
        }
        onupdate(i + 1, length);
    }));

    function decodeAudioData(audioContext: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
        return new Promise<AudioBuffer>((resolve, reject) => {
            audioContext.decodeAudioData(arrayBuffer, audioBuffer => resolve(audioBuffer), () => reject());
        });
    };
}