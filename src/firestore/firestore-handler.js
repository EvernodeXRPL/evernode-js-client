const https = require('https');
const { DefaultValues } = require('../defaults');

const FirestoreOperations = {
    EQUAL: 'EQUAL',
    AND: 'AND'
}

class FirestoreHandler {
    #projectId = null;
    #collectionPrefix = null;

    constructor(options = {}) {
        this.#projectId = options.stateIndexId || DefaultValues.stateIndexId;
        this.#collectionPrefix = options.collectionPrefix || DefaultValues.registryAddress;
    }

    #parseValue(key, value) {
        const ccKey = key.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); });
        const type = Object.keys(value)[0];
        let parsed;
        switch (type) {
            case 'integerValue':
                parsed = parseInt(value[type]);
                break;
            case 'floatValue':
                parsed = parseFloat(value[type]);
                break;
            default:
                parsed = value[type];
                break;
        }
        return { key: ccKey, value: parsed };
    }

    async #runQuery(body) {
        const url = this._buildApiPath(null, null, true);
        return await this._sendRequest('POST', url, null, body);
    }

    async #read(collectionId) {
        if (!collectionId)
            throw { type: 'Validation Error', message: 'collectionId is required' };

        const url = this._buildApiPath(collectionId);
        return await this._sendRequest('GET', url);
    }

    async #getDocuments(collectionId, filters = null) {
        let data;
        if (filters) {
            let where = {
                compositeFilter: {
                    filters: [],
                    op: filters.operator ? filters.operator : FirestoreOperations.AND
                }
            };
            for (const filter of filters.list) {
                let fieldFilter = {
                    field: { fieldPath: null },
                    op: filter.operator,
                    value: null
                }
                for (const [key, value] of Object.entries(filter)) {
                    if (key !== 'operator') {
                        const field = this._convertValue(key, value);
                        fieldFilter.field.fieldPath = field.key;
                        fieldFilter.value = field.value;
                    }
                }
                where.compositeFilter.filters.push({ fieldFilter: fieldFilter });
            }

            let body = {
                structuredQuery: {
                    where: where,
                    from: [{ collectionId: collectionId }]
                }
            };
            data = await this.#runQuery(body);
            data = data ? JSON.parse(data) : [];
            if (data && data.length && data[0].document) {
                return data.map(d => {
                    return this._parseDocument(d.document);
                });
            }
        }
        else {
            data = await this.#read(collectionId);
            data = data ? JSON.parse(data) : {};
            if (data.documents && data.documents.length) {
                return data.documents.map(d => {
                    return this._parseDocument(d);
                });
            }
        }

        return [];
    }

    _getCollectionId(collection) {
        return `${this.#collectionPrefix}_${collection}`
    }

    async _sendRequest(httpMethod, url, params = null, data = null, options = null) {
        const urlObj = new URL(url);
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value) {
                    if (typeof value === 'object') {
                        for (const val of value) {
                            if (val)
                                urlObj.searchParams.append(key, val);
                        }
                    }
                    else
                        urlObj.searchParams.set(key, value);
                }
            }
        }

        return new Promise(async (resolve, reject) => {
            let reqOptions = {
                method: httpMethod,
                protocol: urlObj.protocol,
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: `${urlObj.pathname}?${urlObj.searchParams.toString()}`,
                ...(options ? options : {})
            };

            const req = https.request(reqOptions, (res) => {
                let resData = '';
                res.on('data', (d) => {
                    resData += d;
                });
                res.on('end', async () => {
                    if (res.statusCode === 200) {
                        resolve(resData);
                        return;
                    }
                    reject({ status: res.statusCode, data: resData });
                    return;
                });
            }).on('error', async (e) => {
                reject(e);
                return;
            });

            if (data)
                req.write(typeof data === 'object' ? JSON.stringify(data) : data);

            req.end();
        });
    }

    _buildApiPath(collectionId = null, documentId = null, isQuery = false) {
        let path = `https://firestore.googleapis.com/v1/projects/${this.#projectId}/databases/(default)/documents`;
        if (collectionId)
            path += `/${collectionId.toString()}`;
        if (documentId)
            path += `/${documentId.toString()}`;
        if (isQuery)
            path += ':runQuery';
        return path;
    }

    _convertValue(key, value) {
        const uKey = key.replace(/([A-Z])/g, function (g) { return `_${g[0].toLocaleLowerCase()}`; });
        const type = `${typeof value !== 'number' ? 'string' : (value % 1 > 0 ? 'float' : 'integer')}Value`;
        let obj = {};
        obj[type] = value;
        return { key: uKey, value: obj };
    }

    _parseDocument(document) {
        let item = {
            id: document.name.split('/').pop(),
            createTime: new Date(document.createTime),
            updateTime: new Date(document.updateTime)
        };
        for (const [key, value] of Object.entries(document.fields)) {
            const field = this.#parseValue(key, value);
            item[field.key] = field.value;
        }
        return item;
    }

    async getHosts(filters = null) {
        return await this.#getDocuments(this._getCollectionId('hosts'), filters);
    }

    async getConfigs(filters = null) {
        return await this.#getDocuments(this._getCollectionId('configs'), filters);
    }
}

module.exports = {
    FirestoreHandler,
    FirestoreOperations
}