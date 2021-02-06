/**
 * 
 * @param {ArrayBuffer} arrayBuffer
 * @returns {number} - Audio duration [sec].
 */
function getVorbisAudioLength(arrayBuffer) {
    'use strict';
    const dataView = new DataView(arrayBuffer);
    const byteLength = dataView.byteLength;

    /**
     * 
     * @param {DataView} dataView 
     * @param {number} byteLength 
     * @param {number} pos 
     * @param {string[]} query
     * @returns {boolean} 
     */
    const findIndex = function (dataView, byteLength, pos, query) {
        for (var i = 0; i < query.length; i++) {
            if (pos + i >= byteLength || dataView.getUint8(pos + i) !== query[i]) {
                return false;
            }
        }
        return true;
    };

    const queryOggs = [0x4F, 0x67, 0x67, 0x53, 0x00, 0x04]; // 'O g g S 0x00 0x04'
    const queryVorbis = [0x01, 0x76, 0x6F, 0x72, 0x62, 0x69, 0x73]; // '0x01 v o r b i s'

    let posVorbis = -1;
    let posOggs = -1;
    for (var i = 0; i < byteLength; i++) {
        if (findIndex(dataView, byteLength, i, queryVorbis)) {
            posVorbis = i;
        }
        if (findIndex(dataView, byteLength, i, queryOggs)) {
            posOggs = i;
        }
    }

    let sampleRate = 1;
    let sampleCount = 0;

    if (posVorbis !== -1 && posOggs !== -1) {
        sampleRate = dataView.getUint32(posVorbis + 12, true);
        sampleCount = dataView.getUint32(posOggs + 6, true); // Acturally 64bit value
    }
    return sampleCount / sampleRate;
}