/**
 * https://github.com/Unitech/pm2-axon
 */

'use strict';

const argv = require('argv');

argv.option({
  name: 'worker',
  type: 'boolean',
  description: 'Run as worker (Do not use this option)',
  example: "node index.js --worker"
});
argv.option({
  name: 'verbose',
  type: 'boolean',
  description: 'Show the details',
  example: "node index.js --verbose"
});
argv.option({
  name: 'port',
  short: 'p',
  type: 'int',
  description: 'Port to bind/connect for Master/Worker',
  example: "'node index.js --port=3000', 'node index.js -p 3000'"
});
argv.option({
  name: 'instances',
  short: 'i',
  type: 'int',
  description: 'Number of Worker',
  example: "'node index.js --instances=3', 'node index.js -i 3'"
});
argv.option({
  name: 'tasks',
  short: 't',
  type: 'int',
  description: 'Number of Task',
  example: "'node index.js --tasks=100000', 'node index.js -t 100000'"
});
const args = argv.run();




const port = args.options.port || 60000;
const instances = args.options.instances || 1;
const taskCnt = args.options.tasks || 50000; // Math.max((Math.random() * 100000).toFixed(), 10000);

function request(sock) {
  sock.send('request', [], res => {
    console.log('Received', res);
    if (res !== null) {
      sock.send('resolved', res, () => {});
      request(sock);
    }
  });
}

const pm2 = require('pm2');
pm2.connect(true, async err => {

  if (err) {
    console.error(err);
    process.exit(1);
  }

  const axon = require('pm2-axon');
  let sock;

  if (args.options.worker) {

    // Worker sends a request to Master

    sock = axon.socket('req');
    sock.connect(port);
    request(sock);

  } else {

    // Master receives the request from Worker

    sock = axon.socket('rep');
    let tasks = [];

    await new Promise((resolve, error) => {
      pm2.delete('index', err => {
        if (err) {
          //console.error('!!! Failed at deleting app', err);
        } else {
          console.log(`Deleted workers`);
        }
        resolve();
      });
    });

    const promise = new Promise(resolve => {

      for (let i = 0; i < taskCnt; i++) tasks.push(`task ${i + 1}`);
      let taskReceived = 0;

      sock.bind(port);
      sock.on('message', (task, data, reply) => {
        switch (task) {
          case 'request':
            if (tasks.length === 0) {
              reply(null);
            } else {
              const task = tasks.shift();
              reply(task);
            }
            break;
          case 'resolved':
            taskReceived++;
            if (args.options.verbose) console.log('Resolved', `${taskReceived}/${taskCnt}`);
            reply(1);
            break;
          case 'failed':
            tasks.push(data);
            if (args.options.verbose) console.log('Failed', `${taskReceived}/${taskCnt}`);
            reply(1);
            break;
          default:
            console.log(`Unknown task ${task}`);
        }
        if (taskReceived === taskCnt) resolve(); // Finish the process in Master
      });
    });


    console.log('');
    console.log(`Port: ${port}`, `Tasks: ${taskCnt}`, `Instance: ${instances}`);

    setTimeout(() => {
      pm2.start({
        script: 'index.js',
        exec_mode: 'cluster',
        instances: instances,
        args: `--worker -p ${port}`,
      }, async (err, apps) => {
        if (err) {
          console.error('!!! Failed at starting app', err);
          error();
        } else {
          console.log('Executing');
        }
      });
    }, 3000);

    await promise;

    if (args.options.verbose) console.log('Deleting workers');
    pm2.delete('index', err => {
      if (err) console.log(err);
      pm2.disconnect();
      console.log('Finished');
      process.exit(0);
    });
  }
});
