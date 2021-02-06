import { MotornoiseTrack } from './motornoise-track.js';
import { Spectrogram } from './spectrogram.js';
import { GeneralizedAccelerationCurve } from './generalized-acceleration-curve.js';
import { loadVehicle } from './load-text-funcs.js';
import { loadImages, loadAudios } from './load-media-funcs.js';
import { BrowserCompatible } from './browser-compatible.js';

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
export class MotornoiseSimulator {
    constructor(audioContext, relativeUrl, maxSpeed, canvas) {
        /** @type {number} */
        this.intervalMillisec = 20;
        /** @type {number} */
        this.maxSpeed = maxSpeed > 0 ? Number(maxSpeed) : 100;

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

        this._audioTracks = [];

        this._spectrogram = new Spectrogram(canvas, null);
        this._spectrogram.clear();

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

        /** @type {BrowserCompatible} */
        this.browserCompatible = new BrowserCompatible();

        this.ontick;
    }

    /**
     *
     * @callback callback
     */
    /**
     * 
     * @param {callback} onAllFileLoaded 
     */
    load(onAllFileLoaded, onupdate) {
        const audioContext = this.audioContext;
        const self = this;
        loadVehicle(this.relativeUrl, vehicle => {
            // Create running resistance simulator.
            self.runningResistanceSimulator = new RunningResistanceSimulator(vehicle.parameters);

            // Create train acceleration simulator.
            self.accelerationSimulator = new AccelerationSimulator(vehicle.trainDat, vehicle.parameters);

            loadImages(null, images => {
                const audioEntries = vehicle.sound.motor.concat(vehicle.sound.run)
                    .filter(entry => entry);
                loadAudios(audioContext, audioEntries, () => {
                    self._audioTracks = self.createAudioTracks(audioContext, vehicle);
                    self._setupSpectrogram(audioContext, self._audioTracks);
                    onAllFileLoaded();
                    self.isAllFileLoaded = true;
                }, onupdate);
            });
        });
    }

    createAudioTracks(audioContext, vehicle) {
        const motorNoise = vehicle.motorNoise;

        let trackCount = 0;
        trackCount = Math.max(trackCount, vehicle.sound.motor.length);
        trackCount = Math.max(trackCount, motorNoise.power.frequency.length);
        trackCount = Math.max(trackCount, motorNoise.power.volume.length);
        trackCount = Math.max(trackCount, motorNoise.brake.frequency.length);
        trackCount = Math.max(trackCount, motorNoise.brake.volume.length);

        const audioTracks = [];
        for (let i = 0; i < trackCount; i++) {
            audioTracks.push(new MotornoiseTrack(
                audioContext,
                vehicle.sound.motor[i],
                motorNoise.power.frequency[i],
                motorNoise.power.volume[i],
                motorNoise.brake.frequency[i],
                motorNoise.brake.volume[i],
                vehicle.parameters.mainCircuit.regenerationLimit,
                false));
        }
        const runVolume = [{ 'x': 0, 'y': 0.001 }, { 'x': 90, 'y': 1 }, { 'x': 1000, 'y': 1 }];
        const runFrequency = [{ 'x': 0, 'y': 0.001 }, { 'x': 90, 'y': 1 }];
        audioTracks.push(new MotornoiseTrack(
            audioContext,
            vehicle.sound.run[0],
            runFrequency,
            runVolume,
            runFrequency,
            runVolume,
            vehicle.parameters.mainCircuit.regenerationLimit,
            true));

        return audioTracks;
    }

    _setupSpectrogram(audioContext, audioTracks) {
        const analyserNode = audioContext.createAnalyser();
        audioTracks.forEach(({ gainNode }) => {
            gainNode.connect(analyserNode);
        });
        this._spectrogram.setAnalyser(analyserNode);
        analyserNode.connect(audioContext.destination);

        this._spectrogram.setAnalyser(analyserNode);
        this._spectrogram.setDecibelsRange(-100, -30);
        this._spectrogram.setFftSize(4096, true);
    }

    handleVisibilitychange(event) {
        if (this.audioContext) {
            if (document.hidden) {
                if (this.audioContext.state === 'running') {
                    this._isMuted = false;
                } else {
                    this._isMuted = true;
                }
                this.audioContext.suspend();
                this._hidden = true;
            } else {
                if (!this._isMuted) {
                    this.audioContext.resume();
                }
            }
        }
    }

    startMainLoop(intervalMillisec) {
        if (!this._isRunning) {
            this._isRunning = true;

            const self = this;
            requestAnimationFrame(function mainLoop(timeStamp) {
                if (self._isRunning) {
                    if (!self._prevTimeStamp) {
                        self._prevTimeStamp = timeStamp;
                    } else {
                        const timeElapsed = timeStamp - self._prevTimeStamp;
                        self._prevTimeStamp = timeStamp;

                        if (!self._hidden) {
                            self.update(timeElapsed);
                        }

                        if (!document.hidden && self._hidden) {
                            self._hidden = false;
                        }
                    }

                    requestAnimationFrame(mainLoop);
                } else {
                    self._prevTimeStamp = NaN;
                }
            });
        }

        if (!this._isMuted) {
            this.audioContext.resume();
        }
    }

    stopMainLoop() {
        this._isRunning = false;

        const self = this;

        // Defer audio context suspension for preventing noise on resume.
        setTimeout(() => {
            if (!self._isRunning) {
                if (self.audioContext.state === 'running') {
                    self._isMuted = false;
                } else {
                    self._isMuted = true;
                }
                self.audioContext.suspend();
            }
        }, 100);
    }

    update(intervalMillisec) {
        // Check motornoise simulate preparation.
        if (!this.isAllFileLoaded && this.isAllFileLoaded === false) {
            return;
        }

        const notch = this.notch;

        // Calc current speed.
        let speed = this.speed;
        const ar = this.runningResistanceSimulator.getAcceleration(speed);
        const accelerationValue = this.accelerationSimulator.getAcceleration(speed, notch);

        speed += (accelerationValue + ar) * intervalMillisec / 1000;
        if (speed > this.maxSpeed) {
            speed = this.maxSpeed;
        } else if (speed < 0) {
            speed = 0;
        }
        this.speed = speed;

        // Update gauge.
        if (this.ontick) {
            this.ontick(speed);
        }

        if (this.isMuted) {
            return;
        }

        const audioContext = this.audioContext;

        if (speed === 0) {
            //this.setAllVolumeZero();
            this._audioTracks.forEach(track => {
                track.stop();
            });

            // Suspend simulation for CPU load reducing.
            if (this._isRunning === true) {
                this.stopMainLoop();
            }
            return;
        } else {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        }

        // Update motornoise and runningnoise.
        this._audioTracks.forEach(track => {
            track.update(speed, notch);
        });

        if (this._isEnabledSpectrogram) {
            this._spectrogram.update();
        }
    }

    setNotchIncrement() {
        this._setNotch(this.notch + 1);
    }

    setNotchDecrement() {
        this._setNotch(this.notch - 1);
    }

    setNotchFullPower() {
        this._setNotch(Number.POSITIVE_INFINITY);
    }

    setNotchFullBrake() {
        this._setNotch(Number.NEGATIVE_INFINITY);
    }

    setNotchNeutral() {
        this._setNotch(0);
    }

    _setNotch(notch) {
        this.startMainLoop();

        const as = this.accelerationSimulator;
        if (isNaN(notch) || notch === 0) {
            this.notch = 0;
        } else if (as) {
            if (notch > 0) {
                this.notch = notch > as.maxPowerNotch ? as.maxPowerNotch : notch;
            } else {
                this.notch = notch < -as.maxBrakeNotch ? -as.maxBrakeNotch : notch;
            }
        }
    }

    toggleMute(onMuted, onUnmuted) {
        const audioContext = this.audioContext;
        const self = this;

        if (audioContext.state === 'running') {
            audioContext.suspend().then(() => {
                onMuted();
                self.isMuted = true;
            });
        }
        else if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                onUnmuted();
                self.isMuted = false;
            });
        }
    }

    toggleSpectrogram(callbackOnHide, callbackOnShow) {
        if (this._isEnabledSpectrogram) {
            this._isEnabledSpectrogram = false;
            callbackOnHide();
        } else {
            this._isEnabledSpectrogram = true;
            this.clearSpectrogram();
            callbackOnShow();
        }
    }

    clearSpectrogram() {
        this._spectrogram.clear();
    }
}

class AccelerationSimulator {
    constructor(trainDat, parameters) {
        this.accelerationCurves = [];
        this.decelerationCurves = [];

        if (!trainDat) {
            return;
        } else {
            if (!parameters) {
                // const maxDeceleration = Number(trainDat[11]);
                // const maxPowerNotch = parseInt(trainDat[38]);
                // const maxBrakeNotch = parseInt(trainDat[39]);

                // this.maxPowerNotch = maxPowerNotch;
                // this.maxBrakeNotch = maxBrakeNotch;

                // for (let i = 0; i < maxPowerNotch; i++) {
                //     const accelerationParams = trainDat[i + 2].split(',');
                //     const a0 = Number(accelerationParams[0]);
                //     const a1 = Number(accelerationParams[1]);
                //     const v0 = Number(accelerationParams[2]);
                //     const v1 = Number(accelerationParams[3]);
                //     const e = Number(accelerationParams[4]);
                //     accelerationCurves[i] = new GeneralizedAccelerationCurve(a0, a1, v0, v1, e);
                // }

                // for (let i = 0; i < maxBrakeNotch; i++) {
                //     decelerationCurves[i] = new GeneralizedAccelerationCurve(-maxDeceleration / maxBrakeNotch * (i + 1));
                // }
            } else {
                const maxDeceleration = trainDat.performance.deceleration;
                const cab = parameters.cab || parameters.oneLeverCab;
                let maxPowerNotch = 5;
                let maxBrakeNotch = 7;
                if (cab) {
                    maxPowerNotch = cab.powerNotchCount;
                    maxBrakeNotch = cab.brakeNotchCount;
                }

                this.maxPowerNotch = maxPowerNotch;
                this.maxBrakeNotch = maxBrakeNotch;

                trainDat.acceleration.forEach(a => {
                    this.accelerationCurves.push(new GeneralizedAccelerationCurve(a.a0, a.a1, a.v1, a.v2, a.e));
                });

                for (let i = 0; i < maxBrakeNotch; i++) {
                    this.decelerationCurves[i] = new GeneralizedAccelerationCurve(-maxDeceleration / maxBrakeNotch * (i + 1));
                }
            }
        }
    }

    getAcceleration(speed, notch) {
        if (notch > 0 && this.accelerationCurves[notch - 1]) {
            return this.accelerationCurves[notch - 1].getAcceleration(speed);
        } else if (notch < 0 && this.decelerationCurves[-notch - 1]) {
            return this.decelerationCurves[-notch - 1].getAcceleration(speed);
        } else {
            return 0;
        }
    }
}

class RunningResistanceSimulator {
    constructor(parameters, mw, tw, mc, tc, mif, tif, a, b, c) {
        if (parameters && parameters['dynamics']) {
            const dynamics = parameters['dynamics'];

            mw = mw ? mw : dynamics['motorcarweight'];
            tw = tw ? tw : dynamics['trailerweight'];
            mc = mc ? mc : dynamics['motorcarcount'];
            tc = tc ? tc : dynamics['trailercount'];
            mif = mif ? mif : dynamics['motorcarinertiafactor'];
            tif = tif ? tif : dynamics['trailerinertiafactor'];
        }

        this.motorcarWeight = isNaN(mw) ? 31500 : Number(mw);
        this.trailerWeight = isNaN(tw) ? 31500 : Number(tw);
        this.motorcarCount = isNaN(mc) ? 1 : Number(mc);
        this.trailerCount = isNaN(tc) ? 1 : Number(tc);
        this.motorcarInertiaFactor = isNaN(mif) ? 0.01 : Number(mif);
        this.trailerInertiaFactor = isNaN(tif) ? 0.05 : Number(tif);

        this.coefficientA = isNaN(a) ? 0.275 + 0.076 * (this.motorcarCount + this.trailerCount - 1) : a;
        this.coefficientB = isNaN(b) ? 0.000242 * this.motorcarCount * this.motorcarWeight + 0.0000275 * this.trailerCount * this.trailerWeight : b;
        this.coefficientC = isNaN(c) ? 0.0162 * this.motorcarCount * this.motorcarWeight + 0.00765 * this.trailerCount * this.trailerWeight : c;
    }
    getForce(speed) {
        return this.coefficientA * speed * speed + this.coefficientB * speed + this.coefficientC;
    }

    getAcceleration(speed) {
        const resistanceForce = this.coefficientA * speed * speed + this.coefficientB * speed + this.coefficientC;
        return -3.6 * resistanceForce / (this.motorcarCount * this.motorcarWeight * (this.motorcarInertiaFactor + 1) + this.trailerCount * this.trailerWeight * (this.trailerInertiaFactor + 1));
    }
}

