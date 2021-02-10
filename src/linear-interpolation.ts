import { Point } from './point.js';

/**
 *
 * @param points
 */
export class LinearInterpolation {
    private x: number[] = [];
    private y: number[] = [];
    private slope = 0;
    private intercept = 0;
    private prevIndex = NaN;

    constructor(points: Point[]) {
        if (points) {
            // TODO: Resolve 'x' duplication.

            // Sort by 'x'.
            points.sort((a, b) => {
                return a.x - b.x;
            });

            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                this.x[i] = point.x;
                this.y[i] = point.y;
            }
        }
    }

    /**
     *
     * @param array
     * @param value
     */
    binarySearch(array: number[], value: number): number {
        let min = 0;
        let max = array.length - 1;
        let mid;

        while (max - min > 1) {
            mid = Math.floor((min + max) / 2);
            if (array[mid] <= value) {
                min = mid;
            } else {
                max = mid;
            }
        }
        return min;
    }

    /**
     *
     * @param value
     */
    interpolate(value: number): number {
        const x = this.x;
        const y = this.y;

        if (x.length == 0) {
            return 0;
        } else if (x.length == 1) {
            return y[0];
        } else {
            if (this.prevIndex !== null && value > x[this.prevIndex] && value <= x[this.prevIndex + 1]) {
                return this.slope * value + this.intercept;
            }

            let index;
            if (value <= x[0]) {
                index = 0;
            } else if (value > x[x.length - 1]) {
                index = x.length - 2;
            } else {
                index = this.binarySearch(x, value);
            }

            this.slope = (y[index + 1] - y[index]) / (x[index + 1] - x[index]);
            this.intercept = y[index] - this.slope * x[index];
            this.prevIndex = index;

            return this.slope * value + this.intercept;
        }
    }
}
