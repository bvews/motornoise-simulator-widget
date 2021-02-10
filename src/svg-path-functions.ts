
function bveDegToRad(degree: number): number {
    return (degree + 270) / 180.0 * Math.PI;
}

export function generateArcPath(radius: number | string, minAngle: number | string, maxAngle: number | string): string {
    radius = typeof radius === 'string' ? parseFloat(radius) : radius;
    minAngle = typeof minAngle === 'string' ? parseFloat(minAngle) : minAngle;
    maxAngle = typeof maxAngle === 'string' ? parseFloat(maxAngle) : maxAngle;

    if (minAngle === maxAngle) {
        const minCos = Math.cos(bveDegToRad(minAngle));
        const maxCos = Math.cos(bveDegToRad(maxAngle - 0.01));
        const minSin = Math.sin(bveDegToRad(minAngle));
        const maxSin = Math.sin(bveDegToRad(maxAngle - 0.01));
        const largeArcFlag = '1';

        const values = [];
        values[0] = 'M';
        values[1] = minCos * radius;
        values[2] = minSin * radius;
        values[3] = 'A';
        values[4] = radius;
        values[5] = radius;
        values[6] = '0';
        values[7] = largeArcFlag;
        values[8] = '1';
        values[9] = maxCos * radius;
        values[10] = maxSin * radius;
        values[11] = 'Z';
        return values.join(' ');
    } else {
        const minCos = Math.cos(bveDegToRad(minAngle));
        const maxCos = Math.cos(bveDegToRad(maxAngle));
        const minSin = Math.sin(bveDegToRad(minAngle));
        const maxSin = Math.sin(bveDegToRad(maxAngle));
        const largeArcFlag = maxAngle - minAngle > 180 ? '1' : '0';

        const values = [];
        values[0] = 'M';
        values[1] = minCos * radius;
        values[2] = minSin * radius;
        values[3] = 'A';
        values[4] = radius;
        values[5] = radius;
        values[6] = '0';
        values[7] = largeArcFlag;
        values[8] = '1';
        values[9] = maxCos * radius;
        values[10] = maxSin * radius;
        //values[11] = "Z";
        return values.join(' ');
    }
}

function generateLinePath(rMin: number, rMax: number, innerWidth: number, outerWidth: number, angle: number): string {
    angle = bveDegToRad(angle);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const values = [];
    values[0] = 'M';

    values[1] = rMin * cos - innerWidth / 2 * sin;
    values[2] = rMin * sin + innerWidth / 2 * cos;

    values[3] = rMin * cos + innerWidth / 2 * sin;
    values[4] = rMin * sin - innerWidth / 2 * cos;

    values[5] = rMax * cos + outerWidth / 2 * sin;
    values[6] = rMax * sin - outerWidth / 2 * cos;

    values[7] = rMax * cos - outerWidth / 2 * sin;
    values[8] = rMax * sin + outerWidth / 2 * cos;

    values[9] = 'Z';
    return values.join(' ');
}

function generateNeedlePath(rMin: number, rMid: number, rMax: number, innerWidth: number, middleWidth: number, outerWidth: number, angle: number): string {
    angle = bveDegToRad(angle);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const values = [];
    values[0] = 'M';

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

    values[13] = 'Z';
    return values.join(' ');
}