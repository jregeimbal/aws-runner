Use this node script to execute a series of aws api calls which are defined in file formatted as JSON.

Here an example file which defines two variables in a simulated response object, and later uses them as part of a Route53 RecordSet Alias

```
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
