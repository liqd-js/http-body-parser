'use strict';

const EventEmmiter = require('events');
const HttpHeaderParser = require('@liqd-js/http-header-parser');
const File = require('./streams/file');

const Step = { PREAMBLE: 0, PART_HEADER: 1, PART_BODY: 2, PART_BODY_STREAM: 3, EPILOGUE: 4, DONE: 5 };
const STR =
{
    CLRF2               : Buffer.from( '\r\n',      'utf8' ),
    CLRFx2              : Buffer.from( '\r\n\r\n',  'utf8' ),
    BOUNDARY_END        : Buffer.from( '\r\n',      'utf8' ),
    BOUNDARY_BODY_END   : Buffer.from( '--\r\n',    'utf8' ),
}

module.exports = class MultipartParser extends EventEmmiter
{
    static get File()
    {
        return File;
    }

    #boundary; #buffer; #step;
    #headers; #stream_parser;
    #data = {};

    constructor( boundary, buffer )
    {
        super();
        
        this.#boundary = Buffer.from( '--' + boundary, 'utf8' );
        this.#buffer = buffer;
        this.#step = Step.PREAMBLE;
    }

    _find_boundary( partial = false )
    {
        let boundary_start = -1;
                
        do
        {
            if(( boundary_start = this.#buffer.indexOf( this.#boundary, boundary_start + 1 )) !== -1 )
            {
                if( this.#buffer.equals( STR.BOUNDARY_END, boundary_start + this.#boundary.length ))
                {
                    return { start: boundary_start, length: this.#boundary.length + STR.BOUNDARY_END.length, last: false }
                }
                else if( this.#buffer.equals( STR.BOUNDARY_BODY_END, boundary_start + this.#boundary.length ))
                {
                    return { start: boundary_start, length: STR.BOUNDARY_BODY_END.length, last: true }
                }
            }
        }
        while( boundary_start !== -1 )

        if( partial )
        {
            if(( boundary_start = this.#buffer.partialIndexOf( this.#boundary, Math.max( 0, this.#buffer.length - this.#boundary.length - Math.max( STR.BOUNDARY_END.length, STR.BOUNDARY_BODY_END.length ))))  !== -1 )
            {
                return { start: boundary_start, partial: true }
            }
        }
    }

    parse()
    {
        let caret, boundary;

        while( true )
        {
            //console.log( this.#step );

            if( this.#step === Step.PREAMBLE )
            {
                if( boundary = this._find_boundary())
                {
                    this.#buffer.splice( 0, boundary.start + boundary.length );
                    this.#boundary = Buffer.concat([ STR.CLRF2, this.#boundary ]);
                    this.#step = Step.PART_HEADER;

                    continue;
                }
            }
            else if( this.#step === Step.PART_HEADER )
            {
                if(( caret = this.#buffer.indexOf( STR.CLRFx2 )) !== -1 )
                {
                    this.#headers = HttpHeaderParser.parse( this.#buffer.spliceConcat( 0, caret + STR.CLRFx2.length ).toString('utf8'));
                    this.#step = Step.PART_BODY;

                    let name = HttpHeaderParser.parseValueParameter( this.#headers['content-disposition'], 'name');
                    let filename = HttpHeaderParser.parseValueParameter( this.#headers['content-disposition'], 'filename');

                    if( filename )
                    {
                        this.#stream_parser = new File( this.#headers, name, filename, this.#headers['content-type'] );

                        if(  this.#data.hasOwnProperty( name ))
                        {
                            if( !Array.isArray( this.#data.hasOwnProperty( name )))
                            {
                                this.#data[name] = [ this.#data[name] ];
                            }

                            this.#data[name].push( this.#stream_parser );
                        }
                        else
                        {
                            this.#data[name] = this.#stream_parser;
                        }

                        this.emit( 'file', this.#stream_parser );
                    }
                    else
                    {
                        this.#stream_parser = null;
                    }

                    continue;
                }
            }
            else if( this.#step === Step.PART_BODY )
            {
                if( this.#stream_parser )
                {
                    if( boundary = this._find_boundary( true ))
                    {
                        let part_body_buffers = this.#buffer.splice( 0, boundary.start );
                        
                        for( let buf of part_body_buffers )
                        {
                            this.#stream_parser.write( buf );
                        }

                        if( !boundary.partial )
                        {
                            this.#buffer.splice( 0, boundary.length );
                            this.#step = boundary.last ? Step.DONE : Step.PART_HEADER;
                            
                            this.#stream_parser.end();

                            continue;
                        }
                        else
                        {
                            break;
                        }
                    }
                }
                else if( boundary = this._find_boundary())
                {
                    let part_body_buffers = this.#buffer.splice( 0, boundary.start );

                    let part = Buffer.concat( part_body_buffers );

                    let name = HttpHeaderParser.parseValueParameter( this.#headers['content-disposition'], 'name');

                    let value = Buffer.concat( part_body_buffers ).toString('utf8');

                    if(  this.#data.hasOwnProperty( name ))
                    {
                        if( !Array.isArray( this.#data.hasOwnProperty( name )))
                        {
                            this.#data[name] = [ this.#data[name] ];
                        }

                        this.#data[name].push( value );
                    }
                    else
                    {
                        this.#data[name] = value;
                    }

                    this.#buffer.splice( 0, boundary.length );
                    this.#step = boundary.last ? Step.DONE : Step.PART_HEADER;

                    continue;
                }
            }
            else if( this.#step === Step.DONE )
            {
                this.emit( 'data', this.#data );
                this.emit( 'end' );
            }

            break;
        }
    }
}