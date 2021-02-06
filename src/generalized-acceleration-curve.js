/**
 * 
 * @param {number} a0 
 * @param {number} [a1]
 * @param {number} [v0] 
 * @param {number} [v1] 
 * @param {number} [e] 
 */
export class GeneralizedAccelerationCurve {
    constructor(a0, a1, v0, v1, e) {
        this.a0 = a0;
        this.a1 = !isNaN(a1) ? a1 : a0;
        this.v0 = !isNaN(v0) ? v0 : 1000;
        this.v1 = !isNaN(v1) ? v1 : 1000;
        this.e = !isNaN(e) ? e : 2;
    }

    getAcceleration(speed) {
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
                return a1 * v0 / speed;
            }
        } else {
            if (speed === 0) {
                return 0;
            } else if (v1 === 0) {
                return a1 * v0 / speed;
            } else {
                return a1 * v0 / v1 * (v1 / speed) ** e;
            }
        }
    }
}