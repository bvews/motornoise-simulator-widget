/**
 * 
 * @param {number} a0 
 * @param {number} [a1]
 * @param {number} [v0] 
 * @param {number} [v1] 
 * @param {number} [e] 
 */
function GeneralizedAccelerationCurve(a0, a1, v0, v1, e) {
    'use strict';
    a0 = a0;
    a1 = !isNaN(a1) ? a1 : a0;
    v0 = !isNaN(v0) ? v0 : 1000;
    v1 = !isNaN(v1) ? v1 : 1000;
    e = !isNaN(e) ? e : 2;

    this.getAcceleration = function (speed) {
        'use strict';
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
                return a1 * v0 / v1 * Math.pow(v1 / speed, e);
            }
        }
    }
}