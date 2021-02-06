/**
 * Motornoise data.
 * @typedef {Object} MotornoiseData
 * @property {string[]} urls
 * @property {AudioBufferSourceNode[]} sourceNodes
 * @property {GainNode[]} gainNodes
 * @property {LinearInterpolation[]} pitchLerps
 * @property {LinearInterpolation[]} volumeLerps
 */

/**
 * Motornoise simulator class.
 * @param {AudioContext} audioContext 
 * @param {string} relativeUrl 
 * @param {number} [maxSpeed=100]
 */
function MotornoiseSimulator(audioContext, relativeUrl, maxSpeed) {
    'use strict';
    /** @type {number} */
    this.intervalMillisec = 20;
    /** @type {number} */
    this.maxSpeed = parseFloat(maxSpeed) || 100;

    /** @type {AudioContext} */
    this.audioContext = audioContext;
    /** @type {string} */
    this.relativeUrl = relativeUrl;
    /** @type {BufferLoader} */
    this.bufferLoader;

    /** @type {number} */
    this.notch = 0;

    /** @type {MotornoiseData} */
    this.powerMotornoiseData;
    /** @type {MotornoiseData} */
    this.brakeMotornoiseData;
    /** @type {MotornoiseData} */
    this.runningnoiseData;

    this.runningResistanceSimulator;
    this.accelerationSimulator;

    /** @type {number} */
    this.speed = 0;
    /** @type {number} */
    this.regenerationLimit = 0;
    /** @type {number} */
    this.runningNoiseIndex;
    /** @type {boolean} */
    this.isAllFileLoaded = false;
    /** @type {boolean} */
    this.isMuted = false;

    /** @type {number} */
    this.setInterval(this.intervalMillisec);

    this.textFileLoader = {
        'PowerVol.csv': {
            'parser': textParser.parseCsv
        },
        'PowerFreq.csv': {
            'parser': textParser.parseCsv
        },
        'BrakeVol.csv': {
            'parser': textParser.parseCsv
        },
        'BrakeFreq.csv': {
            'parser': textParser.parseCsv
        },
        'Sound.txt': {
            'parser': textParser.parseIni
        },
        'Parameters.txt': {
            'parser': textParser.parseIni
        },
        'Train.dat': {
            'parser': textParser.parseLines
        }
    };

    /** @type {BrowserCompatible} */
    this.browserCompatible = new BrowserCompatible();

    this.ontick;
}

MotornoiseSimulator.prototype.toggleMute = function (onMuted, onUnmuted) {
    'use strict';
    const audioContext = this.audioContext;
    const self = this;

    if (audioContext.state === 'running') {
        audioContext.suspend().then(function () {
            onMuted();
            self.isMuted = true;
        });
    }
    else if (audioContext.state === 'suspended') {
        audioContext.resume().then(function () {
            onUnmuted();
            self.isMuted = false;
        });
    }
}

MotornoiseSimulator.prototype.setInterval = function (intervalMillisec) {
    'use strict';
    intervalMillisec = parseFloat(intervalMillisec);
    this.intervalMillisec = intervalMillisec;
    if (this.tickId) {
        clearInterval(this.tickId);
    }
    const self = this;
    this.tickId = setInterval(function () { self.tick(intervalMillisec); }, intervalMillisec);
}

/**
 *
 * @callback callback
 */

/**
 * 
 * @param {callback} onAllFileLoaded 
 */
MotornoiseSimulator.prototype.load = function (onAllFileLoaded, onupdate) {
    'use strict';
    this.setFileLoadWatcher(this.relativeUrl);
    this.onAllFileLoaded = onAllFileLoaded;
    this.onupdate = onupdate;
}

/**
 * 
 * @param {string} relativeUrl 
 */
MotornoiseSimulator.prototype.setFileLoadWatcher = function (relativeUrl) {
    'use strict';
    const self = this;
    var textFileLoader = this.textFileLoader;
    var textFileLoadWatcherId = setInterval(function () {
        self.loadFiles(textFileLoader, relativeUrl, textFileLoadWatcherId);
    }, 20);

    // Load Motornoise configuration files.
    for (var url in textFileLoader) {
        this.fetchConfigFile(textFileLoader, url);
    }
}

MotornoiseSimulator.prototype.loadFiles = function (textFileLoader, relativeUrl, textFileLoadWatcherId) {
    'use strict';
    if (this.checkAllFileLoaded(textFileLoader)) {
        clearInterval(textFileLoadWatcherId);

        var soundFile = textFileLoader['Sound.txt'].object;
        var parametersFile = textFileLoader['Parameters.txt'].object;
        var powerVolumeFile = textFileLoader['PowerVol.csv'].object;
        var powerPitchFile = textFileLoader['PowerFreq.csv'].object;
        var brakeVolumeFile = textFileLoader['BrakeVol.csv'].object;
        var brakePitchFile = textFileLoader['BrakeFreq.csv'].object;
        var trainDatFile = textFileLoader['Train.dat'].object;


        // Load parameters.
        var regenerationLimit = parametersFile['maincircuit']['regenerationlimit'];
        if (!isNaN(regenerationLimit)) {
            this.regenerationLimit = parseFloat(regenerationLimit);
        }

        // Create running resistance simulator.
        this.runningResistanceSimulator = new RunningResistanceSimulator(parametersFile);

        // Create train acceleration simulator.
        this.accelerationSimulator = new AccelerationSimulator(trainDatFile);

        // Create motornoise data objects.
        this.powerMotornoiseData = {};
        this.powerMotornoiseData.sourceNodes = [];
        this.powerMotornoiseData.gainNodes = [];
        this.powerMotornoiseData.volumeLerps = this.createLerpObject(powerVolumeFile);
        this.powerMotornoiseData.pitchLerps = this.createLerpObject(powerPitchFile);

        this.brakeMotornoiseData = {};
        this.brakeMotornoiseData.sourceNodes = [];
        this.brakeMotornoiseData.gainNodes = [];
        this.brakeMotornoiseData.volumeLerps = this.createLerpObject(brakeVolumeFile);
        this.brakeMotornoiseData.pitchLerps = this.createLerpObject(brakePitchFile);

        this.runningnoiseData = {};
        this.runningnoiseData.sourceNodes = [];
        this.runningnoiseData.gainNodes = [];
        this.runningnoiseData.volumeLerps = [];
        this.runningnoiseData.pitchLerps = [];
        const runVolume = [{ 'x': 0, 'y': 0.001 }, { 'x': 90, 'y': 1 }, { 'x': 1000, 'y': 1 }];
        const runPitch = [{ 'x': 0, 'y': 0.001 }, { 'x': 90, 'y': 1 }];

        // Load motornoise wave files.
        if (soundFile['motor']) {
            var urlList = [];
            for (var key in soundFile['motor']) {
                if (!isNaN(key)) {
                    urlList[parseInt(key)] = relativeUrl + soundFile['motor'][key];
                }
            }
            if (soundFile['run'] && soundFile['run']['0']) {
                urlList.push(relativeUrl + soundFile['run']['0']);
            }

            urlList = urlList.map((url) => url.replace(',', this.browserCompatible.audioFileExtention + ','));

            this.runningNoiseIndex = urlList.length - 1;

            this.powerMotornoiseData.urls = urlList;
            this.brakeMotornoiseData.urls = urlList;
            this.runningnoiseData.urls = urlList;

            this.bufferLoader = new BufferLoader(this.audioContext, urlList, this.finishedSoundLoading.bind(this));
            this.bufferLoader.onupdate = this.onupdate;
            this.bufferLoader.load();

            this.runningnoiseData.volumeLerps[this.runningNoiseIndex] = new LinearInterpolation(runVolume);
            this.runningnoiseData.pitchLerps[this.runningNoiseIndex] = new LinearInterpolation(runPitch);
        }
    }
}

MotornoiseSimulator.prototype.finishedSoundLoading = function () {
    'use strict';
    this.isAllFileLoaded = true;

    if (this.onAllFileLoaded) {
        this.onAllFileLoaded();
    }

    for (let i = 0; i < this.powerMotornoiseData.urls.length; i++) {
        this.playSound(this.powerMotornoiseData, i);
    }
    for (let i = 0; i < this.brakeMotornoiseData.urls.length; i++) {
        this.playSound(this.brakeMotornoiseData, i);
    }
    for (let i = 0; i < this.runningnoiseData.urls.length; i++) {
        this.playSound(this.runningnoiseData, i);
    }
}

MotornoiseSimulator.prototype.fetchConfigFile = function (textFileLoader, url) {
    'use strict';
    var xhr = new XMLHttpRequest();

    xhr.addEventListener('load', function (e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var text = xhr.responseText;
                textFileLoader[url].object = textFileLoader[url].parser(text);
            } else {
            }
        }
    }, false);

    xhr.open('GET', this.relativeUrl + url, true);
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.send(null);
}

MotornoiseSimulator.prototype.checkAllFileLoaded = function (textFileLoader) {
    'use strict';
    var isAllFileLoaded = true;
    for (var key in textFileLoader) {
        if (!textFileLoader[key].object) isAllFileLoaded = false;
    }
    return isAllFileLoaded;
}

MotornoiseSimulator.prototype.createLerpObject = function (pointData) {
    'use strict';
    var result = [];
    for (let i = 0; i < pointData.length; i++) {
        const element = pointData[i];
        result[i] = new LinearInterpolation(element);
    }
    return result;
}

MotornoiseSimulator.prototype.tick = function (intervalMillisec) {
    'use strict';
    // Check motornoise simulate preparation.
    if (!this.isAllFileLoaded && this.isAllFileLoaded === false) {
        return;
    }

    const notch = this.notch;
    const motornoiseBufferCount = this.bufferLoader.urlList.length - 1;
    const runningNoiseIndex = this.runningNoiseIndex;
    const regenerationLimit = this.regenerationLimit;
    const powerMotornoiseData = this.powerMotornoiseData;
    const brakeMotornoiseData = this.brakeMotornoiseData;
    const runningnoiseData = this.runningnoiseData;

    // Calc current speed.
    let speed = this.speed;
    const ar = this.runningResistanceSimulator.getAcceleration(speed);
    const accelerationValue = this.accelerationSimulator.getAcceleration(speed, notch);

    speed += (accelerationValue + ar) * intervalMillisec / 1000;
    if (speed > this.maxSpeed) {
        speed = this.maxSpeed;
    }
    else if (speed < 0) {
        speed = 0;
    }
    this.speed = speed;

    if (this.isMuted) {
        return;
    }

    // Gauge update.
    if (this.ontick) {
        this.ontick(speed);
    }

    const audioContext = this.audioContext;

    if (speed === 0) {
        this.setAllVolumeZero();

        if (!this.isMuted && audioContext.state === 'running') {
            // Suspend context for CPU load reducing.
            setTimeout(function () { audioContext.suspend(); }, 100);
        }
        return;
    }
    else {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Play running noise.
        if (runningnoiseData.volumeLerps[runningNoiseIndex] && runningnoiseData.pitchLerps[runningNoiseIndex]) {
            this.setVolume(runningnoiseData, runningNoiseIndex, runningnoiseData.volumeLerps[runningNoiseIndex].interpolate(speed));
            this.setPitch(runningnoiseData, runningNoiseIndex, runningnoiseData.pitchLerps[runningNoiseIndex].interpolate(speed));
        }
    }

    // Simulate motornoise sound.
    if (notch > 0) {
        // Acceleration
        for (var i = 0; i < motornoiseBufferCount; i++) {
            if (powerMotornoiseData.volumeLerps[i] && powerMotornoiseData.pitchLerps[i]) {
                const volume = powerMotornoiseData.volumeLerps[i].interpolate(speed);
                if (volume > 0) {
                    this.setVolume(powerMotornoiseData, i, volume);
                    this.setPitch(powerMotornoiseData, i, powerMotornoiseData.pitchLerps[i].interpolate(speed));
                }
                else {
                    this.setVolume(powerMotornoiseData, i, 0);
                }
            }
        }
        for (var i = 0; i < motornoiseBufferCount; i++) {
            this.setVolume(brakeMotornoiseData, i, 0);
        }
    }
    else if (notch < 0) {
        // Deceleration
        for (var i = 0; i < motornoiseBufferCount; i++) {
            if (brakeMotornoiseData.volumeLerps[i] && brakeMotornoiseData.pitchLerps[i]) {
                const volume = brakeMotornoiseData.volumeLerps[i].interpolate(speed);
                if (volume > 0 && speed > regenerationLimit) {
                    this.setVolume(brakeMotornoiseData, i, volume);
                    this.setPitch(brakeMotornoiseData, i, brakeMotornoiseData.pitchLerps[i].interpolate(speed));
                }
                else {
                    this.setVolume(brakeMotornoiseData, i, 0);
                }
            }
        }
        for (var i = 0; i < motornoiseBufferCount; i++) {
            this.setVolume(powerMotornoiseData, i, 0);
        }
    }
    else {
        // Neutral
        for (var i = 0; i < motornoiseBufferCount; i++) {
            this.setVolume(powerMotornoiseData, i, 0);
        }
        for (var i = 0; i < motornoiseBufferCount; i++) {
            this.setVolume(brakeMotornoiseData, i, 0);
        }
    }
}

MotornoiseSimulator.prototype.playSound = function (motornoiseData, index) {
    'use strict';
    const bufferList = this.bufferLoader.bufferList;
    const durationList = this.bufferLoader.durationList;
    const sourceNodes = motornoiseData.sourceNodes;
    const gainNodes = motornoiseData.gainNodes;
    const audioContext = this.audioContext;

    let pitch = 1;
    if (sourceNodes[index]) {
        pitch = sourceNodes[index].playbackRate.value;
        sourceNodes[index].stop();
    }

    if (!bufferList || !bufferList[index]) {
        return;
    }

    let sourceNode = audioContext.createBufferSource();
    if (!gainNodes[index]) {
        gainNodes[index] = audioContext.createGain();
        gainNodes[index].gain.value = 0;
        gainNodes[index].connect(audioContext.destination);
    }

    sourceNode.buffer = bufferList[index];
    sourceNode.playbackRate.value = pitch;
    sourceNode.loop = true;
    sourceNode.loopStart = 0;


    const userAgent = window.navigator.userAgent.toLowerCase();
    let isChrome = true;
    if (userAgent.indexOf('chrome')) {
        isChrome = true;
    }

    const duration = durationList[index];
    this.browserCompatible.setSpan(sourceNode, duration);

    sourceNode.connect(gainNodes[index]);
    sourceNode.start(0);

    sourceNodes[index] = sourceNode;
}

MotornoiseSimulator.prototype.stopSound = function (motornoiseData, index) {
    'use strict';
    const sourceNodes = motornoiseData.sourceNodes;

    if (sourceNodes && sourceNodes[index]) {
        sourceNodes[index].stop();
        sourceNodes[index] = null;
    }
}

MotornoiseSimulator.prototype.setPitch = function (motornoiseData, index, pitch) {
    'use strict';
    if (pitch <= 0.0001) {
        pitch = 0.0001;
    }

    const sourceNodes = motornoiseData.sourceNodes;

    if (sourceNodes && sourceNodes[index]) {
        sourceNodes[index].playbackRate.value = pitch;
    }
}

MotornoiseSimulator.prototype.setVolume = function (motornoiseData, index, volume) {
    'use strict';
    if (!motornoiseData) {
        return;
    }

    if (volume < 0) {
        volume = 0;
    }
    else if (volume > 1) {
        volume = 1;
    }

    const gainNodes = motornoiseData.gainNodes;
    const sourceNodes = motornoiseData.sourceNodes;

    if (gainNodes && gainNodes[index]) {
        gainNodes[index].gain.value = volume;
    }
    // if (volume === 0 && sourceNodes && sourceNodes[index]) {
    //     this.stopSound(motornoiseData, index);
    // }
}

MotornoiseSimulator.prototype.setAllVolumeZero = function () {
    'use strict';
    const motornoiseBufferCount = this.bufferLoader.urlList.length - 1;
    const runningNoiseIndex = this.runningNoiseIndex;

    for (var i = 0; i < motornoiseBufferCount; i++) {
        this.setVolume(this.powerMotornoiseData, i, 0);
    }
    for (var i = 0; i < motornoiseBufferCount; i++) {
        this.setVolume(this.brakeMotornoiseData, i, 0);
    }
    if (this.runningnoiseData.volumeLerps[runningNoiseIndex] && this.runningnoiseData.pitchLerps[runningNoiseIndex]) {
        this.setVolume(this.runningnoiseData, runningNoiseIndex, 0);
    }
}

MotornoiseSimulator.prototype.setNotchIncrement = function () {
    'use strict';

    if (this.accelerationSimulator) {
        this.notch++;
        if (this.notch > this.accelerationSimulator.maxPowerNotch) {
            this.notch = this.accelerationSimulator.maxPowerNotch;
        }
        else if (this.notch < -this.accelerationSimulator.maxBrakeNotch) {
            this.notch = -this.accelerationSimulator.maxBrakeNotch;
        }
    }
}

MotornoiseSimulator.prototype.setNotchDecrement = function () {
    'use strict';
    if (this.accelerationSimulator) {
        this.notch--;
        if (this.notch > this.accelerationSimulator.maxPowerNotch) {
            this.notch = this.accelerationSimulator.maxPowerNotch;
        }
        else if (this.notch < -this.accelerationSimulator.maxBrakeNotch) {
            this.notch = -this.accelerationSimulator.maxBrakeNotch;
        }
    }
}

MotornoiseSimulator.prototype.setNotchFullPower = function () {
    'use strict';
    if (this.accelerationSimulator) {
        this.notch = this.accelerationSimulator.maxPowerNotch;
    }
}

MotornoiseSimulator.prototype.setNotchFullBrake = function () {
    'use strict';
    if (this.accelerationSimulator) {
        this.notch = -this.accelerationSimulator.maxBrakeNotch;
    }
}

MotornoiseSimulator.prototype.setNotchNeutral = function () {
    'use strict';
    this.notch = 0;
}

MotornoiseSimulator.prototype.finalize = function () {
    'use strict';
    if (this.tickId) {
        clearInterval(this.tickId);
    }

    const motornoiseBufferCount = this.bufferLoader.urlList.length - 1;
    const runningNoiseIndex = this.runningNoiseIndex;

    for (var i = 0; i < motornoiseBufferCount; i++) {
        this.stopSound(this.powerMotornoiseData, i);
    }
    for (var i = 0; i < motornoiseBufferCount; i++) {
        this.stopSound(this.brakeMotornoiseData, i);
    }
    if (this.runningnoiseData.volumeLerps[runningNoiseIndex] && this.runningnoiseData.pitchLerps[runningNoiseIndex]) {
        this.stopSound(this.runningnoiseData, runningNoiseIndex);
    }

    //console.log('Finalized.');
}


MotornoiseSimulator.prototype.close = function () {
    'use strict';

    const disconnect = function (node) {
        if (node) {
            node.disconnect();
            node = null;
        }
    };
    const pmnd = this.powerMotornoiseData;
    const bmnd = this.brakeMotornoiseData;

    if (pmnd) {
        pmnd.sourceNodes.forEach(disconnect);
        pmnd.gainNodes.forEach(disconnect);
    }
    if (bmnd) {
        bmnd.sourceNodes.forEach(disconnect);
        bmnd.gainNodes.forEach(disconnect);
    }

    this.audioContext.close();
}

function AccelerationSimulator(trainDat) {
    'use strict';

    const accelerationCurves = [];
    const decelerationCurves = [];

    this.getAcceleration = function (speed, notch) {
        if (notch > 0 && accelerationCurves[notch - 1]) {
            return accelerationCurves[notch - 1].getAcceleration(speed);
        }
        else if (notch < 0 && decelerationCurves[-notch - 1]) {
            return decelerationCurves[-notch - 1].getAcceleration(speed);
        }
        else {
            return 0;
        }
    }

    if (!trainDat) {
        return;
    }

    const maxDeceleration = parseFloat(trainDat[11]);
    const maxPowerNotch = parseInt(trainDat[38]);
    const maxBrakeNotch = parseInt(trainDat[39]);

    this.maxPowerNotch = maxPowerNotch;
    this.maxBrakeNotch = maxBrakeNotch;

    for (let i = 0; i < maxPowerNotch; i++) {
        const accelerationParams = trainDat[i + 2].split(',');
        const a0 = parseFloat(accelerationParams[0]);
        const a1 = parseFloat(accelerationParams[1]);
        const v0 = parseFloat(accelerationParams[2]);
        const v1 = parseFloat(accelerationParams[3]);
        const e = parseFloat(accelerationParams[4]);
        accelerationCurves[i] = new GeneralizedAccelerationCurve(a0, a1, v0, v1, e);
    }

    for (let i = 0; i < maxBrakeNotch; i++) {
        decelerationCurves[i] = new GeneralizedAccelerationCurve(-maxDeceleration / maxBrakeNotch * (i + 1));
    }
}

function RunningResistanceSimulator(parameters, mw, tw, mc, tc, mif, tif, a, b, c) {
    'use strict';
    if (parameters && parameters['dynamics']) {
        const dynamics = parameters['dynamics'];

        mw = mw ? mw : dynamics['motorcarweight'];
        tw = tw ? tw : dynamics['trailerweight'];
        mc = mc ? mc : dynamics['motorcarcount'];
        tc = tc ? tc : dynamics['trailercount'];
        mif = mif ? mif : dynamics['motorcarinertiafactor'];
        tif = tif ? tif : dynamics['trailerinertiafactor'];
    }

    const motorcarWeight = isNaN(mw) ? 31500 : parseFloat(mw);
    const trailerWeight = isNaN(tw) ? 31500 : parseFloat(tw);
    const motorcarCount = isNaN(mc) ? 1 : parseFloat(mc);
    const trailerCount = isNaN(tc) ? 1 : parseFloat(tc);
    const motorcarInertiaFactor = isNaN(mif) ? 0.01 : parseFloat(mif);
    const trailerInertiaFactor = isNaN(tif) ? 0.05 : parseFloat(tif);

    const coefficientA = isNaN(a) ? 0.275 + 0.076 * (motorcarCount + trailerCount - 1) : a;
    const coefficientB = isNaN(b) ? 0.000242 * motorcarCount * motorcarWeight + 0.0000275 * trailerCount * trailerWeight : b;
    const coefficientC = isNaN(c) ? 0.0162 * motorcarCount * motorcarWeight + 0.00765 * trailerCount * trailerWeight : c;

    this.getForce = function (speed) {
        return coefficientA * speed * speed + coefficientB * speed + coefficientC;
    }

    this.getAcceleration = function (speed) {
        const resistanceForce = coefficientA * speed * speed + coefficientB * speed + coefficientC;
        return -3.6 * resistanceForce / (motorcarCount * motorcarWeight * (motorcarInertiaFactor + 1) + trailerCount * trailerWeight * (trailerInertiaFactor + 1));
    }
}

