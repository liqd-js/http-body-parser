'use strict';

const HttpHeaderParser = require('@liqd-js/http-header-parser');

const Step = { PREAMBLE: 0, PART_HEADER: 1, PART_BODY: 2, EPILOGUE: 3, DONE: 4 };
const STR =
{
    CLRF2               : Buffer.from( '\r\n',      'utf8' ),
    CLRFx2              : Buffer.from( '\r\n\r\n',  'utf8' ),
    BOUNDARY_END        : Buffer.from( '\r\n',      'utf8' ),
    BOUNDARY_BODY_END   : Buffer.from( '--\r\n',    'utf8' ),
}

class File
{
    constructor( name, mime )
    {
        this.name = name;
        this.mime = mime;
    }
}

module.exports = class MultipartParser
{
    static get File()
    {
        return File;
    }

    #boundary; #buffer; #step;
    #headers; #part; #is_stream = false;
    #data = {};

    constructor( boundary, buffer )
    {
        this.#boundary = Buffer.from( '--' + boundary, 'utf8' );
        this.#buffer = buffer;
        this.#step = Step.PREAMBLE;
    }

    _find_boundary()
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
    }

    parse()
    {
        let caret, boundary;

        while( true )
        {
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

                    continue;
                }
            }
            else if( this.#step === Step.PART_BODY )
            {
                if( boundary = this._find_boundary())
                {
                    let part_body_buffers = this.#buffer.splice( 0, boundary.start );

                    let part = Buffer.concat( part_body_buffers );

                    if( part.length < 1000 )
                    {
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
                    }

                    this.#buffer.splice( 0, boundary.length );
                    this.#step = boundary.last ? Step.DONE : Step.PART_HEADER;

                    continue;
                }
            }
            else if( this.#step === Step.DONE )
            {
                console.log( this.#data );
            }

            break;
        }
    }
}