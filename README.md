Use this node script to execute a series of aws api calls which are defined in file formatted as JSON.

!!! This repo contains private keys, and must remain a private repo !!!

aws-runner is currently coded to pull in the OpsWorks, Route53, and ELB apis, however it is coded to support all apis, and pulling in an API is currently a single line of core.  It could be expanded in several ways so that the apis do not need to be specified explicitly.

Here an example file which defines two variables in a simulated response object, and later uses them as part of a Route53 RecordSet Alias

```javascript
[
  {
    "response" : {
      "var1" : "marine-test-1420245491.us-west-2.elb.amazonaws.com",
      "var2" : "Z33MTJ483KN6FU"
    }
  },
  {
    "api" : "Route53",
    "command" : "changeResourceRecordSets",
    "sleep" : 30000,
    "params" : {
      "ChangeBatch": {
         "Changes": [
         {
           "Action": "UPSERT",
           "ResourceRecordSet": {
             "Name": "ops.aimstaging.com",
             "Type": "A",
             "AliasTarget": {
               "DNSName": "eval(response.var1)",
               "EvaluateTargetHealth": true,
               "HostedZoneId": "eval(response.var2)"
             }
           }
         }
         ]
       },
       "HostedZoneId": "Z17J9Y6BY2ZRYC"
    }
  }
]
```

To run such a file, just run aws-runner passing a filename as an arg on the command line:

```
node aws-runner.js some-file.json
```

Unix Pipe with Data Streams
--------

That's all great, but it doesn't scale!  That's ok we've got a solution to that.  Since the purpose of aws-runner is to allow us to group together aws calls into standard process, we need to be able to provide these processes with dynamic data.  The way to do that is by giving aws-runner a stream of data when executed, this is referred to as pipiing data.  A simple command line call would look like:

```
echo '{
  "DNSName" : "opstest.aimstaging.com",
  "HostedZoneId" : "Z17J9Y6BY2ZRYC",
  "Target" : {
    "DNSName" : "marine-test-1420245491.us-west-2.elb.amazonaws.com",
    "HostedZoneId" : "Z33MTJ483KN6FU"
  }
}' | node aws-runner.js some-file.json
```
The stream provides is a json string and will be parsed into a variables object.  It can be as big and have as much depth as needed.

The contents of 'some-file.json' might look like the file below, please note the contents of the evals 'variables.*'

```javascript
[
  {
    "api" : "Route53",
    "command" : "changeResourceRecordSets",
    "params" : {
      "ChangeBatch": {
         "Changes": [
         {
           "Action": "UPSERT",
           "ResourceRecordSet": {
             "Name": "eval(variables.DNSName)",
             "Type": "A",
             "AliasTarget": {
               "DNSName": "eval(variables.Target.DNSName)",
               "EvaluateTargetHealth": true,
               "HostedZoneId": "eval(variables.Target.HostedZoneId)"
             }
           }
         }
         ]
       },
       "HostedZoneId": "eval(variables.HostedZoneId)"
    }
  }
]
```