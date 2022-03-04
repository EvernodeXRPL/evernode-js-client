const { RequestManager } = require("./request-manager");

const FirestoreOperations = {
    EQUAL: 'EQUAL',
    AND: 'AND'
}

class FirestoreHandler {
    #projectId = null;
    #requestManager = null;

    constructor(projectId) {
        this.#requestManager = new RequestManager();
        this.#projectId = projectId;
    }

    async authorize(saKeyPath) {
        await this.#requestManager.authorize(saKeyPath);
    }

    #buildApiPath(collectionId = null, documentId = null, isQuery = false) {
        let path = `https://firestore.googleapis.com/v1/projects/${this.#projectId}/databases/(default)/documents`;
        if (collectionId)
            path += `/${collectionId.toString()}`;
        if (documentId)
            path += `/${documentId.toString()}`;
        if (isQuery)
            path += ':runQuery';
        return path;
    }

    async #runQuery(body) {
        const url = this.#buildApiPath(null, null, true);
        const data = await this.#requestManager.post(url, null, body);
        return data;
    }

    async #write(collectionId, document, documentId, update = false) {
        if (!collectionId || !document || !documentId)
            throw { type: 'Validation Error', message: 'collectionId, document and documentId are required' };

        const url = this.#buildApiPath(collectionId, update && documentId);
        let params = null;
        if (update)
            params = { "updateMask.fieldPaths": Object.keys(document.fields) };
        else
            params = { documentId: documentId }
        const data = !update ? await this.#requestManager.post(url, params, document) : await this.#requestManager.patch(url, params, document);
        return data;
    }

    async #delete(collectionId, documentId) {
        if (!collectionId || !documentId)
            throw { type: 'Validation Error', message: 'collectionId and documentId is required' };

        const url = this.#buildApiPath(collectionId, documentId);
        const data = await this.#requestManager.delete(url);
        return data;
    }

    async #read(collectionId) {
        if (!collectionId)
            throw { type: 'Validation Error', message: 'collectionId is required' };

        const url = this.#buildApiPath(collectionId);
        const data = await this.#requestManager.get(url);
        return data;
    }

    #convertValue(key, value) {
        const uKey = key.replace(/([A-Z])/g, function (g) { return `_${g[0].toLocaleLowerCase()}`; });
        const type = `${typeof value !== 'number' ? 'string' : (value % 1 > 0 ? 'float' : 'integer')}Value`;
        let obj = {};
        obj[type] = value;
        return { key: uKey, value: obj };
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

    #parseDocument(document) {
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

    async getDocuments(collectionId, filters = null) {
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
                        const field = this.#convertValue(key, value);
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
                    return this.#parseDocument(d.document);
                });
            }
        }
        else {
            data = await this.#read(collectionId);
            data = data ? JSON.parse(data) : {};
            if (data.documents && data.documents.length) {
                return data.documents.map(d => {
                    return this.#parseDocument(d);
                });
            }
        }

        return [];
    }

    async addDocument(collectionId, data, documentId) {
        let document = {
            fields: {}
        };

        for (const [key, value] of Object.entries(data)) {
            const field = this.#convertValue(key, value)
            document.fields[field.key] = field.value;
        }

        let res = await this.#write(collectionId, document, documentId);
        res = res ? JSON.parse(res) : {};
        return this.#parseDocument(res);
    }

    async updateDocument(collectionId, data, documentId) {
        let document = {
            fields: {}
        };

        for (const [key, value] of Object.entries(data)) {
            const field = this.#convertValue(key, value)
            document.fields[field.key] = field.value;
        }

        let res = await this.#write(collectionId, document, documentId, true);
        res = res ? JSON.parse(res) : {};
        return this.#parseDocument(res);
    }

    async deleteDocument(collectionId, documentId) {
        let res = await this.#delete(collectionId, documentId);
        if (res)
            return `Successfully deleted document ${collectionId}/${documentId}`;
        return false;
    }
}

module.exports = {
    FirestoreHandler,
    FirestoreOperations
}