const knex = require('knex');
const schemaSql = require('../../test/schema');

const setupDatabaseStore = async (databaseFile) => {
  const dbConn = knex({
    client: 'sqlite3',
    connection: {filename: databaseFile},
    useNullAsDefault: true
  });

  console.log(`[Backend] Loaded database ${databaseFile}`);

  return dbConn;
};

const importSchema = async (schemaSql) => {
    console.log(`[Backend] importing database schema...`);
    const queries = schemaSql
    .toString()
    .replace(/(\r\n|\n|\r)/gm, ' ') // remove newlines
    .replace(/\s+/g, ' ') // excess white space
    .split(';') // split into all statements
    .map(Function.prototype.call, String.prototype.trim)
    .filter(el => el.length !== 0); // remove any empty ones

  for (let i = 0; i < queries.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    await global.knex.raw(queries[i]);
  }

  console.log(`[Backend] schema imported.`);
};

module.exports = { setupDatabaseStore, importSchema };
