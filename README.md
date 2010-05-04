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
  $ node compare_write_and_read --name1 trunk --name2 branch
</pre>

By default this test runes for 60 seconds (duration setting) against both servers 10 times (recurrence setting), this  means that by default this test will take 20 minutes to run.

# Test Output

Although it's not always immediately useful tests do continuously print their results. 

<pre>
  {"time":1.001,"writes":{"clients":9,"average":7,"last":5},"reads":{"clients":4,"average":2,"last":2}}
  {"time":2.001,"writes":{"clients":19,"average":17,"last":12},"reads":{"clients":14,"average":13,"last":3}}
  {"time":3.001,"writes":{"clients":29,"average":37,"last":7},"reads":{"clients":24,"average":13,"last":15}}
  {"time":4.001,"writes":{"clients":37,"average":117,"last":189},"reads":{"clients":32,"average":102,"last":197}}
  {"time":5.001,"writes":{"clients":49,"average":60,"last":29},"reads":{"clients":44,"average":53,"last":37}}
  {"time":6.002,"writes":{"clients":50,"average":93,"last":29},"reads":{"clients":54,"average":41,"last":7}}
  {"time":7.001,"writes":{"clients":50,"average":69,"last":115},"reads":{"clients":64,"average":44,"last":26}}
  {"time":8.001,"writes":{"clients":50,"average":67,"last":12},"reads":{"clients":74,"average":72,"last":22}}
</pre>

The first thing to notice is that clients may take some time to ramp up depending on the number of clients you told the test to use. This ramp up time insures that test clients are properly staggered more like real traffic.

The average is the amount of time, in milliseconds that the **last** request took. The last attribute is how long ago the most recent request finished in milliseconds. Once last is greater than average you can assume that the real average response time is closer to the last attribute.

# Graphs

By default all tests will POST the results to http://mikeal.couchone.com/graphs which contains a couchapp for viewing test results as a graph. An url the graph will be the last thing printed by the test before exiting.

<pre>
  {"time":58.001,"writes":{"clients":50,"average":174,"last":30},"reads":{"clients":200,"average":142,"last":124}}
  {"time":59.001,"writes":{"clients":50,"average":148,"last":61},"reads":{"clients":200,"average":142,"last":13}}
  {"time":60.001,"writes":{"clients":50,"average":155,"last":97},"reads":{"clients":200,"average":152,"last":59}}
  http://mikeal.couchone.com/graphs/_design/app/_show/compareWriteReadTest/c34d5d47f99e11be1f591832d00037e5
</pre>

![graph](http://mikeal.couchone.com/graphs/c34d5d47f99e11be1f591832d00037e5/Screen%20shot%202010-05-04%20at%203.59.00%20PM.png "Sample Graph")

A few notes about the graph. Lines don't start until the number of clients has ramped up to max level defined for the test, and this is across all recurrences of the same test run. This means that performance problems that might occur when you first being testing will not be visible.
