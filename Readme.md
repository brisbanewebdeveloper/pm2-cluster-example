# Clustering in Node.js with PM2 Example

## Install

```shell
npm install --global pm2
npm install
```

## Test

```shell
cp test.example.sh test.sh
# Amend test.sh to suit to your situation
. test.sh
```

## Examples

```shell
time node index.js --verbose
time node index.js -i 2 --verbose
time node index.js -i 4 --verbose
time node index.js -p 30000 -i 7
```
