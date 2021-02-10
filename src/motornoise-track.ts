import { LinearInterpolation } from './linear-interpolation';
import { Point } from './point';
import { AudioEntry } from './audio-entry';

export class MotornoiseTrack {
    public gainNode: GainNode;
    private _audioContext: AudioContext;
    private _audioEntry: AudioEntry;
    private _powerFrequency: LinearInterpolation;
    private _powerVolume: LinearInterpolation;
    private _brakeFrequency: LinearInterpolation;
    private _brakeVolume: LinearInterpolation;
    private _regenerationLimit: number;
    private _isRunningNoise: boolean;
    private _gainNode: GainNode;
    private _bufferNode?: AudioBufferSourceNode;
    private _volumePrev = 0;
    private _pitchPrev = 1;

    constructor(
        audioContext: AudioContext,
        audioEntry: AudioEntry,
        powerFrequency: Point[],
        powerVolume: Point[],
        brakeFrequency: Point[],
        brakeVolume: Point[],
        regenerationLimit: number,
        isRunningNoise: boolean
    ) {
        this._audioContext = audioContext;
        this._audioEntry = audioEntry;

        // Create gain node.
        this._gainNode = audioContext.createGain();
        this._gainNode.gain.value = 0;
        this._bufferNode = undefined;

        this._powerFrequency = new LinearInterpolation(powerFrequency);
        this._powerVolume = new LinearInterpolation(powerVolume);
        this._brakeFrequency = new LinearInterpolation(brakeFrequency);
        this._brakeVolume = new LinearInterpolation(brakeVolume);

        this._regenerationLimit = isNaN(regenerationLimit) ? 5 : regenerationLimit;
        this._isRunningNoise = isRunningNoise;

        this.gainNode = this._gainNode;
        //this._gainNode.connect(this._audioContext.destination);
    }

    /**
     * 
     * @param speed - Current train speed
     * @param acceleration - Current motor traction acceleration
     */
    update(speed: number, acceleration: number): void {
        if (!this._audioContext || !this._audioEntry || !this._audioEntry.buffer) {
            return;
        }

        let pitch = 1;
        let volume = 0;

        if (speed > 0) {
            if (!this._isRunningNoise) {
                if (acceleration > 0) {
                    pitch = this._powerFrequency.interpolate(speed);
                    volume = this._powerVolume.interpolate(speed);
                } else if (acceleration < 0) {
                    if (speed > this._regenerationLimit) {
                        pitch = this._brakeFrequency.interpolate(speed);
                        volume = this._brakeVolume.interpolate(speed);
                    } else {
                        pitch = 1;
                        volume = 0;
                    }
                } else {
                    pitch = 1;
                    volume = 0;
                }
            } else {
                pitch = this._powerFrequency.interpolate(speed);
                volume = this._powerVolume.interpolate(speed);
            }
        }
        this._updateSound(pitch, volume);
    }

    stop(): void {
        if (!this._audioContext || !this._audioEntry || !this._audioEntry.buffer) {
            return;
        }

        this._updateSound(1, 0);
    }

    private _updateSound(pitch: number, volume: number) {
        volume = volume > 1 ? 1 : volume;
        if (volume <= 0) {
            if (this._bufferNode !== undefined) {
                // Dispose AudioBufferSourceNode.
                this._bufferNode.stop();

                this._bufferNode.disconnect();
                //this._gainNode.disconnect();

                this._bufferNode = undefined;
            }
        } else {
            if (this._bufferNode === undefined) {
                // Create and connect AudioBufferSourceNode.
                this._bufferNode = this._audioContext.createBufferSource();
                this._bufferNode.buffer = this._audioEntry.buffer ?? null;
                this._bufferNode.loop = true;
                this._bufferNode.loopStart = this._audioEntry.leeway;
                this._bufferNode.loopEnd = this._audioEntry.leeway + this._audioEntry.length;
                this._bufferNode.playbackRate.value = 1;
                this._bufferNode.connect(this._gainNode);

                this._gainNode.gain.value = 0;
                //this._gainNode.connect(this._audioContext.destination);

                this._bufferNode.start(0, this._audioEntry.leeway);
            }

            this._bufferNode.playbackRate.value = pitch;
            this._gainNode.gain.value = volume;
            // this._bufferNode.playbackRate.setValueAtTime(this._pitchPrev, 0);
            // this._bufferNode.playbackRate.linearRampToValueAtTime(pitch, 1 / 60);
            // this._gainNode.gain.setValueAtTime(this._volumePrev, 0);
            // this._gainNode.gain.linearRampToValueAtTime(volume, 1 / 60);
        }
        this._pitchPrev = pitch;
        this._volumePrev = volume;
    }
}