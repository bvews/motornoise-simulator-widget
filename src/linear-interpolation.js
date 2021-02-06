/**
 * @typedef {Object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * 
 * @param {Point[]} points 
 */
function LinearInterpolation(points) {
    'use strict';
    /** @type {number[]} */
    this.x = [];
    /** @type {number[]} */
    this.y = [];
    /** @type {number} */
    this.slope = 0;
    /** @type {number} */
    this.intercept = 0;
    /** @type {number} */
    this.prevIndex = null;

    if (points) {
        // TODO: Resolve 'x' duplication.

        // Sort by 'x'.
        points.sort(function (a, b) {
            'use strict';
            return a.x - b.x;
        });

        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            this.x[i] = point.x;
            this.y[i] = point.y;
        }
    }
}

/**
 * 
 * @param {number[]} array 
 * @param {number} value 
 */
LinearInterpolation.prototype.binarySearch = function (array, value) {
    'use strict';
    var min = 0;
    var max = array.length - 1;
    var mid;

    while (max - min > 1) {
        mid = Math.floor((min + max) / 2);
        if (array[mid] <= value) {
            min = mid;
        }
        else {
            max = mid;
        }
    }
    return min;
}

/**
 * 
 * @param {number} value 
 */
LinearInterpolation.prototype.interpolate = function (value) {
    'use strict';
    var x = this.x;
    var y = this.y;

    if (x.length == 0) {
        return 0;
    }
    else if (x.length == 1) {
        return y[0];
    }
    else {
        if (this.prevIndex !== null && value > x[this.prevIndex] && value <= x[this.prevIndex + 1]) {
            return this.slope * value + this.intercept;
        }

        var index;
        if (value <= x[0]) {
            index = 0;
        }
        else if (value > x[x.length - 1]) {
            index = x.length - 2;
        }
        else {
            index = this.binarySearch(x, value);
        }

        this.slope = (y[index + 1] - y[index]) / (x[index + 1] - x[index]);
        this.intercept = y[index] - this.slope * x[index];
        this.prevIndex = index;

        return this.slope * value + this.intercept;
    }
}