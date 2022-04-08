const net = require('net');
const parser = require('./parser.js');

const images = require('images');
const render = require('./render.js');
class Request {
    constructor(options) {
        this.method = options.method || 'GET';
        this.host = options.host;
        this.port = options.port || '80';
        this.path = options.path || '/';
        this.headers = options.headers || {};
        this.body = options.body || {};

        if (!this.headers['Content-Type'])
            this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    
        if (this.headers['Content-Type'] === 'application/x-www-form-urlencoded')
            this.bodyText = Object.keys(this.body).map(key => `${key}=${this.body[key]}`).join('&');
        else (this.headers['Content-Type'] === 'application/json')
            this.bodyText = JSON.stringify(this.body);

        this.headers['Content-Length'] = this.bodyText.length;
    }

    send(connection) {
        return new Promise((resolve, reject) => {
            const parser = new ResponseParser;
            if (connection) {
                connection.write(this.toString());
            } else {
                connection = net.createConnection({
                    host: this.host,
                    port: this.port
                }, () => {
                    connection.write(this.toString());
                })
            }
            connection.on('data', data => {
                parser.receive(data.toString());
                if (parser.isFinished) {
                    resolve(parser.response);
                    connection.end();
                }
            });
            connection.on('error', err => {
                reject(err);
                connection.end();
            })
        });
    }

    toString() {
        return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
\r
${this.bodyText}`
    }
}

class ResponseParser {
    constructor() {
        this.statusLine = '';
        this.headerName = '';
        this.headerValue = '';
        this.headers = {};
        this.bodyParser = null;

        this.current = '';
        this.WAITING_STATUS_LINE = c => {
            if (c === '\r') {
                this.current = this.WAITING_STATUS_LINE_END
            } else {
                this.statusLine += c;
            }
        }

        this.WAITING_STATUS_LINE_END = c => {
            if (c === '\n') {
                this.current = this.WAITING_HEADER_NAME;
            }
        }

        this.WAITING_HEADER_NAME = c => {
            if (c === ':') {
                this.current = this.WAITING_HEADER_SPACE
            } else if (c === '\r') {
                this.current = this.WAITING_BLOCK_END;
                if (this.headers['Transfer-Encoding'] === 'chunked')
                    this.bodyParser = new TrunkedBodyParser();
            } else {
                this.headerName += c;
            }
        }

        this.WAITING_HEADER_SPACE = c => {
            if (c === ' ') {
                this.current = this.WAITING_HEADER_VALUE
            }
        }

        this.WAITING_HEADER_VALUE = c => {
            if (c === '\r') {
                this.current = this.WAINTING_HEADER_LINE_END
            } else {
                this.headerValue += c;
            }
        }

        this.WAINTING_HEADER_LINE_END = c => {
            if (c === '\n') {
                this.current = this.WAITING_HEADER_NAME;
                this.headers[this.headerName] = this.headerValue;
                this.headerName = '';
                this.headerValue = '';
            }
        }

        this.WAITING_BLOCK_END = c => {
            if (c === '\n') {
                this.current = this.WAITING_BODY;
            }
        }

        this.WAITING_BODY = c => {
            this.bodyParser.receiveChar(c);
        }

        this.current = this.WAITING_STATUS_LINE;
    }

    get isFinished() {
        return this.bodyParser && this.bodyParser.isFinished;
    }

    get response() {
        this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/);
        return {
            statusLine: RegExp.$1,
            statusText: RegExp.$2,
            headers: this.headers,
            body: this.bodyParser.content.join('')
        }
    }

    receive(string) {
        for (let c of string) {
            this.receiveChar(c);
        }
    }

    receiveChar(c) {
        this.current(c);
    }
}

class TrunkedBodyParser {
    constructor() {
        this.length = 0;
        this.content = [];
        this.isFinished = false;

        this.WAITING_LENGTH = char => {
            if (char === '\r') {
                if (this.length === 0) {
                    this.isFinished = true;
                }
                this.current = this.WAITING_LENGTH_END;
            } else {
                this.length *= 16;
                this.length += parseInt(char, 16);
            }
        }

        this.WAITING_LENGTH_END = char => {
            if (char === '\n') {
                this.current = this.READING_TRUNK;
            }
        }

        this.READING_TRUNK = char => {
            if (this.length === 0) {
                this.current = this.WAITING_NEW_LINE;
            } else {
                this.content.push(char);
                this.length--;
            }
        }

        this.WAITING_NEW_LINE = char => {
            if (char === '\r') {
                this.current = this.WAITING_NEW_LINE_END;
            }
        }

        this.WAITING_NEW_LINE_END = char => {
            if (char === '\n') {
                this.current = this.WAITING_LENGTH;
            }
        }
        this.current = this.WAITING_LENGTH;
    }

    receiveChar = (char) => {
        this.current(char);
    }
}


void async function() {
    let request = new Request({
        method: 'POST',
        host: '127.0.0.1',
        port: '8088',
        path: '/',
        headers: {
            ['X-Foo2']: 'customed'
        },
        body: {
            name: 'show'
        }
    });

    let response = await request.send();
    
    let dom = parser.parseHTML(response.body);
    let viewport = images(800, 600);
    render(viewport, dom);
    viewport.save('viewport.jpg');
}();