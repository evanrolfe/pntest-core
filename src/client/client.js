const launcher = require('@httptoolkit/browser-launcher');

const { ClientData } = require('../shared/models/client-data');
const { generateCertsIfNotExists } = require('../shared/cert-utils');
const { killProcGracefully } = require('../shared/utils');
const frontend = require('../shared/notify_frontend');
const { BrowserProc } = require('./browser-proc');
const { ProxyProc } = require('../proxy/proxy-proc');
const { PORTS_AVAILABLE } = require('../shared/constants');

class Client {
  constructor(clientData, paths, interceptChannel, options = {}) {
    this.clientData = clientData;
    this.paths = paths;
    this.interceptChannel = interceptChannel;
    this.options = options;
    console.log(`-------------> Creating client: ${interceptChannel}`)
  }

  static async create(type, paths, interceptChannel) {
    const ports = await _getNextPortsAvailable(PORTS_AVAILABLE);

    if (['anything', 'terminal'].includes(type)) {
      delete ports.browser;
    }

    const clientData = await ClientData.create({type: type, browserPort: ports.browser, proxyPort: ports.proxy});

    return new Client(clientData, paths, interceptChannel)
  }

  static async load(id, paths, interceptChannel, options) {
    const clientData = await ClientData.load(id);

    return new Client(clientData, paths, interceptChannel, options)
  }

  static async listTypesAvailable() {
    launcher.detect(async (browsers) => {
      const ports = await _getNextPortsAvailable(PORTS_AVAILABLE);

      // Add ports to the response:
      browsers.forEach((browser) => {
        browser.proxyPort = ports.proxy;
        browser.browserPort = ports.browser;
      });

      // Add "anything" browser
      browsers.push({
        name: 'anything',
        type: 'anything',
        proxyPort: ports.proxy,
        browserPort: ports.browser
      });

      //browsers = browsers.filter(b => b.type != 'chromium')
      const message = {
        type: 'clientsAvailable',
        clients: browsers
      };
      console.log(`[JSON] ${JSON.stringify(message)}`);
    });
  }

  async start() {
    await generateCertsIfNotExists(this.paths.keyPath, this.paths.certPath);

    await this._startProxy();

    if (this.clientData.type !== 'anything') {
      await this._startBrowser();
    }

    await this.clientData.update({open: true});
    frontend.notifyClientsChanged();
    frontend.notifyClientStarted(this.clientData);
  }

  close() {
    console.log(`[Backend] Closing client ID ${this.clientData.id}`);

    if (this.proxy) killProcGracefully(this.proxy.pid)
    if (this.browser) killProcGracefully(this.browser.pid);

    this._closeClient();
  }

  async bringToFront() {
    console.log(`[Backend] bringToFront client ${this.clientData.id}`)

    if(this.browser.puppeteerBrowser) {
      const pages = await this.browser.puppeteerBrowser.pages();
      const page = pages[0];
      await page.bringToFront();
    }
  }

  onBrowserClosed(callbackFunc) {
    this.onBrowserClosed = callbackFunc;
  }

  // Private Methods:
  async _startProxy() {
    this.proxy = new ProxyProc(this.clientData, this.paths, this.interceptChannel);
    await this.proxy.start();
  }

  async _startBrowser() {
    this.browser = new BrowserProc(this.clientData, this.paths, this.options);

    if(this.onBrowserClosed) this.browser.onClosed(this.onBrowserClosed);

    await this.browser.start();
    console.log(`[Backend] Browser started with PID: ${this.browser.pid}`)
  }

  async _closeClient() {
    await this.clientData.update({open: false});
    frontend.notifyClientsChanged();
  }
}

const _getUsedPorts = async () => {
  const result = await global.knex('clients');
  const proxyPorts = result.map(row => row.proxy_port);
  const browserPorts = result.map(row => row.browser_port);

  return { proxy: proxyPorts, browser: browserPorts };
};

const _getNextPortsAvailable = async (portsAvailable) => {
  const portsUsed = await _getUsedPorts();

  const browserPort = portsAvailable.browser.find((availablePort) => {
    return !portsUsed.browser.includes(availablePort);
  });

  const proxyPort = portsAvailable.proxy.find((availablePort) => {
    return !portsUsed.proxy.includes(availablePort);
  });

  console.log(`[Backend] found available browser port: ${browserPort}, proxy port: ${proxyPort}`)
  return { browser: browserPort, proxy: proxyPort };
};

module.exports = { Client };
