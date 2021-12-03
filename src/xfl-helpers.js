// Helper class to handle XFL float numbers.
class XflHelpers {

    static getExponent(xfl) {
        if (xfl < 0n)
            throw "Invalid XFL";
        if (xfl == 0n)
            return 0n;
        return ((xfl >> 54n) & 0xFFn) - 97n;
    }

    static getMantissa(xfl) {
        if (xfl < 0n)
            throw "Invalid XFL";
        if (xfl == 0n)
            return 0n;
        return xfl - ((xfl >> 54n) << 54n);
    }

    static isNegative(xfl) {
        if (xfl < 0n)
            throw "Invalid XFL";
        if (xfl == 0n)
            return false;
        return ((xfl >> 62n) & 1n) == 0n;
    }

    static toString(xfl) {
        if (xfl < 0n)
            throw "Invalid XFL";
        if (xfl == 0n)
            return '0';

        const mantissa = this.getMantissa(xfl);
        const exponent = this.getExponent(xfl);
        const mantissaStr = mantissa.toString();
        let finalResult = '';
        if (exponent > 0n) {
            finalResult = mantissaStr.padEnd(mantissaStr.length + Number(exponent), '0');
        } else {
            const newExponent = Number(exponent) + mantissaStr.length;
            const cleanedMantissa = mantissaStr.replace(/0+$/, '');
            if (newExponent == 0) {
                finalResult = '0.' + cleanedMantissa;
            } else if (newExponent < 0) {
                finalResult = '0.' + cleanedMantissa.padStart(newExponent * (-1) + cleanedMantissa.length, '0');
            } else {
                finalResult = cleanedMantissa.substr(0, newExponent) + '.' + cleanedMantissa.substr(newExponent);
            }
        }
        return (this.isNegative(xfl) ? '-' : '') + finalResult;


    }
}

module.exports = {
    XflHelpers
}