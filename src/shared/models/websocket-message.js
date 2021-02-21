class WebsocketMessage {
  constructor({request, id, request_id, direction, body, created_at, updated_at}) {
    this.request = request
    this.request_id = request_id
    this.direction = direction
    this.body = body
    this.created_at = created_at
    this.updated_at = updated_at

    // This is required for the intercept!
    this.id = this.request_id + '-' + id
  }

  toInterceptParams() {
    return {
      id: this.id,
      method: this.request.method,
      host: this.request.host,
      path: this.request.path,
      direction: this.direction,
      rawRequest: this.body,
    };
  }
}

module.exports = WebsocketMessage;
