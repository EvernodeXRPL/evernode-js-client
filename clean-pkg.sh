#!/bin/bash
# Create a clean dist/package.json for publishing.
node -p "const pkg=require('./package.json'); delete pkg.scripts; delete pkg.devDependencies; pkg.scripts = { postinstall : 'EXTERNAL=1 node postinstall.js'}; JSON.stringify(pkg, null, 4)" \
    > dist/package.json