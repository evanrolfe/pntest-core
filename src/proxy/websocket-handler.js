const url = require('url');
const WebSocket = require('ws');
const Settings = require('../shared/models/settings');
const Request = require('../shared/models/request');
const WebsocketMessage = require('../shared/models/websocket-message');

/*
 * NOTE: How are websocket HTTP handshake requests saved to the database?

 * 1. request DB row is inserted in handleUpgrade in this file, with most of the
 *    request values.
 * 2. Network.webSocketWillSendHandshakeRequest callback in BrowserPageUtils.js
 *    runs and updates the client_id and websocket_request_id of the request
 *    which is found by the Sec-WebSocket-Key header that is unique for each
 *    request.
 * 3. In this file, upstreamSocket event callback for 'upgrade' and 'unexpected-
 *    response' updates the request_headers, request_status and
 *    response_status_message values on the request.
 *
 * The reason why the request row is populated in three stages is because the
 * chromium API does not give you much info about websocket handshake requests,
 * and they are not included the standard Network request interception API.
 * So we have to use data from both chromium and the proxy server to populate
 * the request database table.
 */

const interceptEnabled = async () => {
  const setting = await Settings.getSetting('interceptEnabled');
  return setting.value === '1';
};

const wsServer = new WebSocket.Server({ noServer: true });
wsServer.on('connection', (ws, requestUrl, dbRequest) => {
  console.log('[WebSocket] Successfully proxying websocket streams');
  pipeWebSocket(ws, ws.upstreamSocket, 'outgoing', requestUrl, dbRequest);
  pipeWebSocket(ws.upstreamSocket, ws, 'incoming', requestUrl, dbRequest);
});

const pipeWebSocket = (inSocket, outSocket, direction, requestUrl, dbRequest) => {
  const onPipeFailed = op => err => {
    if (!err) return;

    inSocket.close();
    console.error(`[Proxy] Websocket ${op} failed`, err);
  };

  inSocket.on('message', async body => {
    console.log(
      `[WebSocket] Websocket message ${requestUrl} (${direction}): ${body}`
    );
    const dbMessage = {
      request_id: dbRequest.id,
      direction: direction,
      body: body,
      created_at: Math.floor(new Date().getTime() / 1000)
    };
    const dbResult = await global.knex('websocket_messages').insert(dbMessage);
    dbMessage.id = dbResult[0];

    const isInterceptEnabled = await interceptEnabled();

    let outputBody;

    if (isInterceptEnabled) {
      const requestForIntercept = new Request(dbRequest);
      requestForIntercept.id = dbRequest.id;

      const messageForIntercept = new WebsocketMessage({ request: requestForIntercept, ...dbMessage });
      const result = await interceptClient.decisionForRequest(messageForIntercept);

      if (result.decision == 'forward' && result.request.rawRequest !== undefined && result.request.rawRequest != dbMessage.body) {
        outputBody = result.request.rawRequest;

        await global.knex('websocket_messages').where({ id: dbMessage.id }).update({ body_modified: outputBody });
      } else {
        outputBody = body;
      }
    }

    outSocket.send(outputBody, onPipeFailed('message'));
  });

  inSocket.on('close', (num, reason) => {
    if (num >= 1000 && num <= 1004) {
      console.log('[WebSocket] Successfully piping websocket streams');
      outSocket.close(num, reason);
    } else {
      // Unspecified or invalid error
      outSocket.close();
    }
  });

  inSocket.on('ping', data => {
    outSocket.ping(data, undefined, onPipeFailed('ping'));
  });
  inSocket.on('pong', data => {
    outSocket.pong(data, undefined, onPipeFailed('pong'));
  });
};

const saveResponseToDB = async (requestId, response) => {
  const requestParams = {
    response_headers: JSON.stringify(response.headers),
    response_status: response.statusCode,
    response_status_message: response.statusMessage
  };

  if (requestId === undefined) return

  await global
    .knex('requests')
    .where({ id: requestId })
    .update(requestParams);

  //proxyIPC.send('websocketMessageCreated', {});
};

const connectUpstream = (requestUrl, request, socket, head, dbRequest) => {
  const requestId = dbRequest.id;
  console.log(`[WebSocket] Connecting to upstream websocket at ${requestUrl} request id: ${requestId}`);

  const upstreamSocket = new WebSocket(requestUrl);

  // See: https://github.com/websockets/ws/blob/master/doc/ws.md#event-upgrade
  // TODO: Maybe this should use the "downstream socket" instead?
  upstreamSocket.once('unexpected-response', async (_request, response) => {
    saveResponseToDB(requestId, response);
  });

  upstreamSocket.once('upgrade', async response => {
    saveResponseToDB(requestId, response);
  });

  upstreamSocket.once('open', () => {
    console.log(`[WebSocket] upstreamSocket for url: ${requestUrl}`);

    wsServer.handleUpgrade(request, socket, head, ws => {
      console.log(`[WebSocket] wsServer.handleUpgrade for url: ${requestUrl}`);
      ws.upstreamSocket = upstreamSocket;
      wsServer.emit('connection', ws, requestUrl, dbRequest);
    });
  });

  upstreamSocket.once('error', e => console.log(e));
};

const handleUpgrade = async (request, socket, head, interceptClient) => {
  // TODO: Awful I know, but I dont have time to refactor all this code in order to properly inject the interceptClient
  global.interceptClient = interceptClient;

  const parsedUrl = url.parse(request.url);
  let { hostname, port } = parsedUrl;
  const { path } = parsedUrl;
  const requestedProtocol = parsedUrl.protocol;
  console.log(`[WebSocket] handling upgrade for  ${request.url}`);
  console.log(`[WebSocket] requestedProtocol  ${requestedProtocol}, path: ${path}`);

  const transparentProxy = !hostname;

  if (transparentProxy === true) {
    const hostHeader = request.headers.host;
    [hostname, port] = hostHeader.split(':');

    let protocol;
    if (socket.upstreamEncryption !== undefined) {
      protocol = socket.upstreamEncryption ? 'wss' : 'ws';
    } else {
      protocol = request.connection.encrypted ? 'wss' : 'ws';
    }

    const realUrl = `${protocol}://${hostname}${port ? `:${port}` : ``}${path}`;

    // 1. Save the websocket HTTP handshake request to DB
    const dbRequest = {
      method: request.method,
      url: realUrl,
      host: request.headers.host,
      http_version: request.httpVersion,
      path: path,
      request_type: 'websocket',
      request_headers: JSON.stringify(request.headers),
      websocket_sec_key: request.headers['sec-websocket-key']
    };

    const dbResult = await global.knex('requests').insert(dbRequest);
    const requestId = dbResult[0];
    dbRequest.id = requestId;

    connectUpstream(realUrl, request, socket, head, dbRequest);
  } else {
    // Connect directly according to the specified URL
    const protocol = requestedProtocol.replace('http', 'ws');
    connectUpstream(
      `${protocol}//${hostname}${port ? `:${port}` : ''}${path}`,
      request,
      socket,
      head
    );
  }
};

module.exports = handleUpgrade;
