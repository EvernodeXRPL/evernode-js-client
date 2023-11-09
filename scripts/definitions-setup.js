const fs = require('fs');
const path = require('path');
const https = require('https');

const DefinitionsUrl = 'https://raw.githubusercontent.com/chalith/test-repository/main/definitions.json';
const DefinitionsPath = './resources/definitions.json';

async function main() {
    https.get(DefinitionsUrl, res => {
        let data = [];
        console.log('Server info response:')
        const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
        console.log('  Status Code:', res.statusCode);
        console.log('  Date in header:', headerDate);

        res.on('data', chunk => {
            data.push(chunk);
        });

        res.on('end', () => {
            console.log('  Response ended: ');

            const dirPath = path.dirname(DefinitionsPath)
            if (!fs.existsSync(dirPath))
                fs.mkdirSync(dirPath, { recursive: true });

            fs.writeFileSync(DefinitionsPath, Buffer.concat(data).toString());
        });
    }).on('error', err => {
        throw `Error: ${err.message}`;
    });
}

// call the async function
main()