import { MotornoiseTrack } from './motornoise-track';
import { Spectrogram } from './spectrogram';
import { GeneralizedAccelerationCurve } from './generalized-acceleration-curve';
import { LinearInterpolation } from './linear-interpolation';
import { loadVehicle, Vehicle, Parameters, TrainDat } from './load-text-funcs';
import { loadImages, loadAudios } from './load-media-funcs';
import { BrowserCompatible } from './browser-compatible';


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
    private intervalMillisec: number = 20;
    private maxSpeed: number = 100;

    public audioContext: AudioContext;
    private relativeUrl: string;
    // private bufferLoader: BufferLoader;

    public notch: number = 0;

    private powerMotornoiseData?: MotornoiseData;
    private brakeMotornoiseData?: MotornoiseData;
    private runningnoiseData?: MotornoiseData;

    private _audioTracks: MotornoiseTrack[] = [];
    private _spectrogram?: Spectrogram;

    private runningResistanceSimulator?: RunningResistanceSimulator;
    private accelerationSimulator?: AccelerationSimulator;

    public speed: number = 0;
    private regenerationLimit: number = 0;
    private runningNoiseIndex: number = 0;
    private isAllFileLoaded: boolean = false;
    private isMuted: boolean = false;

    private browserCompatible = new BrowserCompatible();

    public ontick: (speed: number) => void = speed => { };

    private _prevTimeStamp: number = 0;
    private _isEnabledSpectrogram: boolean = false;
    private _isRunning: boolean = false;
    private _isMuted: boolean = false;
    private _hidden: boolean = false;

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
    load(onAllFileLoaded: () => void, onupdate: (loadCount: number, entryCount: number) => void) {
        const audioContext = this.audioContext;
        const self = this;
        loadVehicle(this.relativeUrl, vehicle => {
            // Create running resistance simulator.
            self.runningResistanceSimulator = new RunningResistanceSimulator(vehicle.parameters);

            // Create train acceleration simulator.
            self.accelerationSimulator = new AccelerationSimulator(vehicle.trainDat, vehicle.parameters);

            loadImages(undefined, (images: any) => {
                const audioEntries = vehicle.sound.motor.concat(vehicle.sound.run)
                    .filter((entry: any) => entry);
                loadAudios(audioContext, audioEntries, () => {
                    self._audioTracks = self.createAudioTracks(audioContext, vehicle);
                    self._setupSpectrogram(audioContext, self._audioTracks);
                    onAllFileLoaded();
                    self.isAllFileLoaded = true;
                }, onupdate);
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

    toggleMute(onMuted: () => void, onUnmuted: () => void): void {
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
}

class AccelerationSimulator {
    private accelerationCurves: GeneralizedAccelerationCurve[] = [];
    private decelerationCurves: GeneralizedAccelerationCurve[] = [];
    public maxPowerNotch: number = 5;
    public maxBrakeNotch: number = 7;

    constructor(trainDat: TrainDat | undefined, parameters: Parameters | undefined) {
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
                if (cab) {
                    this.maxPowerNotch = cab.powerNotchCount;
                    this.maxBrakeNotch = cab.brakeNotchCount;
                }

                trainDat.acceleration.forEach((a: any) => {
                    this.accelerationCurves.push(new GeneralizedAccelerationCurve(a.a0, a.a1, a.v1, a.v2, a.e));
                });

                for (let i = 0; i < this.maxBrakeNotch; i++) {
                    this.decelerationCurves[i] = new GeneralizedAccelerationCurve(-maxDeceleration / this.maxBrakeNotch * (i + 1));
                }
            }
        }
    }

    getAcceleration(speed: number, notch: number): number {
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
    private motorcarWeight: number;
    private trailerWeight: number;
    private motorcarCount: number;
    private trailerCount: number;
    private motorcarInertiaFactor: number;
    private trailerInertiaFactor: number;

    private coefficientA: number;
    private coefficientB: number;
    private coefficientC: number;

    constructor(parameters: Parameters, mw = 31500, tw = 31500, mc = 1, tc = 1, mif = 0.01, tif = 0.05, a?: number, b?: number, c?: number) {
        if (parameters && parameters.dynamics) {
            const dynamics = parameters.dynamics;

            mw = mw ? mw : dynamics.motorcarWeight;
            tw = tw ? tw : dynamics.trailerWeight;
            mc = mc ? mc : dynamics.motorcarCount;
            tc = tc ? tc : dynamics.trailerCount;
            mif = mif ? mif : dynamics.motorcarInertiaFactor;
            tif = tif ? tif : dynamics.trailerInertiaFactor;
        }

        this.motorcarWeight = isNaN(mw) ? 31500 : Number(mw);
        this.trailerWeight = isNaN(tw) ? 31500 : Number(tw);
        this.motorcarCount = isNaN(mc) ? 1 : Number(mc);
        this.trailerCount = isNaN(tc) ? 1 : Number(tc);
        this.motorcarInertiaFactor = isNaN(mif) ? 0.01 : Number(mif);
        this.trailerInertiaFactor = isNaN(tif) ? 0.05 : Number(tif);

        this.coefficientA = a == undefined ? 0.275 + 0.076 * (this.motorcarCount + this.trailerCount - 1) : a;
        this.coefficientB = b == undefined ? 0.000242 * this.motorcarCount * this.motorcarWeight + 0.0000275 * this.trailerCount * this.trailerWeight : b;
        this.coefficientC = c == undefined ? 0.0162 * this.motorcarCount * this.motorcarWeight + 0.00765 * this.trailerCount * this.trailerWeight : c;
    }
    getForce(speed: number): number {
        return this.coefficientA * speed * speed + this.coefficientB * speed + this.coefficientC;
    }

    getAcceleration(speed: number): number {
        const resistanceForce = this.coefficientA * speed * speed + this.coefficientB * speed + this.coefficientC;
        return -3.6 * resistanceForce / (this.motorcarCount * this.motorcarWeight * (this.motorcarInertiaFactor + 1) + this.trailerCount * this.trailerWeight * (this.trailerInertiaFactor + 1));
    }
}

