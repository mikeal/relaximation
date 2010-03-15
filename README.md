## Running

<pre>
  $ cd tests
  $ node compare_write_and_read.js --help
  
  -w,  --wclients :: Number of concurrent write clients per process. Default is 50.
  -r,  --rclients :: Number of concurrent read clients per process. Default is 200.
  -u,  --url1 :: CouchDB url to run tests against. Default is http://localhost:5984
  -v,  --url2 :: CouchDB url to run tests against. Default is http://localhost:5985
  -1,  --name1 :: Name of first comparative. Required.
  -2,  --name2 :: Name of first comparative. Required.
  -d,  --doc :: small or large doc. Default is small.
  -t,  --duration :: Duration of the run in seconds. Default is 60.
  -i,  --poll :: Polling interval in seconds. Default is 1.
  -p,  --graph :: CouchDB to persist results in. Default is http://couchdb.couchdb.org/graphs
  -r,  --recurrence :: How many times to run the tests. Deafult is 10.
</pre>
  
All the options have defaults except name1 and name2 which need to be set.

<pre>
  $ node compare_write_and_read --name1 trunk --name2 branch
</pre>


