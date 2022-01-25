#!/bin/bash

node index.js --verbose

echo
# node index.js -i 2 --verbose
node index.js -i 2

echo
# node index.js -i 3 --verbose
node index.js -i 3

echo
node index.js -i 4

echo
node index.js -i 7

# Gets the same result with 7
# echo
# node index.js -i 12
