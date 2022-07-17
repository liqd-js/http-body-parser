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
    #data = {}; #buffer = new MultiBuffer();
    
    constructor( headers )
    {
        super();

        //console.log( headers );

        this.#headers = headers;
        this.#type = headers && headers['content-type'] && HttpHeaderParser.parseValue( headers['content-type'] );

        if( this.#type && this.#type[0].startsWith( 'multipart/' ))
        {
            this.#stream_parser = new MultipartParser( HttpHeaderParser.parseValueParameter( headers['content-type'], 'boundary' ), this.#buffer );

            this.#stream_parser.on( 'data', data =>
            {
                Object.assign( this.#data, data );
            });

            this.#stream_parser.on( 'file', file =>
            {
                this.emit( 'file', file );
            });
        }
    }

    _parse( done = false )
    {
        if( this.#stream_parser )
        {
            this.#stream_parser.parse();
        }
        else if( done )
        {
            let body = this.#data = this.#buffer.spliceConcat( 0, this.#buffer.length );

            if( !this.#type )
            {
                if( body.length )
                {
                    try
                    {
                        this.#data = JSON.parse( body.toString('utf8') );
                    }
                    catch( e )
                    {
                        try
                        {
                            this.#data = Querystring.parse( body.toString('utf8') );
                        }
                        catch( e ){}
                    }
                }
            }
            else if( this.#type[0] === 'application/json' )
            {
                this.#data = JSON.parse( body.toString('utf8') );
            }
            else if( this.#type[0] === 'application/ejson' )
            {
                this.#data = require('@liqd-js/ejson').parse( body.toString('utf8') );
            }
            else if( this.#type[0] === 'application/x-www-form-urlencoded' )
            {
                this.#data = Querystring.parse( body.toString('utf8') );
            } 
            else if( this.#type[0] === 'text/plain' )
            {
                this.#data = body.toString('utf8');
            }
            else
            {
                this.#data = body;
            }
        }

        if( done )
        {
            this.emit( 'data', this.#data );
            this.emit( 'finish' );
            this.emit( 'end' );
        }
    }

    write( chunk, encoding, callback )
    {
        if( typeof encoding === 'function' ){ callback = encoding; encoding = undefined }

        //console.log( 'Write', chunk.length );

        chunk && this.#buffer.append( chunk );
        callback && callback();

        this._parse();

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