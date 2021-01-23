const { argv } = require('yargs');
const { InterceptServer } = require('./intercept-server');

const channelName = argv.channel;
const interceptServer = new InterceptServer(channelName);
interceptServer.start();
