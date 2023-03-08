#!/bin/bash
## This script is written to update the definition files of two separate node modules in this repo according to the XRPL hooks V3 migaration

# Set the URL of the V3 API endpoint
url="https://hooks-testnet-v3.xrpl-labs.com"

# Path to update.
xrpl_codec_path='./node_modules/xrpl-binary-codec/dist/enums/definitions.json'
ripple_codec_path='./node_modules/ripple-binary-codec/dist/enums/definitions.json'

# Set the JSON data to send in the request
json_data='{ "method": "server_definitions","params": [{}]}'

# Make the curl request with the JSON data and store the response
results=$(curl -s -H "Content-Type: application/json" -X POST -d "${json_data}" "${url}" | jq -r '.result' | jq 'del(.status)')

echo "${results}" | tee $xrpl_codec_path $ripple_codec_path >/dev/null
