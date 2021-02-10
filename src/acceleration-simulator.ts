import { GeneralizedAccelerationCurve } from './generalized-acceleration-curve';
import { Parameters, TrainDat } from './load-text-funcs';

export class AccelerationSimulator {
    public maxPowerNotch = 5;
    public maxBrakeNotch = 7;
    private accelerationCurves: GeneralizedAccelerationCurve[] = [];
    private decelerationCurves: GeneralizedAccelerationCurve[] = [];

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
