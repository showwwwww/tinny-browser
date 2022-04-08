const http = require('http');

http.createServer((request, response) => {
    let body = [];
    request.on('error', err => {
        console.error(err);
    }).on('data', chunk => {
        body.push(chunk);
    }).on('end', () => {
        body = Buffer.concat(body).toString();
        console.log('body: ', body);
        response.writeHead(200, { 'Contentj-Type': 'text/html' });
        response.end(`<html maaa=a>
    <head>
        <style>
            body div #myid {
                width: 100px;
                background-color: rgb(255, 444, 231);
            }
            body div img {
                width: 30px;
                background-color: rgb(44, 33, 33);
            }
            #container {
                width: 500px;
                height: 300px;
                background: rgb(0, 123, 444);
                display: flex;
            }
            #container .c1 {
                flex: 1;
                width: 200px;
                height: 300px;
                background: rgb(255, 123, 62);
            }
        </style>
    </head>
    <body>
        <p>Hello world!</p>
        <div id='container'>
            <div class='c1'></div>
            <img id='myid' />
            <img />
        </div>
        <h2>This a paragraph for testing</h2>
        <h1>${Object.keys(body).map(key => body[key]).join('')}</h1>
    </body>
</html>`);
    });
}).listen(8088);

console.log('server started');