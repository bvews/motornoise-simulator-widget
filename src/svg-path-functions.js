
function bveDegToRad(degree) {
    return (degree + 270) / 180.0 * Math.PI;
}

function generateArcPath(radius, minAngle, maxAngle) {
    radius = parseFloat(radius);
    minAngle = parseFloat(minAngle);
    maxAngle = parseFloat(maxAngle);

    if (minAngle === maxAngle) {
        var minCos = Math.cos(bveDegToRad(minAngle));
        var maxCos = Math.cos(bveDegToRad(maxAngle - 0.01));
        var minSin = Math.sin(bveDegToRad(minAngle));
        var maxSin = Math.sin(bveDegToRad(maxAngle - 0.01));
        var largeArcFlag = '1';

        var values = [];
        values[0] = "M";
        values[1] = minCos * radius;
        values[2] = minSin * radius;
        values[3] = "A";
        values[4] = radius;
        values[5] = radius;
        values[6] = "0";
        values[7] = largeArcFlag;
        values[8] = "1";
        values[9] = maxCos * radius;
        values[10] = maxSin * radius;
        values[11] = "Z";
        return values.join(' ');
    }

    var minCos = Math.cos(bveDegToRad(minAngle));
    var maxCos = Math.cos(bveDegToRad(maxAngle));
    var minSin = Math.sin(bveDegToRad(minAngle));
    var maxSin = Math.sin(bveDegToRad(maxAngle));
    var largeArcFlag = maxAngle - minAngle > 180 ? '1' : '0';

    var values = [];
    values[0] = "M";
    values[1] = minCos * radius;
    values[2] = minSin * radius;
    values[3] = "A";
    values[4] = radius;
    values[5] = radius;
    values[6] = "0";
    values[7] = largeArcFlag;
    values[8] = "1";
    values[9] = maxCos * radius;
    values[10] = maxSin * radius;
    //values[11] = "Z";
    return values.join(' ');
}

function generateLinePath(rMin, rMax, innerWidth, outerWidth, angle) {
    angle = bveDegToRad(angle);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const values = [];
    values[0] = "M";

    values[1] = rMin * cos - innerWidth / 2 * sin;
    values[2] = rMin * sin + innerWidth / 2 * cos;

    values[3] = rMin * cos + innerWidth / 2 * sin;
    values[4] = rMin * sin - innerWidth / 2 * cos;

    values[5] = rMax * cos + outerWidth / 2 * sin;
    values[6] = rMax * sin - outerWidth / 2 * cos;

    values[7] = rMax * cos - outerWidth / 2 * sin;
    values[8] = rMax * sin + outerWidth / 2 * cos;

    values[9] = "Z";
    return values.join(' ');
}

function generateNeedlePath(rMin, rMid, rMax, innerWidth, middleWidth, outerWidth, angle) {
    angle = bveDegToRad(angle);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const values = [];
    values[0] = "M";

    values[1] = rMin * cos - innerWidth / 2 * sin;
    values[2] = rMin * sin + innerWidth / 2 * cos;

    values[3] = rMin * cos + innerWidth / 2 * sin;
    values[4] = rMin * sin - innerWidth / 2 * cos;

    values[5] = rMid * cos + middleWidth / 2 * sin;
    values[6] = rMid * sin - middleWidth / 2 * cos;

    values[7] = rMax * cos + outerWidth / 2 * sin;
    values[8] = rMax * sin - outerWidth / 2 * cos;

    values[9] = rMax * cos - outerWidth / 2 * sin;
    values[10] = rMax * sin + outerWidth / 2 * cos;

    values[11] = rMid * cos - middleWidth / 2 * sin;
    values[12] = rMid * sin + middleWidth / 2 * cos;

    values[13] = "Z";
    return values.join(' ');
}