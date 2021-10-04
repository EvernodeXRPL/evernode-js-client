#!/bin/bash
# Create a clean dist/package.json for publishing.
node -p "const pkg=require('./package.json'); delete pkg.scripts; delete pkg.devDependencies; JSON.stringify(pkg, null, 4)" \
    > dist/package.json