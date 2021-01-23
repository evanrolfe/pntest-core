# PnTest-Core

A core binary which handles proxies, browsers, the intercept and crawlers. Runs on Node 12.

### Install
```
git clone
npm install
npm run backend -- --dbPath=/home/evan/Desktop/pntest.db
```

### Test
The integration tests require that you are running the mock server:
```bash
npm run start-mock-server
```
Then run the tests with:
```bash
npm run test
```

### Build
Compile to a single binary using this command:
```
$ scripts/build.sh
```
