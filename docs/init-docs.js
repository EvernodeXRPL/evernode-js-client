const fs = require('fs');
const path = require('path');

const updateJSDocUtil = () => {
    const jsdocUtilDumperPath = path.join(__dirname, '../node_modules/jsdoc/lib/jsdoc/util/dumper.js');

    let utilFileContent = fs.readFileSync(jsdocUtilDumperPath, 'utf8');

    const oldUtilFunction = `exports.dump = function(...args) {
    const result = [];
    let walker;

    for (let arg of args) {
        walker = new ObjectWalker();
        result.push( JSON.stringify(walker.walk(arg), null, 4) );
    }

    return result.join('\\n');
};`;

    const newUtilFunction = `exports.dump = function(...args) {
    const result = [];
    let walker;

    for (let arg of args) {
        walker = new ObjectWalker();
        result.push( JSON.stringify(walker.walk(arg), (key, value) => typeof value == 'bigint' ? value.toString() : value, 4) );
    }

    return result.join('\\n');
};`;

    if (utilFileContent.includes(oldUtilFunction)) {
        utilFileContent = utilFileContent.replace(oldUtilFunction, newUtilFunction);
        fs.writeFileSync(jsdocUtilDumperPath, utilFileContent, 'utf8');
        console.log('JSDoc utility function modified successfully!');
    } else {
        console.log('JSDoc obsolete utility function is not found.');
    }
};

updateJSDocUtil();
