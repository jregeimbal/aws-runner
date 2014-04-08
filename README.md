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
