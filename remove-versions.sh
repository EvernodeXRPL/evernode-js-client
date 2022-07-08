#!/bin/bash
# This script removes previous npm package versions. (need to be logged into npm first)

for i in {0..36}
do
    pkg="evernode-js-client@0.4.$i"
    echo Unpublishing $pkg
    npm unpublish $pkg
    sleep 2
done