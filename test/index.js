'use strict';

var should = require('should');
var through = require('through2');
var switchStream = require('..');

describe('switchStream', function() {

  var plusStream = function() {
    return through.obj(function(buf, enc, cb) {
      cb(null, buf + 1);
    });
  };

  var lazyStream = function() {
    return through.obj(function(buf, enc, cb) {
      setTimeout(function() {
        cb(null, buf + 1);
      }, 100);
    });
  };

  var doubleStream = function() {
    return through.obj(function(buf, enc, cb) {
      this.push(buf * 2);
      cb();
    });
  };

  var errorStream = function() {
    return through.obj(function(buf, enc, cb) {
      cb(new Error('err'));
    });
  };

  it('should pipe to different stream', function(done) {
    var stream = switchStream(function(buf) {
      if (buf < 3) {
        return 'plus1';
      } else if (buf < 6) {
        return 'double';
      }
    }, {
      'plus1': plusStream(),
      'double': doubleStream()
    });

    var ret = [];
    stream
    .on('data', function(data) {
      ret.push(data);
    })
    .on('end', function() {
      ret.should.eql([1, 2, 3, 6, 8, 10, 6, 7, 8, 9]);
      done();
    });

    for(var i = 0; i < 10; i++) {
      stream.write(i);
    }
    stream.end();
  });

  it('should pass through when no matched', function(done) {
    var stream = switchStream(function(buf) {
      if (buf > 3) return 'lazy';
    }, {
      'lazy': lazyStream()
    });

    var ret = [];
    stream
    .on('data', function(data) {
      ret.push(data);
    })
    .on('end', function() {
      ret.should.eql([0, 1, 2, 3, 5, 6]);
      done();
    });

    for(var i = 0; i < 6; i++) {
      stream.write(i);
    }
    stream.end();
  });

  it('should support switch string', function(done) {
    var stream = switchStream('default', {
      'default': plusStream()
    });

    var ret = [];
    stream
    .on('data', function(data) {
      ret.push(data);
    })
    .on('end', function() {
      ret.should.eql([1, 2, 3]);
      done();
    });

    for(var i = 0; i < 3; i++) {
      stream.write(i);
    }
    stream.end();
  });

  it('should listen error event', function(done) {
    var stream = switchStream('default', {
      'default': errorStream()
    });
    stream.on('error', function(err) {
      should.exist(err);
      done();
    });
    stream.write(0);
    stream.end();
  });

  it('should throw when not stream', function() {
    (function() {
      switchStream('default', {
        'case1': errorStream(),
        'case2': 1
      });
    }).should.throw('case2 is not stream');
  });
});
