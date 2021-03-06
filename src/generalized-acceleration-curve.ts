/**
 * Simple acceleration curve simulator.
 */
export class GeneralizedAccelerationCurve {
    private a0 = 0;
    private a1 = 0;
    private v0 = 1000;
    private v1 = 1000;
    private e = 2;

    /**
     *
     * @param a0 Acceleration at start up [km/h/s].
     * @param a1 Acceleration at constant acceleration region end [km/h/s].
     * @param v0 Constant acceleration region end speed [km/h].
     * @param v1 Constant power region end speed [km/h].
     * @param e Acceleration decreasing coefficient on high speed region [-].
     */
    constructor(a0: number, a1?: number, v0?: number, v1?: number, e?: number) {
        this.a0 = a0;
        this.a1 = a1 != undefined ? a1 : a0;
        this.v0 = v0 != undefined ? v0 : 1000;
        this.v1 = v1 != undefined ? v1 : 1000;
        this.e = e != undefined ? e : 2;
    }


    /**
     * Get current train acceleration.
     * @param speed Train speed.
     * @returns Train acceleration. If it is negative value, it represents deceleration.
     */
    getAcceleration(speed: number): number {
        const a0 = this.a0;
        const a1 = this.a1;
        const v0 = this.v0;
        const v1 = this.v1;
        const e = this.e;
        if (speed < v0) {
            if (v0 === 0) {
                return a1;
            } else if (a0 === a1) {
                return a1;
            } else {
                return a0 + (a1 - a0) * (speed / v0);
            }
        } else if (speed < v1) {
            if (speed === 0) {
                return 0;
            } else {
                return (a1 * v0) / speed;
            }
        } else {
            if (speed === 0) {
                return 0;
            } else if (v1 === 0) {
                return (a1 * v0) / speed;
            } else {
                return ((a1 * v0) / v1) * (v1 / speed) ** e;
            }
        }
    }
}
