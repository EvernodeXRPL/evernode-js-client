const https = require('https');
const { Defaults } = require('../defaults');

const FirestoreOperations = {
    EQUAL: 'EQUAL',
    AND: 'AND'
}

class FirestoreHandler {
    #projectId = null;
    #collectionPrefix = null;

    constructor(options = {}) {
        if (!Defaults.values.useCentralizedRegistry) {
            console.warn("Please change the useCentralizedRegistry flag to true in Defaults if you want to use this function!")
            throw new Error("Centralized function is in use!!")
        }
        this.#projectId = options.stateIndexId || Defaults.values.stateIndexId;
        this.#collectionPrefix = options.collectionPrefix || Defaults.values.governorAddress;
    }

    /**
     * Convert given document value object to real format and snake_case key to camelCase.
     * @param key Name of the property.
     * @param value Value to be parsed.
     * @returns Parsed key and value.
     */
    #parseValue(key, value) {
        // Convert snake_case to camelCase.
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
            case 'mapValue':
                parsed = {};
                for (const [subKey, subValue] of Object.entries(value[type].fields)) {
                    const field = this.#parseValue(subKey, subValue);
                    parsed[field.key] = field.value;
                }
                break;
            default:
                parsed = value[type];
                break;
        }
        return { key: ccKey, value: parsed };
    }

    /**
     * Get values filtered according to the given body.
     * @param body Body to parsed in to the query reqest.
     * @returns Result set.
     */
    async #runQuery(body) {
        const url = this.buildApiPath(null, null, true);
        return await this.sendRequest('POST', url, null, body);
    }

    /**
     * Get documents from a collection.
     * @param collectionId Name of the collection.
     * @param pageSize Optianal page size if result set needed to be paginated
     * @param nextPageToken Next page token of a paginated result set.
     * @returns Result set.
     */
    async #read(collectionId, pageSize = null, nextPageToken = null) {
        if (!collectionId)
            throw { type: 'Validation Error', message: 'collectionId is required' };

        const url = this.buildApiPath(collectionId);
        let params = (pageSize || nextPageToken) ? {} : null;
        if (pageSize)
            params = { pageSize: pageSize };
        if (nextPageToken)
            params = { pageToken: nextPageToken, ...params };

        return await this.sendRequest('GET', url, params);
    }

    /**
     * Get documents from a collection with filtering support.
     * @param collectionId Name of the collection.
     * @param filter Optional filters to filter documents.
     * @param pageSize Optianal page size if result set needed to be paginated
     * @param nextPageToken Next page token of a paginated result set.
     * @returns Parsed readable result set.
     */
    async #getDocuments(collectionId, filters = null, pageSize = null, nextPageToken = null) {
        if (filters && (pageSize || nextPageToken))
            throw { type: 'Validation Error', message: 'Pagination isn\'t supported with filter.' };

        let data;
        // If there are filters send requst in query mode.
        if (filters) {
            // Prepare the query body from given filters.
            let where = {
                compositeFilter: {
                    filters: Object.entries(filters).map(([key, value]) => {
                        const field = this.convertValue(key, value);
                        return {
                            fieldFilter: {
                                field: { fieldPath: field.key },
                                op: FirestoreOperations.EQUAL,
                                value: field.value
                            }
                        }
                    }),
                    op: filters.operator ? filters.operator : FirestoreOperations.AND
                }
            };
            for (const [key, value] of Object.entries(filters)) {
                const field = this.convertValue(key, value);
                let fieldFilter = {
                    field: { fieldPath: field.key },
                    op: FirestoreOperations.EQUAL,
                    value: field.value
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
                    return this.parseDocument(d.document);
                });
            }
        }
        else {
            data = await this.#read(collectionId, pageSize, nextPageToken);
            data = data ? JSON.parse(data) : {};
            if (data.documents && data.documents.length) {
                const list = data.documents.map(d => {
                    return this.parseDocument(d);
                });
                return data.nextPageToken ? {
                    data: list,
                    nextPageToken: data.nextPageToken
                } : list;
            }
        }

        return [];
    }

    getCollectionId(collection) {
        // Document if is generated with given prefix.
        return `${this.#collectionPrefix}_${collection}`;
    }

    /**
     * Send http requst.
     * @param httpMethod GET/POST/PATCH/DELETE
     * @param url Url for the request.
     * @param params Optional query params.
     * @param data Optional request body.
     * @param options Optional options.
     * @returns Result set.
     */
    async sendRequest(httpMethod, url, params = null, data = null, options = null) {
        const urlObj = new URL(url);
        // Populate uri params to the URL object.
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value) {
                    // If value is a array, populate it with same name.
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

        let reqOptions = {
            method: httpMethod,
            protocol: urlObj.protocol,
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: `${urlObj.pathname}?${urlObj.searchParams.toString()}`,
            ...(options ? options : {})
        };

        return new Promise(async (resolve, reject) => {
            // Send request and collect data chuncks to a buffer. Then return the result set on end event.
            // Resolve only if the status is 200.
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

    /**
     * Generate url for firestore.
     * @param collectionId Optional collection name.
     * @param documentId Optional document name.
     * @param isQuery Whether a query request or not.
     * @returns The generated url.
     */
    buildApiPath(collectionId = null, documentId = null, isQuery = false) {
        let path = `https://firestore.googleapis.com/v1/projects/${this.#projectId}/databases/(default)/documents`;
        if (collectionId)
            path += `/${collectionId.toString()}`;
        if (documentId)
            path += `/${documentId.toString()}`;
        if (isQuery)
            path += ':runQuery';
        return path;
    }

    /**
     * Generate firestore document value object from given key and value, Convert camelCase key to snake_case.
     * @param key Name of the value.
     * @param value Value to be parsed.
     * @returns Generated firestore document object.
     */
    convertValue(key, value) {
        // Convert camelCase to snake_case.
        const uKey = key.replace(/([A-Z])/g, function (g) { return `_${g[0].toLocaleLowerCase()}`; });
        let val = {};
        let type
        switch (typeof value) {
            case 'number':
                type = (value % 1 > 0 ? 'float' : 'integer');
                val = value;
                break;
            case 'object':
                type = 'map';
                val = {
                    fields: {}
                }
                // Prepare the firestore write body with the given data object.
                for (const [subKey, subValue] of Object.entries(value)) {
                    const field = this.convertValue(subKey, subValue);
                    val.fields[field.key] = field.value;
                }
                break;
            case 'boolean':
                type = 'boolean';
                val = value;
                break;
            default:
                type = 'string';
                val = value;
                break;
        }
        type = `${type}Value`;
        let obj = {};
        obj[type] = val;
        return { key: uKey, value: obj };
    }

    /**
     * Convert the firestore document to human readable simplified json object.
     * @param document Firestore document.
     * @returns Simplified json object for the document.
     */
    parseDocument(document) {
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

    async getCandidates(filters = null, pageSize = null, nextPageToken = null) {
        return await this.#getDocuments(this.getCollectionId('candidates'), filters, pageSize, nextPageToken);
    }

    async getHosts(filters = null, pageSize = null, nextPageToken = null) {
        return await this.#getDocuments(this.getCollectionId('hosts'), filters, pageSize, nextPageToken);
    }

    async getConfigs(filters = null, pageSize = null, nextPageToken = null) {
        return await this.#getDocuments(this.getCollectionId('configs'), filters, pageSize, nextPageToken);
    }
}

module.exports = {
    FirestoreHandler,
    FirestoreOperations
}