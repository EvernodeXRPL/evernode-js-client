export class TransactionHelper {

    static formatMemos(memos) {
        return memos ? memos.filter(m => m.type).map(m => {
            return {
                MemoType: m.type,
                MemoFormat: m.format,
                MemoData: (typeof m.data === "object") ? JSON.stringify(m.data) : m.data
            }
        }) : [];
    }

    static deserializeMemo(memo) {
        return {
            type: memo.MemoType ? TransactionHelper.hexToASCII(memo.MemoType) : null,
            format: memo.MemoFormat ? TransactionHelper.hexToASCII(memo.MemoFormat) : null,
            data: memo.MemoData ? TransactionHelper.hexToASCII(memo.MemoData) : null
        };
    }

    static hexToASCII(hex) {
        let str = "";
        for (let n = 0; n < hex.length; n += 2) {
            str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
        }
        return str;
    }
}