const autocannon = require('autocannon');

const urls = [
  'http://localhost:3000',
  'http://localhost:3000/stress-test'
];

urls.forEach(url => {
  const instance = autocannon({
    url,               // <-- use the dynamic url here
    duration: 10,
    connections: 50,   // Optional: increase load
    method: 'GET'
  }, (err, result) => {
    if (err) {
      console.error(`Error testing ${url}:`, err);
    } else {
      console.log(`Test finished for ${url}`);
      console.log(`Total requests to ${url}: ${result.requests.total}`);
      console.log(`duration: ${result.duration}`);
    }
  });

  // Optional: disable live output table
  autocannon.track(instance, {
    renderProgressBar: false,
    renderResultsTable: false,
    renderLatencyTable: false
  });
});



// const autocannon = require('autocannon');

// const urls = [
//   'http://localhost:3000',
//   'http://localhost:3000/stress-test'
// ];

// const runTest = (url) => {
//   return new Promise((resolve, reject) => {
//     const instance = autocannon({
//       url,
//       duration: 10,
//       connections: 10,
//       method: 'GET'
//     }, (err, result) => {
//       if (err) return reject(err);
//       console.log(`Total requests to ${url}: ${result.requests.total}`);
//       resolve();
//     });

//     // Optional: comment this out if you don't need table logging
    // autocannon.track(instance, { renderProgressBar: false });
//   });
// };

// const runAllTests = async () => {
//   for (const url of urls) {
//     console.log(`Testing: ${url}`);
//     await runTest(url);
//   }
// };

// runAllTests();
