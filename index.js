'use strict';

var duplexer2 = require('duplexer2');
var through = require('through2');
var Stream = require('stream');

module.exports = function(_switch, cases) {
  var output = through.obj();

  var indexes = [], streams = [];
  for (var key in cases) {
    var stream = cases[key];
    if (!(stream instanceof Stream)) throw new Error(key + ' is not stream');
    stream.on('error', function(err) {
      ret.emit('error', err);
    });
    stream.pipe(output);
    streams.push(stream);
    indexes.push(key);
  }

  var input = through.obj(function transport(buf, enc, cb) {
    var res = callSwtich(_switch, buf);
    var i = indexes.indexOf(res);
    if (i > -1) {
      streams[i].write(buf);
      return cb();
    }

    this.push(buf);
    cb();
  }, function flush(cb) {
    streams.forEach(function(stream) {
      stream.end();
    });
    cb();
  });
  input.pipe(output);

  var ret = duplexer2(input, output);
  return ret;
};

function callSwtich(_switch, buf) {
  if (typeof _switch === 'function') {
    return _switch(buf);
  }
  return _switch;
}
