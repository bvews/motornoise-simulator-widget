import { MotornoiseTrack } from './motornoise-track.js';
import { Spectrogram } from './spectrogram.js';
import { GeneralizedAccelerationCurve } from './generalized-acceleration-curve.js';
import { LinearInterpolation } from './linear-interpolation.js';
import { RunningResistanceSimulator } from './running-resistance-simulator.js';
import { AccelerationSimulator } from './acceleration-simulator.js';
import { loadVehicle, Vehicle, Parameters, TrainDat } from './load-text-funcs.js';
import { loadImages, loadAudios } from './load-media-funcs.js';
import { BrowserCompatible } from './browser-compatible.js';

interface MotornoiseData {
    urls: string[];
    sourceNodes: AudioBufferSourceNode[];
    gainNodes: GainNode[];
    pitchLerps: LinearInterpolation[];
    volumeLerps: LinearInterpolation[];
}

/**
 * Motornoise simulator class.
 */
export class MotornoiseSimulator {
    public audioContext: AudioContext;
    public notch = 0;
    public speed = 0;

    private intervalMillisec = 20;
    private maxSpeed = 100;

    private relativeUrl: string;
    // private bufferLoader: BufferLoader;

    private powerMotornoiseData?: MotornoiseData;
    private brakeMotornoiseData?: MotornoiseData;
    private runningnoiseData?: MotornoiseData;

    private _audioTracks: MotornoiseTrack[] = [];
    private _spectrogram?: Spectrogram;

    private runningResistanceSimulator?: RunningResistanceSimulator;
    private accelerationSimulator?: AccelerationSimulator;

    private regenerationLimit = 0;
    private runningNoiseIndex = 0;
    private isAllFileLoaded = false;
    private isMuted = false;

    private browserCompatible = new BrowserCompatible();

    private _prevTimeStamp = 0;
    private _isEnabledSpectrogram = false;
    private _isRunning = false;
    private _isMuted = false;
    private _hidden = false;

    /**
     *
     * @param audioContext
     * @param relativeUrl
     * @param maxSpeed
     * @param canvas
     */
    constructor(audioContext: AudioContext, relativeUrl: string, maxSpeed: number, canvas: HTMLCanvasElement | null | undefined) {
        this.maxSpeed = maxSpeed > 0 ? Number(maxSpeed) : 100;
        this.audioContext = audioContext;
        this.relativeUrl = relativeUrl;
        // this.bufferLoader;

        this._audioTracks = [];

        if (canvas) {
            this._spectrogram = new Spectrogram(canvas);
        }
        this._spectrogram?.clear();

        this.runningResistanceSimulator;
        this.accelerationSimulator;
    }

    /**
     *
     * @param onAllFileLoaded
     */
    load(onAllFileLoaded: () => void, onupdate: (loadCount: number, entryCount: number) => void): void {
        const audioContext = this.audioContext;
        const self = this;
        loadVehicle(this.relativeUrl, (vehicle) => {
            // Create running resistance simulator.
            self.runningResistanceSimulator = new RunningResistanceSimulator(vehicle.parameters);

            // Create train acceleration simulator.
            self.accelerationSimulator = new AccelerationSimulator(vehicle.trainDat, vehicle.parameters);

            loadImages(undefined, (images: any) => {
                const audioEntries = vehicle.sound.motor.concat(vehicle.sound.run).filter((entry: any) => entry);
                loadAudios(
                    audioContext,
                    audioEntries,
                    () => {
                        self._audioTracks = self.createAudioTracks(audioContext, vehicle);
                        self._setupSpectrogram(audioContext, self._audioTracks);
                        onAllFileLoaded();
                        self.isAllFileLoaded = true;
                    },
                    onupdate
                );
            });
        });
    }

    createAudioTracks(audioContext: AudioContext, vehicle: Vehicle): MotornoiseTrack[] {
        const motorNoise = vehicle.motorNoise;

        let trackCount = 0;
        trackCount = Math.max(trackCount, vehicle.sound.motor.length);
        trackCount = Math.max(trackCount, motorNoise.power.frequency.length);
        trackCount = Math.max(trackCount, motorNoise.power.volume.length);
        trackCount = Math.max(trackCount, motorNoise.brake.frequency.length);
        trackCount = Math.max(trackCount, motorNoise.brake.volume.length);

        const audioTracks = [];
        for (let i = 0; i < trackCount; i++) {
            audioTracks.push(new MotornoiseTrack(audioContext, vehicle.sound.motor[i], motorNoise.power.frequency[i], motorNoise.power.volume[i], motorNoise.brake.frequency[i], motorNoise.brake.volume[i], vehicle.parameters.mainCircuit.regenerationLimit, false));
        }
        const runVolume = [
            { x: 0, y: 0.001 },
            { x: 90, y: 1 },
            { x: 1000, y: 1 },
        ];
        const runFrequency = [
            { x: 0, y: 0.001 },
            { x: 90, y: 1 },
        ];
        audioTracks.push(new MotornoiseTrack(audioContext, vehicle.sound.run[0], runFrequency, runVolume, runFrequency, runVolume, vehicle.parameters.mainCircuit.regenerationLimit, true));

        return audioTracks;
    }

    handleVisibilitychange(event: Event): void {
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

    startMainLoop(intervalMillisec?: number): void {
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

    stopMainLoop(): void {
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

    update(intervalMillisec: number): void {
        // Check motornoise simulate preparation.
        if (!this.isAllFileLoaded && this.isAllFileLoaded === false) {
            return;
        }

        const notch = this.notch;

        if (!this.runningResistanceSimulator || !this.accelerationSimulator) {
            return;
        }

        // Calc current speed.
        let speed = this.speed;
        const ar = this.runningResistanceSimulator.getAcceleration(speed);
        const accelerationValue = this.accelerationSimulator.getAcceleration(speed, notch);

        speed += ((accelerationValue + ar) * intervalMillisec) / 1000;
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
            this._audioTracks.forEach((track) => {
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
        this._audioTracks.forEach((track) => {
            track.update(speed, notch);
        });

        if (this._isEnabledSpectrogram) {
            this._spectrogram?.update();
        }
    }

    setNotchIncrement(): void {
        this._setNotch(this.notch + 1);
    }

    setNotchDecrement(): void {
        this._setNotch(this.notch - 1);
    }

    setNotchFullPower(): void {
        this._setNotch(Number.POSITIVE_INFINITY);
    }

    setNotchFullBrake(): void {
        this._setNotch(Number.NEGATIVE_INFINITY);
    }

    setNotchNeutral(): void {
        this._setNotch(0);
    }

    toggleMute(onMuted: () => void, onUnmuted: () => void): void {
        const audioContext = this.audioContext;
        const self = this;

        if (audioContext.state === 'running') {
            audioContext.suspend().then(() => {
                onMuted();
                self.isMuted = true;
            });
        } else if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                onUnmuted();
                self.isMuted = false;
            });
        }
    }

    toggleSpectrogram(callbackOnHide: () => void, callbackOnShow: () => void): void {
        if (this._isEnabledSpectrogram) {
            this._isEnabledSpectrogram = false;
            callbackOnHide();
        } else {
            this._isEnabledSpectrogram = true;
            this.clearSpectrogram();
            callbackOnShow();
        }
    }

    clearSpectrogram(): void {
        this._spectrogram?.clear();
    }

    public ontick: (speed: number) => void = (speed) => {};

    private _setupSpectrogram(audioContext: AudioContext, audioTracks: MotornoiseTrack[]): void {
        const analyserNode = audioContext.createAnalyser();
        audioTracks.forEach(({ gainNode }) => {
            gainNode.connect(analyserNode);
        });
        this._spectrogram?.setAnalyser(analyserNode);
        analyserNode.connect(audioContext.destination);

        this._spectrogram?.setAnalyser(analyserNode);
        this._spectrogram?.setDecibelsRange(-100, -30);
        this._spectrogram?.setFftSize(4096, true);
    }

    private _setNotch(notch: number): void {
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
}
