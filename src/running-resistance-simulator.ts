import { Parameters } from './load-text-funcs.js';

/**
 * Running resistance simulator.
 */
export class RunningResistanceSimulator {
    private motorcarWeight: number;
    private trailerWeight: number;
    private motorcarCount: number;
    private trailerCount: number;
    private motorcarInertiaFactor: number;
    private trailerInertiaFactor: number;

    private coefficientA: number;
    private coefficientB: number;
    private coefficientC: number;

    /**
     * 
     * @param parameters BVE Trainsim Vehicle Parameters data.
     * @param mw Motorcar weight [kg].
     * @param tw Trailer weight [kg].
     * @param mc Motorcar count [-].
     * @param tc Trailer count [-].
     * @param mif Motorcar inertia factor [-].
     * @param tif Trailer inertia factor [-].
     * @param a Running resistance quadratic coefficient.
     * @param b Running resistance linear coefficient.
     * @param c Running resistance constant.
     */
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

    /**
     * Get running resistance force from train speed.
     * @param speed Train speed [km/h].
     * @returns Running resistance force [N].
     */
    getForce(speed: number): number {
        return this.coefficientA * speed * speed + this.coefficientB * speed + this.coefficientC;
    }

    /**
     * Get running resistance as acceleration from train speed.
     * @param speed Train speed [km/h].
     * @returns Running resistance represented as acceleration [km/h/s].
     */
    getAcceleration(speed: number): number {
        const resistanceForce = this.coefficientA * speed * speed + this.coefficientB * speed + this.coefficientC;
        return (-3.6 * resistanceForce) / (this.motorcarCount * this.motorcarWeight * (this.motorcarInertiaFactor + 1) + this.trailerCount * this.trailerWeight * (this.trailerInertiaFactor + 1));
    }
}
