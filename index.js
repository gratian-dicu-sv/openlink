#! /usr/bin/env node
import { select, input } from '@inquirer/prompts';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

const files = await execPromise('xcrun simctl list |  grep \'Booted\'');
const devices = files.stdout.split('\n').map(line=> line.trim()).filter(line => line.length > 0).map(line => {
    const parts = line.split('(');
    const partsLength = parts.length;
    const deviceName = parts[0].trim();
    const id = parts[partsLength - 2].trim().split(')')[0].trim();
    const output = { name: deviceName, value: id };
    return output
}
);
const selectedDeviceID = await select({ message: 'Select the simulator',  choices: devices});

const link = await input({ message: 'Enter your link' });

const result = await execPromise(`xcrun simctl openurl ${selectedDeviceID} "${link}"`);
console.warn(result.stdout);
console.error(result.stderr);
if (result.error) {
    console.error('Error:', result.error);
}
console.log('Done');

