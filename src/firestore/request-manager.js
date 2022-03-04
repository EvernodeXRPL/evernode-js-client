const { Buffer } = require('buffer');
const https = require('https');
const { google } = require("googleapis");
var fs = require('fs');

const SCOPES = [
    "https://www.googleapis.com/auth/datastore"
];

const HTTPMETHODS = {
    GET: 'GET',
    POST: 'POST',
    PATCH: 'PATCH',
    DELETE: 'DELETE'
}

class RequestManager {
    #saKeyPath = null;
    #accessToken = null;
    #tokenExpiry = null;

    async authorize(saKeyPath) {
        this.#saKeyPath = saKeyPath;
        await this.#authorize();
    }

    async #authorize() {
        const key = JSON.parse(fs.readFileSync(this.#saKeyPath));
        const jwtClient = new google.auth.JWT(
            key.client_email,
            null,
            key.private_key,
            SCOPES,
            null
        );
        return new Promise((resolve, reject) => {
            jwtClient.authorize((err, tokens) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.#accessToken = tokens.access_token;
                this.#tokenExpiry = tokens.expiry_date;
                resolve();
                return;
            });
        });
    }

    async #request(method, url, params = null, data = null, options = null) {
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
                method: method,
                protocol: urlObj.protocol,
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: `${urlObj.pathname}?${urlObj.searchParams.toString()}`,
                ...(options ? options : {})
            };

            let retryCount = 0;
            const sendRequest = async () => {
                if (this.#accessToken && this.#tokenExpiry) {
                    if (this.#tokenExpiry < (new Date().getTime())) {
                        console.log(`Invalid access token, Generating a new...`)
                        await this.#authorize();
                    }
                    const bearer = `Bearer ${this.#accessToken}`;
                    if (reqOptions.headers)
                        reqOptions.headers = { Authorization: bearer, ...reqOptions.headers };
                    else
                        reqOptions = { headers: { Authorization: bearer, ...reqOptions.headers }, ...reqOptions };
                }

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
                        else if (res.statusCode === 401) {
                            const resJson = JSON.parse(resData);
                            if (retryCount < 5 && this.#accessToken && this.#tokenExpiry && (this.#tokenExpiry < (new Date().getTime())) &&
                                resJson.error.code === 401 && resJson.error.status === 'UNAUTHENTICATED') {
                                retryCount++;
                                console.log(`Invalid access token, Retrying ${retryCount}...`)
                                await this.#authorize();
                                await sendRequest();
                                return;
                            }
                        }
                        reject(resData);
                        return;
                    });
                }).on('error', async (e) => {
                    reject(e);
                    return;
                });

                if (data)
                    req.write(data);

                req.end();
            }

            sendRequest();
        });
    }

    async get(url, params = null) {
        return await this.#request(HTTPMETHODS.GET, url, params);
    }

    async post(url, params = null, data = null) {
        let options, postData = null;
        if (data) {
            postData = JSON.stringify(data);
            options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }
        }

        return await this.#request(HTTPMETHODS.POST, url, params, postData, options);
    }

    async patch(url, params = null, data = null) {
        let options, patchData = null;
        if (data) {
            patchData = JSON.stringify(data);
            options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(patchData)
                }
            }
        }

        return await this.#request(HTTPMETHODS.PATCH, url, params, patchData, options);
    }

    async delete(url, params = null) {
        return await this.#request(HTTPMETHODS.DELETE, url, params);
    }
}

module.exports = {
    RequestManager
}