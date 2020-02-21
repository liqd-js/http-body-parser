'use strict';

const { Writable } = require('stream');
const MultiBuffer = require('@liqd-js/multibuffer');
const Querystring = require('@liqd-js/querystring');
const HttpHeaderParser = require('@liqd-js/http-header-parser');
const MultipartParser = require('./multipart_parser');

module.exports = class HttpBodyParser extends Writable
{
    static get MultipartParser()
    {
        return MultipartParser;
    }

    static get HttpHeaderParser()
    {
        return HttpHeaderParser;
    }

    static get File()
    {
        return MultipartParser.File;
    }

    #headers; #type;
    #stream_parser;
    #data; #buffer = new MultiBuffer(); 
    
    
    constructor( headers )
    {
        super();

        //console.log( headers );

        this.#headers = headers;
        this.#type = headers && headers['content-type'] && HttpHeaderParser.parseValue( headers['content-type'] );

        if( this.#type[0].startsWith( 'multipart/' ))
        {
            this.#stream_parser = new MultipartParser( HttpHeaderParser.parseValueParameter( headers['content-type'], 'boundary' ), this.#buffer );
        }
    }

    _parse( done = false )
    {
        if( this.#stream_parser )
        {
            this.#stream_parser.parse();

            process.exit();
        }
        else if( done )
        {
            let body = this.#buffer.spliceConcat( 0, this.#buffer.length );
            
            if( this.#type[0] === 'application/json' )
            {
                this.#data = JSON.parse( body.toString('utf8') );
            }
            else if( this.#type[0] === 'application/x-www-form-urlencoded' )
            {
                this.#data = Querystring.parse( body.toString('utf8') );
            }
        }

        if( done )
        {
            this.emit( 'finish', this.#data );
        }
    }

    write( chunk, encoding, callback )
    {
        if( typeof encoding === 'function' ){ callback = encoding; encoding = undefined }

        chunk && this.#buffer.append( chunk );
        callback && callback();

        return true;
    }

    end( chunk, encoding, callback )
    {
        if( typeof encoding === 'function' ){ callback = encoding; encoding = undefined }
        if( chunk ){ this.write( chunk, encoding )}

        callback && this.on( 'finish', callback );

        this._parse( true );
    }
}