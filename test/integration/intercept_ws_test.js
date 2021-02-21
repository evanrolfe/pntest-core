const url = require('url');
const WebSocket = require('ws');
const HttpsProxyAgent = require('https-proxy-agent');

const util = require('util');
const { sleep, clearDatabase, writeToBackend, messageFromBackend } = require('../utils');
const { expect } = require('chai');

const connectToWebsocket = (proxyPort) => new Promise((resolve, reject) => {
  const proxyAddr = `http://localhost:${proxyPort}`;
  const options = url.parse(proxyAddr);
  const agent = new HttpsProxyAgent(options);

  const ws = new WebSocket('ws://localhost:3002', { agent: agent });

  ws.on('open', function open() {
    resolve(ws);
  });
});

const RAW_RESPONSE = '';

describe('The Intercept', () => {
  let proxyPort;

  before(async () => {
    await clearDatabase();

    // Get a client:
    const clientInfo = await global.clientGetter.get('anything');
    proxyPort = clientInfo.proxyPort;
    await sleep(2000);

    // Enable the intercept:
    writeToBackend({"command": "changeSetting", "key": "interceptEnabled", "value": true});
    await messageFromBackend('settingChanged');
    await sleep(1000);

    const ws = await connectToWebsocket(proxyPort);
    ws.send('HEY')
  });

  describe('Intercepting a websocket message', () => {
    it('works', async () => {
      // 1. First Message
      const interceptMessage = await messageFromBackend('requestIntercepted');
      console.log('this is what we got:')
      console.log(interceptMessage)

      writeToBackend({
        "command": "forward",
        "request": {
          "id": interceptMessage.request.id,
          "rawRequest": 'THIS HAS BEEN MODIFIED!!!!!!!!!!!!'
        }
      });

      // 2. Second Message
      const interceptMessage2 = await messageFromBackend('requestIntercepted');
      console.log('this is what we got (2222222222222):')
      console.log(interceptMessage2)

      writeToBackend({
        "command": "forward",
        "request": {
          "id": interceptMessage2.request.id,
          "rawRequest": interceptMessage2.request.rawRequest
        }
      });

      // 3. Third Message
      const interceptMessage3 = await messageFromBackend('requestIntercepted');
      console.log('this is what we got (3333333):')
      console.log(interceptMessage3)

      writeToBackend({
        "command": "forward",
        "request": {
          "id": interceptMessage3.request.id,
          "rawRequest": interceptMessage3.request.rawRequest
        }
      });

      const messages = await global.knex('websocket_messages');

      expect(messages.length).to.eql(3);

      expect(messages[0].direction).to.eq('incoming')
      expect(messages[0].body).to.eq('Hey, Im the websocket server')

      expect(messages[1].direction).to.eq('outgoing')
      expect(messages[1].body).to.eq('HEY')

      expect(messages[2].direction).to.eq('incoming')
      expect(messages[2].body).to.eq('We have received your message loud and clear: HEY')
    });
  });
});

