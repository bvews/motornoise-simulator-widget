var textParser = textParser || {};

textParser = (function () {
    'use strict';
    /**
     * 
     * @param {string} text
     * @returns {Object.<string, Object.<string, string>>}
     */
    const parseIni = function (text) {
        'use strict';
        var result = {};

        text = text.replace('\r', '');
        var lines = text.split('\n');
        var section = '';

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            if (line.match(/^\[(.+)\]/)) {
                section = line.match(/^\[(.+)\]/)[1].toLowerCase();
                continue;
            }

            var match = line.match(/^(.+?)\s*?=\s*(.+)/);
            if (match) {
                var key = match[1].toLowerCase();
                var value = match[2];

                if (section !== '' && key !== '' && value !== '') {
                    if (!result[section]) {
                        result[section] = {};
                    }
                    result[section][key] = value;
                }
            }
        }

        return result;
    }

    /**
     * @typedef {Object} Point
     * @property {number} x
     * @property {number} y
     */

    /**
     * 
     * @param {string} text
     * @returns {Point[]}
     */
    const parseCsv = function (text) {
        'use strict';
        var result = [];

        text = text.replace('\r', '');
        var lines = text.split('\n');

        for (var i = 0; i < lines.length; i++) {
            var elements = lines[i].split(',');
            for (var j = 0; j < elements.length - 1; j++) {
                var x = parseFloat(elements[0]);
                var y = parseFloat(elements[j + 1]);
                if (!isNaN(x) && !isNaN(y)) {
                    if (!result[j]) {
                        result[j] = [];
                    }
                    result[j].push({ 'x': x, 'y': y });
                }
            }
        }

        return result;
    }

    const parseLines = function(text) {
        return text.split('\n');
    }

    return { parseIni: parseIni, parseCsv: parseCsv, parseLines: parseLines };
}());