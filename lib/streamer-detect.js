//Copyright 2026 by Callenberg on Github, all rights reserved.
//GNU General Public License v3.0 see license.txt            [Source code]
//      ~ controls for detecting events for pages and frames  ~
const fs = require('fs');                           //for reading files
//--------------------------------------------------debugging to files in /streamer/data
/*
//var LogStream = '/streamer/data/ctlstdout.log';
var LogStream = '/dev/null';
const { Console } = require('console');

const output = fs.createWriteStream(LogStream);
const errorOutput = fs.createWriteStream('/dev/null');

const console = new Console({ stdout: output, stderr: errorOutput });
*/
//------------------------------------------------------------------------------------
const aux = require('./streamer-auxiliary.js');
const exec = require('child_process').exec;         //for CLI
const execSync = require('child_process').execSync; //for synced CLI
const mod = require('/streamer/streamer-model.js'); //model of streamer

module.exports.readAlsaStatus = readAlsaStatus;
module.exports.detectStreamingStatus = detectStreamingStatus;
module.exports.readWifiStatus = readWifiStatus;
module.exports.detectWifiStatus = detectWifiStatus;
module.exports.readWiredStatus = readWiredStatus;
module.exports.detectWiredStatus = detectWiredStatus;
module.exports.readConnectedBtDevices = readConnectedBtDevices;
module.exports.readPairedBtDevices = readPairedBtDevices;
module.exports.detectBluetoothDevices = detectBluetoothDevices;
module.exports.startWatching = startWatching;
module.exports.stopWatching = stopWatching;
//_________________________________________________________________WATCH and DETECT
//There are watchers for:
// a) detect streamimng status, what is streaming?
// b) detect Wi-Fi external connection disconnection 
// c) detect wired status. Is there the LAN cable inserted or not?
// d) detect bluetooth service, on or off
// e) detect bluetooth source devices disconnects and connects

//Global Variables_______________________________________________________________
//timer intervals
//main interval for watchers - prime integer
const watcherInterval = 2001;  //base interval (node-watcher default: 200 ms)  
//timer types: based on 'watcherInterval', but some timer might be extended
var streamingWatcher = false;           //[a] watch Alsa status, who is streaming
var wifiWatcher = false;                //[b] watch Wi-Fi status, connected/disconnected
var lanWatcher = false;                 //[c] watch wired status, the LAN cable
var bluetoothDeviceWatcher = false;     //[d] watch bluetooth device (phones)


//Read and detect functions for Streamer Start Page =====================================
//=======================================================================================
//...................................................................... Streaming status
/**What is the status of the alsa:                                    ------[Reader]-----
 * Read the status and returns the bin file, e.g. "/bin/librespot" or 
 * "/usr/bin/bluealsa". If alsa is closed it returns "idle".
 * Note this is the status of alsa. The staes are defined in streamer-model.js
 * The state of Streamer is spotify, bluetooth, idle, error or unknown.
 * @return {string}     bin file or "idle"
 */
async function readAlsaStatus() {
    //A. Read the Alsa proc file
    let pid = "";           //pid  string to be filled
    let bin = "";           //pmap string to be filled
    try {
        pid = execSync(`sudo cat /proc/asound/card0/pcm0p/sub0/status | grep owner_pid | awk '{print $3}' | tr -d "\n"  `,
            { uid: 1000, gid: 1000, encoding: 'utf8' });
        //console.log(aux.timeStamp(), "alsa: alsa pid? ", pid);
    }
    catch (err) {
        console.log(aux.timeStamp(), "alsa: proc read ERROR\n", err);
        return "error";
    };
    //B. If there is a pid, get the bin file
    if (pid.length > 0) {
        try {
            bin = execSync(`sudo pmap -q -A ffff1000,ffff1100 ${pid} | cut -d'-' -f1 | awk '{print $2}' | tr -d "\n" `,
                { uid: 1000, gid: 1000, encoding: 'utf8' });
            //console.log(aux.timeStamp(), "alsa: alsa is run by =>", bin);
        }
        catch (err) {
            console.log(aux.timeStamp(), "alsa: proc read ERROR\n", err);
            return "error";
        };
        return bin;
    }
    else {

        return "idle";
    };
};
//a) Watch and detect changes in alsa status:                       ------[Detector]-----
/**Monitor streaming services using Alsa and return changes in the Alsa-status.
 * Reads Alsa status, if there is a change it calls mod.newStreamingStatus('alsaStatus')
 * Note: this is not state changes of Streamer [spotify, bluetooth, idle, error or unknown].
 * @param {watcher}      interval, uses GV watcherInterval
 * @return {?}           of no interest
 */
async function detectStreamingStatus(interval = watcherInterval) {
    let alsaStatus = await readAlsaStatus();  //get the initial status of alsa
    let oldAlsaStatus = alsaStatus;
    //Start to watch alsa... and detect.
    streamingWatcher = setInterval(async function () { 
        alsaStatus = await readAlsaStatus();
        if (alsaStatus == oldAlsaStatus) { 
            //NO CHANGE - no action
        } 
        else {
            //CHANGE - notify streamer model of new Alsa status
            //console.log(aux.timeStamp(),"detect:[status change is:",oldAlsaStatus, "=>", alsaStatus,"]");
            oldAlsaStatus = alsaStatus;
            mod.newStreamingStatus(alsaStatus);
        };
    }, interval);
    //... end of monitor loop;
    return true;
};
/**Stop to detect events for Start Page streaming state frame.
 * It will be stopped when there is no Start Page open (e.g. connected via socket.io).
 * @return {boolean}      true
 */
function stopStreamDetect() {
    //console.log(aux.timeStamp(), 'alsa: stopped watcher/detector for Alsa status [X]');
    clearInterval(streamingWatcher);        //                                stop [a]
    return true;
};
//.......................................................................... Wi-Fi status
//What is the wifi status:                                            ------[Reader]-----
/** Reads the Wi-Fi nmcli status and returns disconnected or connected.
 * Check the connection with this Command-Line Interface:
 *   nmcli device status | grep wlan1 | awk '{ print $3}' | tr -d "\n"
 * @return { string }      connected or disconnected
    */
function readWifiStatus() {
    let status = "disconnected";
    try {
        status = execSync(`sudo nmcli device status | grep wlan1 | awk '{ print $3}' | tr -d "\n"  `,
            { uid: 1000, gid: 1000, encoding: 'utf8' });
       // console.log(aux.timeStamp(), "wifi: Status? ", status);
    }
    catch (err) {
        console.log(aux.timeStamp(), "wifi: nmcli read ERROR\n", err);
        return "disconnected"; 
    };
    return status;
};
//b) Watch and detect changes in Wi-Fi status:                      ------[Detector]-----
/**Monitor the wi-fi connection.
 * Reads wifi status, if there is a change it calls mod.newWififStatus('wifiStatus')
 * Note: status and state of Streamer is the same here [ssid, ipaddress] or [].]
 * @param {watcher}      interval, uses GV watcherInterval
 * @return {?}           of no interest
 */
async function detectWifiStatus(interval = watcherInterval + 3000) {
    let wifiStatus = await readWifiStatus();  //get the initial status of wifi
    let oldWifiStatus = wifiStatus;
    //Start to watch wifi... and detect.
    wifiWatcher = setInterval(async function () {
        wifiStatus = await readWifiStatus();
        if (wifiStatus == oldWifiStatus) {
            //NO CHANGE - no action
        }
        else {
            //CHANGE - notify streamer model of new Wi-Fi status
            console.log(aux.timeStamp(), "wifi:[status change is:", oldWifiStatus, "=>", wifiStatus, "]");
            oldWifiStatus = wifiStatus;
            mod.newWifiStatus(wifiStatus);
        };
    }, interval);
    //... end of monitor loop;
    return true;
};
/**Stop to detect events for Start Page streaming state frame.
 * It will be stopped when there is no Start Page open (e.g. connected via socket.io).
 * @return {boolean}      true
 */
function stopWifiDetect() {
    //console.log(aux.timeStamp(), 'wifi: stopped watcher/detector for Wi-Fi status [X]');
    clearInterval(wifiWatcher);        //                                stop [b]
    return true;
};

//............................................................................ LAN status
//What is the cabled LAN status:                                      ------[Reader]-----
/** Returns connected if there is a LAN cable attached otherwise disconnected.
 * Use the Command-Line Interface to check the LAN connection:
 * nmcli device status | grep eth0 | awk '{ print $3}'
 *It is believed that the ip command is bullet proof.
 * @return {string}   IP address or ""
 */
async function readWiredStatus() {
    let status = "disconnected";
    try {
        status = 
            execSync(`sudo nmcli device status | grep eth0 | awk '{ print $3}' | tr -d "\n" `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
    }
    catch (err) {
        return "disconnected";
    };
    //console.log(aux.timeStamp(), "lan: LAN status is =:", status);
    return status;
};
//c) Watch and detect changes in LAN status:                       ------[Detector]-----
/**Monitor the LAN cable and return changes when detached or attached.
 * Reads ip status, if there is a change it calls mod.newWiredStatus('wifiStatus')
 * Note: status and state of Streamer is the same here [ssid, ipaddress] or [].
 * @param {watcher}      interval, uses GV watcherInterval
 * @return {?}           of no interest
 */
async function detectWiredStatus(interval = watcherInterval + 4500) {
    let wiredStatus = await readWiredStatus();  //get the initial status of wired connection
    let oldWiredStatus = wiredStatus;
    //Start to watch wired LAN... and detect.
    lanWatcher = setInterval(async function () {
        wiredStatus = await readWiredStatus();
        if (wiredStatus == oldWiredStatus) {
            //NO CHANGE - no action
        }
        else {
            //CHANGE - notify streamer model of new wired LAN status
            console.log(aux.timeStamp(), "lan:[status change is:", oldWiredStatus, "=>", wiredStatus, "]");
            oldWiredStatus = wiredStatus;
            mod.newWiredStatus(wiredStatus);
        };
    }, interval);
    //... end of monitor loop;
    return true;
};
/**Stop to detect events for Start Page streaming state frame.
 * It will be stopped when there is no Start Page open (e.g. connected via socket.io).
 * @return {boolean}      true
 */
function stopWiredDetect() {
    //console.log(aux.timeStamp(), 'lan: stopped watcher/detector for LAN status [X]');
    clearInterval(lanWatcher);        //                                stop [c]
    return true;
};
//.............................................................. bluetooth source devices
//What bluetooth devices are CONNECTED?                               ------[Reader]-----
/**Returns BD adresses of connected bluetooth source devices (phones).
 * Use the Command-Line Interface to check the bluetooth connection:
 *   bluetoothctl devices Connected | cut - d' ' - f2'
 *Is this needed above? | tr -d "\n"
 * @return {string}   BD addresses on each line or ""
 */
async function readConnectedBtDevices() {
    let status = "";
    try {
        status = execSync(`sudo bluetoothctl devices Connected | cut -d' ' -f2  `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
        // Implementation for reading connected Bluetooth devices
    } catch (error) {
        console.error("Error reading connected Bluetooth devices:", error);
    }
    return status;
};
//What bluetooth devices are PAIRED?                               ------[Reader]-----
/**Returns BD adresses of paired bluetooth source devices (phones).
 * Note: a paired device can also be connected.
 * Use the Command-Line Interface to check the bluetooth connection:
 *   bluetoothctl devices Paired | cut - d' ' - f2'
 *Is this needed above? | tr -d "\n"
 * @return {string}   BD addresses on each line or ""
 */
async function readPairedBtDevices() {
    let status = "";
    try {
        status = execSync(`sudo bluetoothctl devices Paired | cut -d' ' -f2  `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 5000 });
        // Implementation for reading connected Bluetooth devices
    } catch (error) {
        console.error("Error reading connected Bluetooth devices:", error);
    }
    return status;
};

//d) Watch and detect bluetooth device changes:                    ------[Detector]-----
/**Monitor the status of bluetooth source device, connected and paired ones.
 * There can be one or up to seven connected devices like phones.
 * Two strings have to be compared, the string of connected devices and paired devices.
 * If there is a change in one of them - notify model what changed and get a render.
 * @param  {integer}    interval, is watcherInterval as a default (2 sec)
 * @return {?}          of no interest
 */
async function detectBluetoothDevices(interval = watcherInterval + 1000) {
    let connectedString = await readConnectedBtDevices();
    let oldConnectedString = connectedString;
    let pairedString = await readPairedBtDevices();
    let oldPairedString = pairedString;
    //console.log(aux.timeStamp(), "detect: bt source CONNECTED devices at boot =", connectedString);
    //console.log(aux.timeStamp(), "detect: bt source PAIRED devices at boot    =", pairedString);
    bluetoothDeviceWatcher = setInterval(async function () {
        connectedString = await readConnectedBtDevices();
        if (connectedString !== oldConnectedString) {
            console.log(aux.timeStamp(), "detect: bluetooth CONNECTED change:", oldConnectedString, ">", connectedString);
            if (connectedString === "") {
                await mod.newDeviceStatus("NoConnection");               //await required, render NO connection before paired
            }
            else {
                await mod.newDeviceStatus("ConnectChanged"); //await required, render NEW connections before paired
            };
            oldConnectedString = connectedString;
        };
        pairedString = await readPairedBtDevices();
        if (pairedString !== oldPairedString) {
            console.log(aux.timeStamp(), "detect: bluetooth PAIRED change:", oldPairedString, ">", pairedString);
            if (pairedString === "") {
                mod.newDeviceStatus("NoPair");      // no await required, render NO paired
            }
            else {
               mod.newDeviceStatus("PairChanged"); //no await required, render NEW paired
            };
            oldPairedString = pairedString;
        };
    }, interval);
};
/**Stop to detect events for Start Page streaming state frame.
 * It will be stopped when there is no Start Page open (e.g. connected via socket.io).
 * @return {boolean}      true
 */
function stopBluetoothdDetect() {
    //console.log(aux.timeStamp(), 'lan: stopped watcher/detector for LAN status [X]');
    clearInterval(bluetoothDeviceWatcher);        //                                stop [d]
    return true;
};

//.......................................................................start all timers
//Start to monitor... then watch and detect...                       ------[STARTER]-----
/**Start all detectors.
 * @return {boolean}   true
 */
function startWatching() {
    detectStreamingStatus();
    detectBluetoothDevices();
    detectWifiStatus();
    detectWiredStatus();
    return true;
};

//........................................................................stop all timers
//Stop all monitoring.                                                ------[STOPPER]-----
/**Stop and clear timers.
 * @return {boolean}   true
 */
function stopWatching() {
    stopWiredDetect();
    stopWifiDetect();
    stopBluetoothdDetect();
    stopStreamDetect();
    return true;
};