const { MemoFormats } = require('./evernode-common');

class TransactionHelper {

    // Convert memos from our object type to xrpl lib object type.
    static formatMemos(memos) {
        return memos ? memos.filter(m => m.type).map(m => {
            const data = (m.format === MemoFormats.HEX) ? m.data :
                TransactionHelper.asciiToHex((typeof m.data === "object") ? JSON.stringify(m.data) : m.data)
            return {
                Memo: {
                    MemoType: TransactionHelper.asciiToHex(m.type),
                    MemoFormat: TransactionHelper.asciiToHex(m.format),
                    MemoData: data
                }
            }
        }) : [];
    }

    // Convert memos from xrpl lib object type to our object type.
    static deserializeMemos(memos) {
        if (!memos)
            return [];

        return memos.filter(m => m.Memo).map(m => {
            const format = m.Memo.MemoFormat ? TransactionHelper.hexToASCII(m.Memo.MemoFormat) : null;
            const data = m.Memo.MemoData ?
                ((format === MemoFormats.HEX) ? m.Memo.MemoData : TransactionHelper.hexToASCII(m.Memo.MemoData)) : null;
            return {
                type: m.Memo.MemoType ? TransactionHelper.hexToASCII(m.Memo.MemoType) : null,
                format: format,
                data: data
            }
        })
    }

    static hexToASCII(hex) {
        if (!hex)
            return "";

        let str = "";
        for (let n = 0; n < hex.length; n += 2) {
            str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
        }
        return str;
    }

    static asciiToHex(str) {
        if (!str)
            return "";

        let hex = "";
        for (let n = 0; n < str.length; n++) {
            hex += str.charCodeAt(n).toString(16)
        }
        return hex;
    }
}

module.exports = {
    TransactionHelper
}