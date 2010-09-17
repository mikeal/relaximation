## Performance Tests

There are currently 4 tests. All tests benchmark concurrent performance by polling the average response time for all concurrent clients.

Two tests operate against a single database: test_writes.js tests the concurrent write performance and test_write_and_read.js tests concurrent writer and reader performance.

Two tests operate against two databases in order to show the differences in performance. It is strongly encouraged that you use this method to benchmark performance, testing two database running on the same server, one that is a release or trunk build and one that is a build with your intended performance improvements. The comparison tests are compare_write.js and compare_write_and_read.js .

# Running Tests

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
  -p,  --graph :: CouchDB to persist results in. Default is http://mikeal.couchone.com/graphs
  -r,  --recurrence :: How many times to run the tests. Deafult is 10.
</pre>
  
All the options have defaults except name1 and name2 which MUST to be set.

<pre>
  $ node compare_write_and_read.js --name1 trunk --name2 branch
</pre>

By default this test runs for 60 seconds (duration setting) against both servers 10 times (recurrence setting), this  means that by default this test will take 20 minutes to run.

# Test Output

Although it's not always immediately useful tests do continuously print their results. 

<pre>
  { 'trunk-reads': 
     { timeline: 59093
     , clients: 200
     , totalRequests: 54840
     , timesCount: 200
     , average: 425.315
     , oldest: Thu, 16 Sep 2010 23:59:34 GMT
     , last: Thu, 16 Sep 2010 23:59:35 GMT
     }
  }
  { 'trunk-writes': 
     { timeline: 60001
     , clients: 50
     , totalRequests: 980
     , timesCount: 50
     , average: 8928.1
     , oldest: Thu, 16 Sep 2010 23:59:19 GMT
     , last: Thu, 16 Sep 2010 23:59:23 GMT
     }
  }
</pre>

The first thing to notice is that clients may take some time to ramp up depending on the number of clients you told the test to use. This ramp up time insures that test clients are properly staggered more like real traffic.

The average is the amount of time, in milliseconds that the **last** request took. The last attribute is how long ago the most recent request finished in milliseconds. Once last is greater than average you can assume that the real average response time is closer to the last attribute.

# Graphs

By default all tests will POST the results to http://graphs.mikeal.couchone.com which contains a couchapp for viewing test results as a graph. An url the graph will be the last thing printed by the test before exiting.

<pre>
  { 'branch-writes': 
     { timeline: 60001
     , clients: 50
     , totalRequests: 980
     , timesCount: 50
     , average: 8928.1
     , oldest: Thu, 16 Sep 2010 23:59:19 GMT
     , last: Thu, 16 Sep 2010 23:59:23 GMT
     }
  }
  http://graphs.mikeal.couchone.com/#/graph/3bf46fdb22194aaefd6aa47f460333e2
</pre>

The graph server pages show a ton of info about the couchdb being tested and a couple different graphs that show information about the test run.

# CouchDB Configuration

Concurrent performance is really unreliable when running with Delayed Commits on, which as of 0.10 is the default configuration. You'll want to turn this off on order to make concurrent performance more stable over a test run. You can do this in your local couchdb config.

<pre>
  [couchdb]
  ;max_document_size = 4294967296 ; bytes
  delayed_commits = false;
</pre>
