import { Point } from './point.js';
import { AudioEntry } from './audio-entry.js';

export interface Vehicle {
    parameters: Parameters;
    sound: {
        motor: AudioEntry[];
        run: AudioEntry[];
    };
    motorNoise: {
        power: {
            volume: Point[][];
            frequency: Point[][];
        };
        brake: {
            volume: Point[][];
            frequency: Point[][];
        };
    };
    trainDat: TrainDat;
}

export interface Parameters {
    cab: {
        powerNotchCount: number;
        brakeNotchCount: number;
    };
    oneLeverCab: {
        powerNotchCount: number;
        brakeNotchCount: number;
    };
    mainCircuit: {
        regenerationLimit: number;
    };
    dynamics: {
        motorcarWeight: number;
        trailerWeight: number;
        motorcarCount: number;
        trailerCount: number;
        motorcarInertiaFactor: number;
        trailerInertiaFactor: number;
        carLength: number;
    };
}

export interface TrainDat {
    acceleration: {
        a0: number;
        a1: number;
        v1: number;
        v2: number;
        e: number;
    }[];
    performance: {
        deceleration: number;
    };
}

export function loadVehicle(relativeUrl: string, onload: (vehicle: Vehicle) => void): void {
    const files: { [key: string]: { url: string, text: string } } = {
        sound: { url: 'Sound.txt', text: '' },
        parameters: { url: 'Parameters.txt', text: '' },
        trainDat: { url: 'Train.dat', text: '' },
        powerFrequency: { url: 'PowerFreq.csv', text: '' },
        powerVolume: { url: 'PowerVol.csv', text: '' },
        brakeFrequency: { url: 'BrakeFreq.csv', text: '' },
        brakeVolume: { url: 'BrakeVol.csv', text: '' },
    };


    const fileCount = Object.keys(files).length;
    let loadCount = 0;

    for (const key in files) {
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

export function fetchText(url: string, onload: (text: string) => void): void {
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
 * @param text
 * @returns
 */
export function parseIni(text: string): { [section: string]: { [key: string]: string } } {
    const result: { [section: string]: { [key: string]: string } } = {};

    text = text.replace('\r', '');
    const lines = text.split('\n');
    let section = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        let match = line.match(/^\[(.+)\]/);
        if (match) {
            section = match[1].toLowerCase();
            continue;
        }

        match = line.match(/^(.+?)\s*?=\s*(.+)/);
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
 * 
 * @param text
 * @returns
 */
export function parseCsv(text: string): Point[][] {
    const result: Point[][] = [];

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
                result[j].push({ x, y });
            }
        }
    }

    return result;
}

export function parseSound(text: string, relativeUrl: string): { motor: AudioEntry[], run: AudioEntry[] } {
    const iniData = parseIni(text);
    const result: { motor: AudioEntry[], run: AudioEntry[] } = {
        motor: [],
        run: []
    };

    if (iniData['motor']) {
        const urlList = [];
        for (const key in iniData['motor']) {
            if (!isNaN(Number(key))) {
                result.motor[parseInt(key)] = createAudioEntry(relativeUrl + iniData['motor'][key]);
            }
        }
    }
    if (iniData['run'] && iniData['run']['0']) {
        result.run[0] = createAudioEntry(relativeUrl + iniData['run']['0']);
    }

    return result;
}

export function createAudioEntry(text: string): AudioEntry {
    const items = text.split(',');

    const userAgent = window.navigator.userAgent.toLowerCase();
    let browser;
    if (userAgent.includes('msie') || userAgent.includes('trident')) {
        browser = 'msie';
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
    const length = Number(items[1]) > 0 ? Number(items[1]) : 0;
    const leeway = extension === '.mp4' ? length / 2 : 0;
    //const leeway = items[2] > 0 ? Number(items[2]) : 0;
    //const leeway = (items[2] > 0 && extension === '.mp4') ? Number(items[2]) : 0;

    return {
        url,
        length,
        leeway
    };
}

export function parseParameters(text: string): Parameters {
    const iniData = parseIni(text);
    const result: Parameters = {
        mainCircuit: {
            regenerationLimit: 5
        },
        dynamics: {
            motorcarWeight: 31500,
            trailerWeight: 31500,
            motorcarCount: 5,
            trailerCount: 5,
            motorcarInertiaFactor: 0.1,
            trailerInertiaFactor: 0.05,
            carLength: 20
        },
        oneLeverCab: {
            powerNotchCount: 5,
            brakeNotchCount: 7
        },
        cab: {
            powerNotchCount: 5,
            brakeNotchCount: 7
        }
    };

    if (iniData['cab']) {
        result.cab = {
            powerNotchCount: isNaN(Number(iniData['cab']['powernotchcount'])) ? 5 : parseInt(iniData['cab']['powernotchcount']),
            brakeNotchCount: isNaN(Number(iniData['cab']['brakenotchcount'])) ? 7 : parseInt(iniData['cab']['brakenotchcount'])
        };
    }
    if (iniData['onelevercab']) {
        result.oneLeverCab = {
            powerNotchCount: isNaN(Number(iniData['onelevercab']['powernotchcount'])) ? 5 : parseInt(iniData['onelevercab']['powernotchcount']),
            brakeNotchCount: isNaN(Number(iniData['onelevercab']['brakenotchcount'])) ? 7 : parseInt(iniData['onelevercab']['brakenotchcount'])
        };
    }
    if (iniData['maincircuit']) {
        result.mainCircuit = {
            regenerationLimit: isNaN(Number(iniData['maincircuit']['regenerationlimit'])) ? 5 : parseFloat(iniData['maincircuit']['regenerationlimit'])
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

    function parseSection<T extends any>(iniData: { [section: string]: { [key: string]: string } }, sectionName: string, keys: T): T {
        const result: any = keys;
        const section = iniData[sectionName.toLowerCase()];

        if (section) {
            for (const key in keys) {
                result[key] = isNaN(Number(section[key.toLowerCase()])) ? keys[key] : parseFloat(section[key.toLowerCase()]);
            }
        }

        return result;
    }

    return result;
}

export function parseTrainDat(text: string): TrainDat {
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
