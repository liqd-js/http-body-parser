const fs = require('fs');
const request = require('request');
const HttpBodyParser = require('../lib/http_body_parser');

const server = require('http').createServer(( req, res ) =>
{
    let bodyparser = new HttpBodyParser( req.headers );

    bodyparser.on( 'file', file =>
    {
      console.log( 'File', file.name );

      /*file.on( 'datas', chunk => 
      {
        console.log( 'FIle data', chunk.length );
      });

      file.on( 'end', () => 
      {
        console.log( 'FIle data END' );
      });*/

      //file.skip();

      file.save( __dirname + '/tmp/partialik.jpg' );
    });
    bodyparser.on( 'data', data => console.log( 'Data', data ));

    req.pipe( bodyparser );    

    /** /req.on( 'data', data => 
    {
        while( true )
        {
          //console.log('slice', Date.now());

            let chunk = data.slice( 0, 40 );

            if( chunk.length )
            {
                bodyparser.write( chunk );

                data = data.slice( 40 );
            }
            else{ break; }
        }
    });/**/
    req.on( 'end', () =>
    {
        //bodyparser.end();


        /*let data =  Buffer.concat( multibuffer.splice( 0, multibuffer.length )).toString('utf8');

        console.log( req.headers );
        console.log( data );*/

        //console.log( 'done' );

        res.end('ok');
    });
});

server.listen( 8080 );

//request.post('http://localhost:8080', {form:{foo:['foo','bar'], bar: 'foo'}});
request.post('http://localhost:8080', {formData:{foo:['foo','bar'], bar: 'foo', raw: Buffer.from([1, 2, 3]), lena: fs.createReadStream( __dirname + '/lena.jpg') }});
//request.post('http://localhost:8080', {formData:{foo:['foo','bar'], bar: 'foo', raw: Buffer.from([1, 2, 3]) }});
//request.post('http://localhost:8080', {json:{foo:['foo','bar'], bar: 'foo'}});
/*request({
    method: 'POST',
    preambleCRLF: false, //true
    postambleCRLF: true, //true
    uri: 'http://localhost:8080',
    multipart: [
      {
        'content-type': 'application/json',
        body: JSON.stringify({foo: 'bar', _attachments: {'message.txt': {follows: true, length: 18, 'content_type': 'text/plain' }}})
      },
      { body: 'I am an attachment' },
      //{ body: fs.createReadStream(__dirname + '/lena_xs.jpg') }
    ],
    // alternatively pass an object containing additional options
    multipart: {
      chunked: false,
      data: [
        {
          'content-type': 'application/json',
          body: JSON.stringify({foo: 'bar', _attachments: {'message.txt': {follows: true, length: 18, 'content_type': 'text/plain' }}})
        },
        { body: 'I am an attachment' }
      ]
    }
  },
  function (error, response, body) {
    if (error) {
      return console.error('upload failed:', error);
    }
    console.log('Upload successful!  Server responded with:', body);
  })

*/

