'use strict';

var expect = require('chai').expect;
var through = require('through');
var when = require('when');
var InsertionLog = require('../lib/insertion_log');
var streamUtil = require('./util/stream');

function readEntireStream(stream) {
  return when.promise(function(resolve) {
    var data = '';
    stream.on('data', function(chunk) {
      data += chunk;
    });
    stream.on('close', function() {
      resolve(data);
    });
  });
}

function expectWithLog(loggingFn, expectedLines) {
  var stream = through();
  var promise = readEntireStream(stream, expectedLines);

  loggingFn(new InsertionLog(stream));
  stream.end();

  return promise.then(function(data) {
    expect(data).to.be.equal(expectedLines.join('\n') + '\n');
  });
}

var clearLine = '\u001b[2K' + '\u001b[0G';

function cursorUp(n) {
  if (n > 0) {
    return '\u001b[' + n + 'A';
  } else {
    return '';
  }
}


describe('Insertion log', function() {
  describe('.log', function() {
    it('should append first log line', function() {
      return expectWithLog(function(log) {
        log.log('A line');
      }, [
        clearLine + 'A line'
      ]);
    });

    it('should append log lines to the end', function() {
      return expectWithLog(function(log) {
        log.log('A line');
        log.log('Another line');
      }, [
        clearLine + 'A line',
        clearLine + 'Another line'
      ]);
    });
  });

  describe('.logAfter', function() {
    it('should insert log line after last line', function() {
      return expectWithLog(function(log) {
        log.log('A line', 'lid1');
        log.log('A second line', 'lid2');
        log.logAfter('lid2', 'Another line');
      }, [
        clearLine + 'A line',
        clearLine + 'A second line',
        clearLine + 'Another line'
      ]);
    });

    it('should insert log line after the first line', function() {
      return expectWithLog(function(log) {
        log.log('A line', 'lid1');
        log.log('A second line', 'lid2');
        log.logAfter('lid1', 'Another line');
      }, [
        clearLine + 'A line',
        clearLine + 'A second line',
        cursorUp(1) + clearLine + 'Another line',
        clearLine + 'A second line'
      ]);
    });

    it('should insert log line after the last line with the given id', function() {
      return expectWithLog(function(log) {
        log.log('A line', 'lid');
        log.log('A second line', 'lid');
        log.logAfter('lid', 'Another line');
      }, [
        clearLine + 'A line',
        clearLine + 'A second line',
        clearLine + 'Another line'
      ]);
    });

    it('should not insert log line after nonexistent line', function() {
      var log = new InsertionLog(through());
      expect(function() {
        log.logAfter('nonexistent', 'Hey!');
      }).to.throw(/No message found/);
    });
  });

  describe('.logBefore', function() {
    it('should insert log line before the last line', function() {
      return expectWithLog(function(log) {
        log.log('A line', 'lid1');
        log.log('A second line', 'lid2');
        log.logBefore('lid2', 'Another line');
      }, [
        clearLine + 'A line',
        clearLine + 'A second line',
        cursorUp(1) + clearLine + 'Another line',
        clearLine + 'A second line'
      ]);
    });

    it('should insert log line before the first line', function() {
      return expectWithLog(function(log) {
        log.log('A line', 'lid1');
        log.log('A second line', 'lid2');
        log.logBefore('lid1', 'Another line');
      }, [
        clearLine + 'A line',
        clearLine + 'A second line',
        cursorUp(2) + clearLine + 'Another line',
        clearLine + 'A line',
        clearLine + 'A second line'
      ]);
    });

    it('should insert log line before the last line with the given id', function() {
      return expectWithLog(function(log) {
        log.log('A line', 'lid');
        log.log('A second line', 'lid');
        log.logBefore('lid', 'Another line');
      }, [
        clearLine + 'A line',
        clearLine + 'A second line',
        cursorUp(1) + clearLine + 'Another line',
        clearLine + 'A second line',
      ]);
    });

    it('should not insert log line before nonexistent line', function() {
      var log = new InsertionLog(through());
      expect(function() {
        log.logBefore('nonexistent', 'Hey!');
      }).to.throw(/No message found/);
    });
  });

  describe('.replace', function() {
    it('should replace appended log line', function() {
      return expectWithLog(function(log) {
        log.log('A line', 'lid');
        log.replace('lid', 'Another line');
      }, [
        clearLine + 'A line',
        cursorUp(1) + clearLine + 'Another line',
      ]);
    });

    it('should replace logAfter line', function() {
      return expectWithLog(function(log) {
        log.log('A line', 'lid1');
        log.logAfter('lid1', 'A second line', 'lid2');
        log.replace('lid2', 'Another line');
      }, [
        clearLine + 'A line',
        clearLine + 'A second line',
        cursorUp(1) + clearLine + 'Another line',
      ]);
    });

    it('should replace logBefore line', function() {
      return expectWithLog(function(log) {
        log.log('A line', 'lid1');
        log.logBefore('lid1', 'A second line', 'lid2');
        log.replace('lid2', 'Another line');
      }, [
        clearLine + 'A line',
        cursorUp(1) + clearLine + 'A second line',
        clearLine + 'A line',
        cursorUp(2) + clearLine + 'Another line',
        clearLine + 'A line',
      ]);
    });

    it('should replace the last printed line with the given id', function() {
      return expectWithLog(function(log) {
        log.log('A line', 'lid');
        log.log('A second line', 'lid');
        log.replace('lid', 'Another line');
      }, [
        clearLine + 'A line',
        clearLine + 'A second line',
        cursorUp(1) + clearLine + 'Another line'
      ]);
    });

    it('should not replace nonexistent line', function() {
      var log = new InsertionLog(through());
      expect(function() {
        log.replace('nonexistent', 'Hey!');
      }).to.throw(/No message found/);
    });
  });
});
