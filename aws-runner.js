var sys = require("sys");
var http = require('http');
var AWS = require('aws-sdk');
var fs = require('fs');
var util = require('util');
var argv = require('minimist')(process.argv.slice(2));
console.dir(argv);

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
        arr.push(evalutateParams(params[key][i], response));
      }

      params[key] = arr;
    }
    else if(typeof params[key] === "object") {
      params[key] = evalutateParams(params[key], response);
    } 
  }
  // console.log(params)
  return params;
}

/* 
This function runs an AWS instruction, and when complete triggers the next instruction
*/

function runInstruction (response) {
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
    if (err) console.log(err, err.stack);
    else if (inst.sleep) {
      console.log('- Non-Blocking Sleep: ' + inst.sleep + ' miliseconds');
      setTimeout(function() {
        runInstruction(data);
      }, inst.sleep);
    } else {
      runInstruction(data);
    }
  });
}

/* 
For each filename passed to the program, the file is read, and parsed into aws instructions.
*/

argv._.forEach(function(filename) {
  fs.readFile(filename, 'utf8', function (err, data) {
    if (err) {
      console.log('Error: ' + err);
      return;
    }

    insts = JSON.parse(data);

    runInstruction();
  });
});
