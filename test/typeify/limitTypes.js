"use strict";

var schema = require('../../');


module.exports = function*() {
  var self = this;

  this.s = schema({
    first: {
      type: {
        name: {
          type: [String],
        },
        age: {
          type: Number,
        },
        old: {
          type: Boolean,
        },
      }
    }
  });

  self.s.typeify({
    first: {
      name: [23],
      age: '87',
      old: '1',
    }
  }, { limitTypes: [Number] }).should.eql({
    first: {
      name: [23],
      age: 87,
      old: '1',
    }
  });


  self.s.typeify({
    first: {
      name: [23],
      age: '87',
      old: '1',
    }
  }, { limitTypes: [String] }).should.eql({
    first: {
      name: ['23'],
      age: '87',
      old: '1',
    }
  });


  self.s.typeify({
    first: {
      name: [23],
      age: '87',
      old: '1',
    }
  }, { limitTypes: [Number, Boolean] }).should.eql({
    first: {
      name: [23],
      age: 87,
      old: true,
    }
  });
};
