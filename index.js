#! /usr/bin/env node
import { select, input } from '@inquirer/prompts';
import { exec } from 'child_process';
import { type } from 'os';
import * as util from 'util';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read and parse package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf-8')
);
const version = packageJson.version;


const execPromise = util.promisify(exec);

async function openAndroidDeeplink(deviceId, deeplink) {
    return await execPromise(
        `adb -s ${deviceId} shell am start -a android.intent.action.VIEW -d "${deeplink}"`
    );
}

async function openIosDeeplink(deviceId, deeplink) {
   return await execPromise(
        `xcrun simctl openurl ${deviceId} "${deeplink}"`
    );
}
async function open(deviceObject, deeplink) {
    if (deviceObject.type === 'android') {
        return await openAndroidDeeplink(deviceObject.value, deeplink);
    } else if (deviceObject.type === 'ios') {
        return await openIosDeeplink(deviceObject.value, deeplink);
    } else {
        throw new Error('Unsupported device type');
    }
}

const rawIosDevices = await execPromise('xcrun simctl list |  grep \'Booted\'');
const iosDevices = rawIosDevices.stdout.split('\n').map(line=> line.trim()).filter(line => line.length > 0).map(line => {
    const parts = line.split('(');
    const partsLength = parts.length;
    const deviceName = parts[0].trim();
    const id = parts[partsLength - 2].trim().split(')')[0].trim();
    const output = { name: deviceName, value: id, type: 'ios' };
    return output;
});

const rawAndroidDevices = await execPromise('adb devices');
const androidDevices = rawAndroidDevices.stdout.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('List of devices attached')).map(line => {
    const parts = line.split('\t');
    return { name: parts[0], value: parts[0], type: 'android' };
}); 

const devices = [...iosDevices, ...androidDevices];

console.info(`[OpenLink v${version}] Running: npm run start | tee logsession.txt  - and openlink in the same folder will capture the invite link automatically`);


const selectedDeviceID = await select({ 
    message: 'Select the simulator',  
    choices: devices
});

const selectedDeviceObject = devices.find(device => device.value === selectedDeviceID);

// extract the invite link from the logsession.txt file
let extractedInviteLink = '';
try {
    const extractedInviteLinkLine = await execPromise(`grep 'https://' logsession.txt | tail -n 1`);
    // Extract the link from the log line using a RegExp
    const linkMatch = extractedInviteLinkLine?.stdout?.match(/https:\/\/[^\s}"']+/);
    extractedInviteLink = linkMatch ? linkMatch[0] : '';
} catch (error) {
    console.error('Error extracting link from logsession.txt:', error);
    console.warn('You can enter the link manually if you want.');    
}

const link = await input({ message: 'Enter your link', default: extractedInviteLink || '' });

const result = open(selectedDeviceObject, link);

console.warn(result.stdout);
console.error(result.stderr);

if (result.error) {
    console.error('Error:', result.error);
}
console.log('Done');

