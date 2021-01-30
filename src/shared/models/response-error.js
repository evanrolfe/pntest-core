class ResponseError {
  constructor({code, message}) {
    this.code = code;
    this.message = message;
  }

  toDatabaseParams() {
    return {
      response_status: 'ERR',
      response_body: `${this.code}: ${this.message}`
    };
  }

  toRaw() {
    return `${this.code}: ${this.message}`;
  }
}

module.exports = ResponseError;
