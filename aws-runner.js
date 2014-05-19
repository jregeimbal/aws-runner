var sys = require("sys");
var http = require('http');
var AWS = require('aws-sdk');
var fs = require('fs');
var util = require('util');
var argv = require('minimist')(process.argv.slice(2));

var log_file = fs.createWriteStream('debug.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { // 
  if (argv.d) log_file.write(util.format(d) + '\n');
  if (argv.v) log_stdout.write(util.format(d) + '\n');
};

try {
  AWS.config.loadFromPath('./aws-config.json');

  var APIS = {};

  APIS['OpsWorks'] = new AWS.OpsWorks({region:'us-east-1'});
  APIS['ELB'] = new AWS.ELB({apiVersion:'2012-06-01'});
  APIS['Route53'] = new AWS.Route53({apiVersion:'2013-04-01', region:'us-east-1'});

  var insts;
  var responses = [];

  /* 
  This function parses a params object
  */

  function parseParams (params, response) {
    // console.log('response');
    // console.log(response);
    if(typeof params === "string") return params;

    for (var key in params) {
      if(typeof params[key] === "string") {
        // console.log('string');
        var value = params[key];
        if (value.substring(0, 5) === "eval(" && value.slice(-1) === ")") {
          params[key] = eval(value.substr(5, value.length - 6));
        }

        if (value.substring(0, 5) === "file(" && value.slice(-1) === ")") {
          params[key] =  fs.readFileSync(value.substr(5, value.length - 6), {encoding: "utf8"});
          console.log(params[key]);
        }

        // console.log(params[key]);
      }
      else if(Object.prototype.toString.call( params[key] ) === '[object Array]' ) {
        // console.log('ITS AN ARRAY ' + params[key].length);
        var arr = [];
        
        for (var i = params[key].length - 1; i >= 0; i--) {
          arr.push(parseParams(params[key][i], response));
        }

        params[key] = arr;
      }
      else if(typeof params[key] === "object") {
        params[key] = parseParams(params[key], response);
      } 
    }
    // console.log(params)
    return params;
  }

  /* 
  This function runs an AWS instruction, and when complete triggers the next instruction
  */

  function runInstruction (response, callback) {
    if (response) responses.push(response);

    var inst = insts.shift();
    if (!inst) return;
    if (inst.response) {
      responses.push(inst.response);
      if (!inst.api) { 
        runInstruction(inst.response);
        return;
      }
    }

    console.log(inst.api + ":" +inst.command);
    if (inst.params) parseParams(inst.params, response);
    console.log('- Params:\n', util.inspect(inst.params, false, null));

    APIS[inst.api][inst.command](inst.params, function(err, data) {
      if (data) console.log('- Response:\n', util.inspect(data, false, null));
      if (err) {
        console.log('I am here');
        console.log(err, err.stack);
        responses.push(err);
      } else if (inst.sleep) {
        console.log('- Non-Blocking Sleep: ' + inst.sleep + ' miliseconds');
        setTimeout(function() {
          runInstruction(data);
        }, inst.sleep);
      } else {
        runInstruction(data);
      }
      if (callback) callback(data);
    });
  }

  /* 
  For each filename passed to the program, the file is read, and parsed into aws instructions.
  */

  function begin () {
    argv._.forEach(function(filename) {
      fs.readFile(filename, 'utf8', function (err, data) {
        if (err) {
          console.log('Error: ' + err);
          return;
        }

        insts = JSON.parse(data);

        runInstruction(null, function(){       
          log_stdout.write(util.format(responses) + '\n');
        });
      });
    });
  }

  /*
  Finally the entry point for our script, process any data stream as a json object 
  */

  var variables = "";

  if (argv._.length) {

    // wait for stdin if flag -s is passed
    if (argv.s) {

      process.stdin.setEncoding('utf8');

      process.stdin.on('data', function (chunk) {
        variables+=chunk;
      });

      process.stdin.on('end', function () {
        if (variables) variables = JSON.parse(variables);
        console.log(variables);
        begin();
      });

      process.stdin.resume();
    } else {
      begin();
    }
  } else {
    log_stdout.write('Usage: node aws-runner.js [file1 [file2 [...]]] -flags\n'
        + 'Flags: \n'
        + '  -d : Debug mode (writes to debug.log)\n'
        + '  -v : Verbose mode (writes log to screen)\n'
        + '  -s : Accepts stream of data\n'
      );
  }
} 
catch(err) {
  log_stdout.write(util.format(err) + '\n');
}