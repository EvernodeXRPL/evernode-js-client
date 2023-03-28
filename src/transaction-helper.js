const { MemoFormats, HookParamKeys } = require('./evernode-common');

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

    // Convert hook params from our object type to xrpl lib object type.
    static formatHookParams(params) {
        return params ? params.filter(m => m.name).map(m => {
            return {
                HookParameter: {
                    HookParameterName: m.name,
                    HookParameterValue: m.value ?
                        (m.name === HookParamKeys.PARAM_EVENT_TYPE_KEY ? TransactionHelper.asciiToHex(m.value) :
                            m.value.toUpperCase()) : ''
                }
            }
        }) : [];
    }

    // Convert hook params from xrpl lib object type to our object type.
    static deserializeHookParams(params) {
        if (!params)
            return [];

        return params.filter(m => m.HookParameter).map(m => {
            return {
                name: m.HookParameter.HookParameterName,
                value: m.HookParameter.HookParameterValue ?
                    (m.HookParameter.HookParameterName === HookParamKeys.PARAM_EVENT_TYPE_KEY ? TransactionHelper.hexToASCII(m.HookParameter.HookParameterValue) :
                        m.HookParameter.HookParameterValue.toUpperCase()) : '',
            }
        })
    }

    static hexToASCII(hex) {
        if (!hex)
            return "";

        return Buffer.from(hex, 'hex').toString();
    }

    static asciiToHex(str) {
        if (!str)
            return "";

        return Buffer.from(str).toString('hex').toUpperCase();
    }
}

module.exports = {
    TransactionHelper
}