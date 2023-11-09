#!/bin/bash
# Remove unnessary files.
rm -rf dist/resources

# Create a clean dist/package.json for publishing.
node -p "const pkg=require('./package.json'); delete pkg.scripts; delete pkg.devDependencies; pkg.scripts = { postinstall : 'node postinstall.js external'};JSON.stringify(pkg, null, 4)" \
    >dist/package.json
