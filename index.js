"use strict";

var _typeToStr = function(typeClass) {
  return typeClass.toString().match(/function\s(.*)\(/)[1];
};



/**
 * A schema.
 */
var Schema = function(schema) {
  if (!schema) {
    throw new Error('Schema is empty');
  }
  this._defaultLimitTypes = [String,Boolean,Number,Date,Array,Object]
  this.schema = schema;  
}



/**
 * Validate an object against this schema.\
 *
 * If validation fails. The `details` field in the returned `Error` instance will
 * be an `Array` containing per-field error messages.
 * 
 * @param {Object} obj Object to validate.
 * @param {Object} [options] Additional options.
 * @param {Boolean} [options.ignoreMissing] Whether to ignore missing keys.
 * @return {Promise}
 */
Schema.prototype.validate = function(obj, options) {
  var self = this;

  if (!obj) {
    throw new Error('Object is empty');
  }

  options = options || {};
  options.ignoreMissing = options.ignoreMissing || false;

  var ret = self._doValidate({
    schema: {
      path: '',
      node: self.schema,
    },
    object: obj,
  }, options);

  return ret.then(function(failures) {
    if (failures.length) {
      var e = new Error('Validation failed');

      e.failures = failures.map(function(e) {
        return e[0] + ': ' + e[1];
      });

      throw e;
    }
  });
}


/**
 * Validate given object node against given schema node.
 * @return {Promise}
 */
Schema.prototype._doValidate = function(params, options) {
  var self = this;

  var schemaPath = params.schema.path, 
    schemaNode = params.schema.node,
    obj = params.object,
    limitTypes = params.limitTypes || this._defaultLimitTypes;

  return Promise.all(Object.keys(schemaNode).map(function(key) {
    try {
      var currentPath = schemaPath + '/' + key,
        currentNode = limitTypes.indexOf(schemaNode[key]) > -1
          ? { type: schemaNode[key] }
          : schemaNode[key],
        objectNode = obj[key],
        currentNodeType = currentNode.type,
        currentNodeValidators = currentNode.validate || [];

      // if type not set
      if (!currentNodeType) {
        return Promise.resolve([[currentPath, 'invalid schema']]);
      }

      // missing?
      if (undefined === objectNode) {
        var failures = [];

        if (currentNode.required && !options.ignoreMissing) {
          failures.push([currentPath, 'missing value']);
        }

        return Promise.resolve(failures);
      }

      return new Promise(function(resolve, reject) {
        var failures = [];

        switch (currentNodeType) {
          case String:
            if ('string' !== typeof objectNode) {
              failures.push([currentPath, 'must be a string']);
            } else {
              if (Array.isArray(currentNode.enum)) {
                if (0 > currentNode.enum.indexOf(objectNode)) {
                  failures.push(
                    [currentPath, 'must be one of ' + currentNode.enum.join(', ')]
                  );
                }
              }
            }
            break;
          case Boolean:
            if ('boolean' !== typeof objectNode) {
              failures.push([currentPath, 'must be true or false']);
            }
            break;
          case Number:
            if ('number' !== typeof objectNode) {
              failures.push([currentPath, 'must be a number']);
            }
            break;
          case Date:
          case Object:
          case Array:
            if (!(objectNode instanceof currentNodeType)) {
              failures.push([currentPath, 'must be of type ' + _typeToStr(currentNodeType)]);
            }
            break;
          default:
            // if value should be an array
            if (Array.isArray(currentNodeType)) {
              if (!Array.isArray(objectNode)) {
                failures.push([currentPath, 'must be an array']);
              } else {
                var subSchema = currentNodeType[0];

                return Promise.all(Object.keys(objectNode).map(function(index) {
                  var item = objectNode[index];

                  return self._doValidate({
                    schema: {
                      path: currentPath + '/' + index,
                      node: subSchema,
                    },
                    object: item,
                  }, options);
                }))
                  .then(function(failures) {
                    resolve([].concat.apply([], failures));
                  })
                  .catch(reject);
              }
            }
            // else it must be an object
            else {
              return self._doValidate({
                schema: {
                  path: currentPath,
                  node: currentNodeType,
                },
                object: objectNode,
              }, options)
                .then(function(failures) {
                  resolve(failures);
                })
                .catch(reject);
            }
        }

        return resolve(failures);
      })
        .then(function(failures) {
          return Promise.all(currentNodeValidators.map(function(fn) {
            return fn(objectNode).catch(function(err) {
              failures.push([currentPath, err.message]);
            });
          }))
            .then(function() {
              return failures;
            });
        });
    } catch (err) {
      return Promise.reject(err);
    }
  }))
    .then(function(failures) {
      return [].concat.apply([], failures);
    });
}




/**
 * Helper to typeify()
 */
Schema.prototype._doTypeify = function(params) {
  var self = this;

  var schemaPath = params.schema.path, 
    schemaNode = params.schema.node,
    object = params.object,
    result = params.result,
    limitTypes = params.limitTypes || this._defaultLimitTypes;

  for (var key in schemaNode) {
    var currentPath = schemaPath + '/' + key,
      currentNode = limitTypes.indexOf(schemaNode[key]) < 0
        ? schemaNode[key]
        : { type: schemaNode[key] },
      objectNode = object[key],
      currentNodeType = currentNode.type;

    // console.log(currentPath, currentNodeType, objectNode);

    // if type not set
    if (!currentNodeType) {
      continue;
    }

    // missing?
    if (undefined === objectNode) {
      continue;
    }

    // null?
    if (null === objectNode) {
      result[key] = objectNode;
      continue;
    }

    try {
      switch (currentNodeType) {
        case String:
          if (-1 < limitTypes.indexOf(String)) {
            if ('string' !== typeof objectNode) {
              objectNode = '' + objectNode;
            }            
          }
          break;
        case Boolean:
          if (-1 < limitTypes.indexOf(Boolean) && 'boolean' !== typeof objectNode) {
            var tmp = ('' + objectNode).toLowerCase();

            if ('false' === tmp || '0' === tmp || 'no' === tmp) {
              objectNode = false;
            } else if ('true' === tmp || '1' === tmp || 'yes' === tmp) {
              objectNode = true;
            }
          }
          break;
        case Number:
          if (-1 < limitTypes.indexOf(Number) && 'number' !== typeof objectNode) {
            var tmp = '' + objectNode;

            tmp = (0 <= tmp.indexOf('.')) 
              ? parseFloat(tmp) 
              : parseInt(tmp);

            if (!Number.isNaN(tmp)) {
              objectNode = tmp;
            }
          }
          break;
        case Date:
          if (-1 < limitTypes.indexOf(Date) && !(objectNode instanceof Date)) {
            try {
              var tmp = new Date(objectNode);
              
              if (0 < tmp) {
                objectNode = tmp;
              }
            } catch (err) {
              // do nothing
            }
          }
          break;
        case Object:
        case Array:
        default:
          // if value should be an array
          if (Array.isArray(currentNodeType)) {
            if (Array.isArray(objectNode)) {
              var subSchema = currentNodeType[0];

              for (var index in objectNode) {
                var item = {},
                  subnode = {};

                subnode[index] = {};
                subnode[index].type = subSchema;
                item[index] = objectNode[index];

                self._doTypeify({
                  schema: {
                    path: currentPath,
                    node: subnode,
                  },
                  object: item,
                  result: item,
                  limitTypes: limitTypes,
                });

                // overwrite original
                objectNode[index] = item[index];
              }
            }
          }
          // else it just be an object
          else {
            self._doTypeify({
              schema: {
                path: currentPath,
                node: currentNodeType,
              },
              object: objectNode,
              result: objectNode,
              limitTypes: limitTypes,
            });
          }
      }
    } catch (err) {
      // do nothing
    } 

    // set final result
    result[key] = objectNode;
  }
}




/**
 * Decode the correct type for given object's properties based on this schema.
 *
 * This will iterate through the object's properties. If a property path is 
 * present in the schema then it will attempt to modify the property's value 
 * such that its runtime type matches what the schema expects for that property.
 *
 * This method is useful if you have parsed JSON data which you wish to insert, 
 * but in the case where all the property values are strings and the schema 
 * expects some of them to be booleans, dates, etc. 
 *
 * Any properties in the object which are not present in the schema are left 
 * unchanged. And any schema properties not present in the object are ignored.
 *
 * If `limitTypes` is set then it will only typeify the types given within. 
 * For example if we only wish to process `Date` types then we would pass 
 * `[Date]` to `limitTypes`.
 * 
 * @param {Object} obj Object to typeify.
 * @param {Object} [options] Additional options.
 * @param {Array} [options.limitTypes] Limit type-ification to given types.
 * @return {Object} Copy of the original object with new property values.
 */
Schema.prototype.typeify = function(obj, options) {
  if (!obj) {
    return obj;
  }

  options = options || {};

  var newObj = {};

  this._doTypeify({
    schema: {
      path: '',
      node: this.schema,
    },
    object: obj,
    result: newObj,
    limitTypes: options.limitTypes,
  });

  return newObj;
}


module.exports = function(schema) {
  return new Schema(schema);
};


exports.Schema = Schema;
