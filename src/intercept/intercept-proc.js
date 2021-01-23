const { fork } = require('child_process');
const uuid = require('uuid');

class InterceptProc {
  start() {
    this.channelName = `pntest-intercept-${uuid.v4()}`
    this.proc = fork(require.resolve('./index'), ['--channel', this.channelName]);
    this.pid = this.proc.pid;

    console.log(`[Backend] Intercept started with PID: ${this.pid} and channel: ${this.channelName}`)
  }
}

module.exports = { InterceptProc };
