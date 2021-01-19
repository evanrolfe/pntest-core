cp node_modules/sqlite3/lib/binding/node-v72-linux-x64/node_sqlite3.node ./dist/node_sqlite3.node

ORIGINAL="var binding = require(binding_path);"
CHANGED="var binding = require(\'.\/node_sqlite3.node\')"

sed -i "4s/.*/$CHANGED/g" node_modules/sqlite3/lib/sqlite3.js

pkg ./src/index.js --output=./dist/pntest-core -t node12-linux-x64 --public

# Revert it back to original state:
sed -i "4s/.*/$ORIGINAL/g" node_modules/sqlite3/lib/sqlite3.js
