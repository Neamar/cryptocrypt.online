import cryptHealthcheck from '../crypt-healthcheck.js';
import cryptRelease from '../crypt-release.js';

const jobs = {
  "crypt-healthcheck": cryptHealthcheck,
  "crypt-release": cryptRelease,
};

const job = process.argv[2];

if (!job) {
  throw new Error(`Missing job argument`);
}

if (!jobs[job]) {
  throw new Error(`Unknown job: ${job}`);
}

jobs[job]().then(() => process.exit());
