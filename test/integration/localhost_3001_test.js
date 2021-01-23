const { sleep, clearDatabase, writeToBackend, messageFromBackend, connectToBrowser } = require('../utils');
/*
describe('Browsing', () => {
  let browser;

  before(async () => {
    await clearDatabase();

    // Open a browser:
    const clientInfo = await global.clientGetter.get('chrome');
    const browserPort = clientInfo.browserPort;
    await sleep(2000);

    browser = await connectToBrowser(browserPort);
    console.log(`[TEST] Connected to browser.`);
  });

  after(async () => {
    browser.disconnect()
    await sleep(2000);
  });

  describe('navigating to http://localhost:3001', () => {
    it('works', async () => {
      const pages = await browser.pages();
      const page = pages[0];
      const navigation = await page.goto('http://localhost:3001');
      await sleep(2000);

      await page.click('a[href="/users/sign_in"]');
      await page.waitForSelector('#user_email')
      await page.type('#user_email', 'alice@authcov.io')
      await page.type('#user_password', 'password')
      await page.click('input[type=submit]')
      await page.waitForSelector('.alert-success')
      //await sleep(2000);

      const requests = await global.knex('requests').orderBy('id', 'desc');
      const requestUrls = requests.map(r => `${r.id} ${r.method} ${r.host}${r.path}`);
      console.log(requestUrls)

      // const expectedUrls = [
      // 'http://localhost:3000/',
      // 'http://localhost:3000/posts',
      // 'http://localhost:3000/api/posts.json'
      // ];
      // expectedUrls.forEach(expectedUrl => {
      //   expect(requestUrls).to.include(expectedUrl);
      // });
    });
  });
});
*/
