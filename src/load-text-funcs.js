function loadVehicle(relativeUrl, onload) {
    const files = {
        sound: { url: 'Sound.txt' },
        parameters: { url: 'Parameters.txt' },
        trainDat: { url: 'Train.dat' },
        powerFrequency: { url: 'PowerFreq.csv' },
        powerVolume: { url: 'PowerVol.csv' },
        brakeFrequency: { url: 'BrakeFreq.csv' },
        brakeVolume: { url: 'BrakeVol.csv' },
    };


    const fileCount = Object.keys(files).length;
    let loadCount = 0;

    for (let key in files) {
        const file = files[key];
        fetchText(relativeUrl + file.url, text => {
            file.text = text;
            loadCount++;
            if (loadCount >= fileCount) {
                onload({
                    parameters: parseParameters(files.parameters.text),
                    sound: parseSound(files.sound.text, relativeUrl),
                    motorNoise: {
                        power: {
                            volume: parseCsv(files.powerVolume.text),
                            frequency: parseCsv(files.powerFrequency.text)
                        },
                        brake: {
                            volume: parseCsv(files.brakeVolume.text),
                            frequency: parseCsv(files.brakeFrequency.text)
                        }
                    },
                    trainDat: parseTrainDat(files.trainDat.text)
                });
            }
        });
    }
}

function fetchText(url, onload) {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener('load', event => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            onload(xhr.responseText);
        } else {
            onload('');
        }
    }, false);
    xhr.addEventListener('error', event => {
        onload('');
    }, false);

    xhr.open('GET', url, true);
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.send(null);
}

/**
 * 
 * @param {string} text
 * @returns {Object.<string, Object.<string, string>>}
 */
function parseIni(text) {
    const result = {};

    text = text.replace('\r', '');
    const lines = text.split('\n');
    let section = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.match(/^\[(.+)\]/)) {
            section = line.match(/^\[(.+)\]/)[1].toLowerCase();
            continue;
        }

        const match = line.match(/^(.+?)\s*?=\s*(.+)/);
        if (match) {
            const key = match[1].toLowerCase();
            const value = match[2];

            if (section !== '' && key !== '' && value !== '') {
                if (!result[section]) {
                    result[section] = {};
                }
                result[section][key] = value;
            }
        }
    }

    return result;
}

/**
 * @typedef {Object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * 
 * @param {string} text
 * @returns {Point[]}
 */
function parseCsv(text) {
    const result = [];

    text = text.replace('\r', '');
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const elements = lines[i].split(',');
        for (let j = 0; j < elements.length - 1; j++) {
            const x = parseFloat(elements[0]);
            const y = parseFloat(elements[j + 1]);
            if (!isNaN(x) && !isNaN(y)) {
                if (!result[j]) {
                    result[j] = [];
                }
                result[j].push({ 'x': x, 'y': y });
            }
        }
    }

    return result;
}

function parseSound(text, relativeUrl) {
    const iniData = parseIni(text);
    const result = {
        motor: [],
        run: []
    };

    if (iniData['motor']) {
        const urlList = [];
        for (const key in iniData['motor']) {
            if (!isNaN(key)) {
                result.motor[parseInt(key)] = createAudioEntry(relativeUrl + iniData['motor'][key]);
            }
        }
    }
    if (iniData['run'] && iniData['run']['0']) {
        result.run[0] = createAudioEntry(relativeUrl + iniData['run']['0']);
    }

    return result;
}

function createAudioEntry(text) {
    const items = text.split(',');

    const userAgent = window.navigator.userAgent.toLowerCase();
    let browser;
    if (userAgent.includes('msie') || userAgent.includes('trident')) {
        browser = 'msif';
    } else if (userAgent.includes('edge')) {
        browser = 'edge';
    } else if (userAgent.includes('chrome')) {
        browser = 'chrome';
    } else if (userAgent.includes('safari')) {
        browser = 'safari';
    } else if (userAgent.includes('firefox')) {
        browser = 'firefox';
    } else if (userAgent.includes('opera')) {
        browser = 'opera';
    } else {
        browser = undefined;
    }

    const isSafari = browser === 'safari';
    let extension;
    if (isSafari) {
        extension = '.mp4';
    } else {
        // extension = '.ogg';
        extension = '.mp4';
    }

    const url = items[0].trim() + extension;
    const length = items[1] > 0 ? Number(items[1]) : 0;
    const leeway = extension === '.mp4' ? length / 2 : 0;
    //const leeway = items[2] > 0 ? Number(items[2]) : 0;
    //const leeway = (items[2] > 0 && extension === '.mp4') ? Number(items[2]) : 0;

    return {
        url,
        length,
        leeway
    };
}

function parseParameters(text) {
    const iniData = parseIni(text);
    const result = {
        mainCircuit: {},
        dynamics: {}
    };

    if (iniData['cab']) {
        result.cab = {
            powerNotchCount: isNaN(iniData['cab']['powernotchcount']) ? 5 : parseInt(iniData['cab']['powernotchcount']),
            brakeNotchCount: isNaN(iniData['cab']['brakenotchcount']) ? 7 : parseInt(iniData['cab']['brakenotchcount'])
        };
    }
    if (iniData['onelevercab']) {
        result.oneLeverCab = {
            powerNotchCount: isNaN(iniData['onelevercab']['powernotchcount']) ? 5 : parseInt(iniData['onelevercab']['powernotchcount']),
            brakeNotchCount: isNaN(iniData['onelevercab']['brakenotchcount']) ? 7 : parseInt(iniData['onelevercab']['brakenotchcount'])
        };
    }
    if (iniData['maincircuit']) {
        result.mainCircuit = {
            regenerationLimit: isNaN(iniData['maincircuit']['regenerationlimit']) ? 5 : parseFloat(iniData['maincircuit']['regenerationlimit'])
        };
    }
    result.dynamics = parseSection(iniData, 'dynamics', {
        motorcarWeight: 31500,
        trailerWeight: 31500,
        motorcarCount: 5,
        trailerCount: 5,
        motorcarInertiaFactor: 0.1,
        trailerInertiaFactor: 0.05,
        carLength: 20
    });

    function parseSection(iniData, sectionName, keys) {
        const result = keys;
        const section = iniData[sectionName.toLowerCase()];

        if (section) {
            for (let key in keys) {
                result[key] = isNaN(section[key.toLowerCase()]) ? keys[key] : parseFloat(section[key.toLowerCase()]);
            }
        }

        return result;
    }

    return result;
}

function parseTrainDat(text) {
    const lines = text.split(/\r?\n/);

    const acceleration = [];
    for (let i = 2; i < 2 + 8; i++) {
        if (lines[i]) {
            const values = lines[i].split(',').map(value => parseFloat(value));
            acceleration.push({
                a0: values[0],
                a1: values[1],
                v1: values[2],
                v2: values[3],
                e: values[4]
            });
        }
    }

    const result = {
        acceleration,
        performance: {
            deceleration: parseFloat(lines[11]) || 3.5
        }
    };

    return result;
}
