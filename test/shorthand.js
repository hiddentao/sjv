"use strict";


var sinon = require('sinon');

var chai = require('chai'),
  expect = chai.expect,
  should = chai.should();

chai.use(require('sinon-chai'));

require('co-mocha');


var schema = require('../');


var mocker = null;

var test = exports

var tryCatch = function*(schemaObj, obj, options) {
  try {
    yield schemaObj.validate(obj, options);
    return null;
  } catch (e) {
    return e;
  }
};


var tryNoCatch = function*(schemaObj, obj, options) {
  try {
    yield schemaObj.validate(obj, options);
  } catch (e) {
    console.error('Unexpected error: ' + JSON.stringify(e.failures));
    throw e;
  }
};



test['simple match'] = function*() {
  var s = schema({
    name: String,
    numSiblings: Number,
    born: Date,
    hasKids: Boolean,
    cars: Array,
    address: Object
  });

  yield tryNoCatch(s, {
    name: 'test',
    numSiblings: 13,
    born: new Date(),
    hasKids: false,
    cars: [1, 2],
    address: {
      houseNum: 2
    },
  });
};


test['simple mismatch'] = function*() {
  var s = schema({
    name: String,
    type: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    numSiblings: Number,
    born: Date,
    hasKids: {
      type: Boolean,
    },
    cars: {
      type: Array
    },
    address: Object
  });

  var e = yield tryCatch(s, {
    name: 13,
    type: 'far',
    numSiblings: 'blah',
    born: 'fire',
    hasKids: new Date(),
    cars: {
      houseNum: 2,
    },
    address: [1, 2]
  });

  e.failures.should.eql([
    "/name: must be a string",
    "/type: must be one of low, medium, high",
    "/numSiblings: must be a number",
    "/born: must be of type Date",
    "/hasKids: must be true or false",
    "/cars: must be of type Array"
  ]);
};




test['not required'] = function*() {
  var s = schema({
    name: String,
    numSiblings: {
      type: Number
    },
    born: Date,
    hasKids: {
      type: Boolean,
    },
    cars: Array,
    address: {
      type: Object
    }
  });

  yield tryNoCatch(s, {});
};







test['array of items'] = {
  'match': function*() {
    var Child = {
      name: String,
      age: {
        type: Number
      }
    };

    var s = schema({
      name: String,
      children: {
        type: [Child]
      }
    });

    yield tryNoCatch(s, {
      name: 'john',
      children: [
        {
          name: 'jennifer',
          age: 23,
        },
        {
          name: 'mark',
          age: 54,
        },
      ]
    });
  },
  'mismatch': function*() {
    var Child = {
      name: String,
      age: Number
    };

    var s = schema({
      name: {
        type: String,
      },
      children: {
        type: [Child]
      }
    });

    var e = yield tryCatch(s, {
      name: 'john',
      children: [
        {
          name: 'jennifer',
          age: '23',
        },
        {
          name: 23,
          age: 'blah',
        },
      ]
    });

    e.failures.should.eql([
      '/children/0/age: must be a number',
      '/children/1/name: must be a string',
      '/children/1/age: must be a number'
    ]);
  }
};





test['sub-object'] = {
  'match': function*() {
    var Child = {
      name: String,
      age: Number
    };

    var s = schema({
      name: String,
      children: {
        type: Child
      }
    });

    yield tryNoCatch(s, {
      name: 'john',
      children: {
        name: 'jennifer',
        age: 23,
      },
    });
  },
  'mismatch': function*() {
    var Child = {
      name: String,
      age: {
        type: Number
      }
    };

    var s = schema({
      name: {
        type: String,
      },
      children: {
        type: Child
      }
    });

    var e = yield tryCatch(s, {
      name: 'john',
      children: {
        name: 23,
        age: 'blah',
      },
    });

    e.failures.should.eql([
      '/children/name: must be a string',
      '/children/age: must be a number'
    ]);
  }
};




test['deeply nested objects'] = {
  'match': function*() {
    var Child = {
      name: {
        type: String
      },
      address: {
        type: {
          houseNum: {
            type: Number
          },
          street: String,
          country: {
            type: String,
          },
        },
      },
      toys: {
        type: [{
          name: String
        }]
      }
    };

    var s = schema({
      name: String,
      children: {
        type: Child
      },
    });

    var e = yield tryCatch(s, {
      name: 'john',
      children: {
        name: 'jennifer',
        address: {
          houseNum: 23,
          street: 'mako',
          country: 1
        },
        toys: [{
          name: null,
        }],
        age: 23,
      },
    });

    e.failures.should.eql([
      "/children/address/country: must be a string",
      "/children/toys/0/name: must be a string"
      ])
  },
  'mismatch': function*() {
    var Child = {
      name: String,
      address: {
        type: {
          houseNum: Number,
          street: String,
          country: String,
        },
      },
      toys: {
        type: [{
          name: String
        }]
      }
    };

    var s = schema({
      name: {
        type: String,
      },
      children: {
        type: Child
      },
    });

    yield tryNoCatch(s, {
      name: 'john',
      children: {
        name: 'jennifer',
        address: {
          houseNum: 23,
          street: 'mako',
          country: 'uk'
        },
        toys: [{
          name: 'blah',
        }],
        age: 23,
      },
    });
  }
};
