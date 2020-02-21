const fs = require('fs');
const request = require('request');
const HttpBodyParser = require('../lib/http_body_parser');

const server = require('http').createServer(( req, res ) =>
{
    let bodyparser = new HttpBodyParser( req.headers );

    bodyparser.on( 'finish', body => console.log( 'Finish', body ));

    req.pipe( bodyparser );
    

    //req.on( 'data', data => multibuffer.append( data ));
    req.on( 'end', () =>
    {
        /*let data =  Buffer.concat( multibuffer.splice( 0, multibuffer.length )).toString('utf8');

        console.log( req.headers );
        console.log( data );*/

        console.log( 'done' );

        res.end('ok');
    });
});

server.listen( 8080 );

//request.post('http://localhost:8080', {form:{foo:['foo','bar'], bar: 'foo'}});
request.post('http://localhost:8080', {formData:{foo:['foo','bar'], bar: 'foo', raw: Buffer.from([1, 2, 3]), lena: fs.createReadStream( __dirname + '/lena.jpg') }});
//request.post('http://localhost:8080', {formData:{foo:['foo','bar'], bar: 'foo', raw: Buffer.from([1, 2, 3]) }});
//request.post('http://localhost:8080', {json:{foo:['foo','bar'], bar: 'foo'}});




