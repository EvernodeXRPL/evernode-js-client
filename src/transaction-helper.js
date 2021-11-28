export class TransactionHelper {

    // Convert memos from our object type to xrpl lib object type.
    static formatMemos(memos) {
        return memos ? memos.filter(m => m.type).map(m => {
            return {
                Memo: {
                    MemoType: TransactionHelper.asciiToHex(m.type),
                    MemoFormat: TransactionHelper.asciiToHex(m.format),
                    MemoData: TransactionHelper.asciiToHex((typeof m.data === "object") ? JSON.stringify(m.data) : m.data)
                }
            }
        }) : [];
    }

    // Convert memos from xrpl lib object type to our object type.
    static deserializeMemos(memos) {
        if (!memos)
            return [];

        return memos.filter(m => m.Memo).map(m => {
            return {
                type: m.Memo.MemoType ? TransactionHelper.hexToASCII(m.Memo.MemoType) : null,
                format: m.Memo.MemoFormat ? TransactionHelper.hexToASCII(m.Memo.MemoFormat) : null,
                data: m.Memo.MemoData ? TransactionHelper.hexToASCII(m.Memo.MemoData) : null
            }
        })
    }

    static hexToASCII(hex) {
        let str = "";
        for (let n = 0; n < hex.length; n += 2) {
            str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
        }
        return str;
    }

    static asciiToHex(str) {
        let hex = "";
        for (let n = 0; n < str.length; n ++) {
            hex += str.charCodeAt(n).toString(16)
        }
        return hex;
    }
}