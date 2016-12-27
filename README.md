# sjv

[![Build Status](https://secure.travis-ci.org/hiddentao/sjv.png)](http://travis-ci.org/hiddentao/sjv)

An easy-to-write yet powerful schema validator for objects.

## Features

* ES5-compatible, uses Promises
* Elegant, minimal syntax
* Comprehensive error reporting - all validation failures, not just first one
* Asynchronous custom validators
* [Type-matching](#type-matching)
* No other library dependencies (small browser footprint)

## Installation

**This package requires Node 4 or above**

```bash
$ npm install sjv
```

To use in the browser ensure you must have a working Promise implementation
(e.g. [bluebird](http://bluebirdjs.com/)) available at `window.Promise`.

## Usage

Here is a schema with all the possible field types:

```js
var schema = {
  name: String, // shorthand for `{ type: String }`
  isMarried: Boolean,
  numCars: {
    type: Number
  },
  born: {
    type: Date
  },
  // any plain JS object with any keys
  jobDetails: {
    type: Object
  },
  // a simple array with any data
  favouriteNumbers: {
    type: Array
  },
  // a nested object which adheres to given schema
  address: {
    type: {
      houseNum: {
        type: Number
      },
      // value which must be one of given strings
      taxBand: {
        type: String,
        enum: ['low', 'medium', 'high'],
      },
    },
  },
  // an array of nested objects which must adhere to given schema
  children: {
    type: [{
      name: {
        type: String,
        // custom validators
        validate: [
          function(value) {
            if ('john' === value) {
              return Promise.reject(new Error('cannot be john'));
            } else {
              return Promise.resolve();
            }
          }
        ]
      },
      age: {
        type: Number
      }
    }],
  },
}
```


## Example

First we define the schema:


```js
var EmployeeSchema = {
  name: {
    type: String,
    required: true
  },
  born: {
    type: Date,
  }
  numChildren: {
    type: Number,
  },
  address: {
    type: {
      houseNum: {
        type: Number
      },
      street: {
        type: String
      },
      country: {
        type: String,
        required: true
      },
    },
  },
  spouse: {
    type: {
      name: {
        type: String,
        required: true      
      }
    }
  },
};

var CompanySchema = {
  name: {
    type: String,
    required: true
  },
  employees: {
    type: [EmployeeSchema],
    required: true
  },
};
```

Now we can validate data against it:

```js
var schema = require('sjv')(CompanySchema);

schema.validate({
  name: 'my company',
  employees: [
    {
      name: 'john',
      born: 'last year',
      numChildren: 1,
      address: {
        houseNum: 12,
        street: 'view road',
        country: 'uk',
      }
    },
    {
      name: 'mark',
      born: new Date(),
      numChildren: null,
      address: {
        houseNum: 25,
        street: 'view road'
      },
      spouse: {
        name: 23,
        age: 23
      }
    },
  ]
})
.catch(function(err) {

  /*
    Error: Validation failed
   */
  console.log(err.toString());  

  /*
  [
    "/employees/0/born: must be of type Date",
    "/employees/1/numChildren: must be a number",
    "/employees/1/address/country: missing value",
    "/employees/1/spouse/name: must be a string"
  ]
  */
  console.log(err.failures);
});
```

### Type matching

When stringifying JSON you often lose type information (e.g. `Date` instances get converted to strings). When the stringified version gets parsed back into a JSON object you can use the `typeify()` function to help restore type information:

```js
var schema = {
  name: {
    type: String
  },
  isMarried: {
    type: Boolean
  },
  numCars: {
    type: Number
  },
  born: {
    type: Date
  }
};

var object = {
  name: 'John',
  isMarried: true,
  numCars: 3,
  born: new Date(2015,0,1)
}

var str = JSON.stringify(object);

/*
"{"name":"John","isMarried":true,"numCars":3,"born":"2014-12-31T16:00:00.000Z"}"
*/

var newObject = JSON.parse(str);

/*
{
  name: 'John',
  isMarried: true,
  numCars: 3,
  born: "2014-12-31T16:00:00.000Z"
}
*/

var typedObject = schema.typeify(newObject);

/*
{
  name: 'John',
  isMarried: true,
  numCars: 3,
  born: Date("2014-12-31T16:00:00.000Z")
}
*/
```

The type-ification process is quite tolerant of values. For example, for boolean values;

* `false` <- `"false"` or `"FALSE"` or `"no"` or `"NO"` or `"0"` or `0`
* `true` <- `"true"` or `"TRUE"` or `"yes"` or `"YES"` or `"1"` or `1`

To take the previous example again:

```js
var newObject = {
  name: 'John'
  isMarried: 'no'
  numCars: '76'
  born: '2014-12-31T16:00:00.000Z'
};

var typedObject = schema.typeify(newObject);

/*
{
  name: 'John',
  isMarried: false,
  numCars: 76,
  born: Date("2014-12-31T16:00:00.000Z")
}
*/
```


It is also smart enough to know when a conversion isn't possible. Instead of throwing an error it will simply pass through the original value.

Using the schema from our previous example:

```js
var newObject = {
  name: null
  isMarried: function() {}
  numCars: false,
  born: 'blabla'
};

var typedObject = schema.typeify(newObject);

/*
{
  name: null,
  isMarried: function() {}
  numCars: false
  born: 'blabla'
}
*/
```


You can limit type-ification to certain types only by setting the
`limitTypes` option:

```js
var newObject = {
  name: 23,
  isMarried: '0',
  numCars: '3',
  born: '2018-01-01'
};

var typedObject = schema.typeify(newObject, { limitTypes: [String]});

/*
{
  name: '23',
  isMarried: '0',
  numCars: '3',
  born: '2018-01-01'
}
*/
```

## Building

To run the tests:

    $ npm install -g gulp
    $ npm install
    $ npm test

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](https://github.com/hiddentao/sjv/blob/master/CONTRIBUTING.md).

## License

MIT - see [LICENSE.md](https://github.com/hiddentao/sjv/blob/master/LICENSE.md)
