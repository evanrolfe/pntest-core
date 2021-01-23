const { argv } = require('yargs');
const path = require('path');

const getPaths = () => {
  let appPath, dbPath;

  if(argv.appPath !== undefined) {
    appPath = argv.appPath;
  } else {
    appPath = path.join(__dirname, '../../../');
  }

  if(argv.dbPath !== undefined) {
    dbPath = argv.dbPath;
  } else {
    throw 'No dbPath option specified!';
  }

  if(argv.dataPath !== undefined) {
    dataPath = argv.dataPath;
  } else {
    dataPath = appPath;
  }

  console.log(`[Backend] appPath: ${appPath}`);
  console.log(`[Backend] dataPath: ${dataPath}`);
  console.log(`[Backend] dbPath: ${dbPath}`);

  const paths = {
    dataPath: dataPath,
    dbFile: dbPath,
    keyPath: `${dataPath}rootCA.key`,
    certPath: `${dataPath}rootCA.csr`,
    cert9Path: `${dataPath}cert9.db`
  };

  return paths;
};

module.exports = { getPaths };
