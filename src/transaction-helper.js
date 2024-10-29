const { MemoFormats, HookParamKeys } = require('./evernode-common');

/**
 * Provides various utility functions for working with Xahau Transactions.
 */
class TransactionHelper {

    /**
     * Converts an array of memos from the internal format to the XRPL library format.
     * @param {Array<Object>} memos - An array of memo objects in the internal format.
     * @returns {Array<Object>} An array of memo objects in the XRPL library format.
     */
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

    /**
     * Converts an array of memos from the XRPL library format to the internal format.
     * @param {Array<Object>} memos - An array of memo objects in the XRPL library format.
     * @returns {Array<Object>} An array of memo objects in the internal format.
     */
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

    /**
     * Converts an array of hook parameters from the internal format to the XRPL library format.
     * @param {Array<Object>} params - An array of hook parameter objects in the internal format.
     * @returns {Array<Object>} An array of hook parameter objects in the XRPL library format.
     */
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

    /**
     * Converts an array of hook parameters from the XRPL library format to the internal format.
     * @param {Array<Object>} params - An array of hook parameter objects in the XRPL library format.
     * @returns {Array<Object>} An array of hook parameter objects in the internal format.
     */
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

    /**
     * Converts a hexadecimal string to an ASCII string.
     * @param {string} hex - The hexadecimal string to be converted.
     * @returns {string} The resulting ASCII string.
     */
    static hexToASCII(hex) {
        if (!hex)
            return "";

        return Buffer.from(hex, 'hex').toString();
    }

    /**
     * Converts an ASCII string to a hexadecimal string.
     * @param {string} str - The ASCII string to be converted.
     * @returns {string} The resulting hexadecimal string.
     */
    static asciiToHex(str) {
        if (!str)
            return "";

        return Buffer.from(str).toString('hex').toUpperCase();
    }
}

module.exports = {
    TransactionHelper
}