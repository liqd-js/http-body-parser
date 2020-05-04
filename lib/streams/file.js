'use strict';

const NOOP = () => undefined;
const fs = require('fs');
const { Transform } = require('stream');

module.exports = class File extends Transform
{
    #buffers = []; #skip = false;

    constructor( headers, field, name, mime )
    {
        super();

        this.headers = headers;
        this.field = field;
        this.name = name;
        this.mime = mime;
        this.path = undefined;
    }

    skip()
    {
        this.removeAllListeners('data');

        //this.on( 'data', NOOP );
    }

    save( path )
    {
        this.pipe( fs.createWriteStream( this.path = path ));
    }

    _transform( chunk, encoding, callback )
    {
        callback( null, chunk );
    }

    async move()
    {

    }

    async delete()
    {

    }
}