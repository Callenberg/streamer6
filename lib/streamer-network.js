//Copyright 2026 by CAllenberg at Github all rights reserved.
////GNU General Public License v3.0 see license.txt            [Source code]
//                        ~ general network handler for backend ~
//NOTE: this file cannot be minimized. NOT BE MINIMIZED!!

const fs = require('fs');                           //for reading files
/*
//--------------------------------------------------debugging to files in /streamer/data
//var LogStream = '/streamer/data/ctlstdout.log';
var LogStream = '/dev/null';
const { Console } = require('console');

const output = fs.createWriteStream(LogStream);
const errorOutput = fs.createWriteStream('/dev/null');

const console = new Console({ stdout: output, stderr: errorOutput });

//------------------------------------------------------------------------------------
*/
const aux = require('./streamer-auxiliary.js');    //all the utils
const mod = require('/streamer/streamer-model.js');         //model of machine
const view = require('/streamer/streamer-view.js');         //view of machine
//const hot = require('./machine-hotspot.js');      //handle wi-fi hotspot (ap)
const exec = require('child_process').exec;         //for Raspian cmds
const execSync = require('child_process').execSync; //for synced Raspbian cmds


//At boot.......................................................................................
module.exports.prepareBluetooth = prepareBluetooth;
module.exports.prepareWireless = prepareWireless;
//Bluetooth service
module.exports.turnOnBluetooth = turnOnBluetooth;
module.exports.turnOffBluetooth = turnOffBluetooth;
module.exports.showBluetooth = showBluetooth
module.exports.hideBluetooth = hideBluetooth;
//Bluetooth speakers...........................................................................
//module.exports.scanforSpeakers = scanforSpeakers;
//module.exports.btConnectCtl = btConnectCtl;
//module.exports.trustSpeaker = trustSpeaker;
module.exports.removeDevice = removeDevice;
//module.exports.enableAsoundConf = enableAsoundConf;
//module.exports.btDisconnectCtl = btDisconnectCtl;
//module.exports.disableAsoundConf = disableAsoundConf;
//module.exports.isFile = isFile;
module.exports.btDisconnectSource = btDisconnectSource
//Wireless....................................................................................
module.exports.accesspointUp = accesspointUp;
module.exports.accesspointDown = accesspointDown;
//module.exports.wifiDisconnect = wifiDisconnect;
//module.exports.scanForWiFi = scanForWiFi;
//module.exports.connectWifi = connectWifi;

//Boot ===================================================================================
//..........................................................................Bluetooth boot
/**Boot preparations for Bluetooth, called by streamer-control.
 * If Bluetooth is on: 
 * a) if there is no speaker connected - turn Bluetooth off.
 * All other Bluetooth devices will then be disconnected, sources likes phones. 
 * Then turn the bluetooth system on again.
 * b) If there is a speaker connected - disconnect only the connetcted source, phones.
 * Paired devices (sink and source) and trusted devices (only sink)
 * are not effected. 
 * @param {integer}  wait, pause time in ms, default 200
 * @return {boolean}  true, of no interest
 */
async function prepareBluetooth(wait = 50) {
    if (await mod.bluetoothStatus() === "yes") {
        turnOffBluetooth();
        //then wait
        aux.sleep(wait).then(() => {
            turnOnBluetooth();
            showBluetooth();
            console.log(aux.timeStamp(), "nwork: Bluetooth UP - no connected devices...");
        });
    };
    return true; 
};

//...........................................................................Wireless boot
/**Boot preparations for wireless, called by streamer-control.
 * a) Do basic testing of wireless. Radio should always be on. If radio is off then wlan0
 *    and wlan1 and bluetooth is hard blocked. Which means that rfkill cannot unblock!
 *    'nmcli radio wifi', not only 'nmcli radio' neither use 'nmcli radio all'
 * b) If the Streamer is connected to a Wi-Fi LAN then disconnect the AP (hotspot).
 * d) The AP comes up if wireless was down.
 * Fixed nmcli connections are used:    'BELL462'   'Hotspot'
 * @param {integer}   wait, delay in ms
 * @return {boolean}  true, of no interest
 */
async function prepareWireless(wait = 50) {
    let wifiRadioOn = "disabled";
    let wifi = "BELL462";
    let ap = "Hotspot"
    try {
    // Basic tests of wireless capabilities:
        wifiRadioOn =
            execSync(`sudo nmcli radio wifi  | tr -d '\n' `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
    // a) check if radio is on for wireless services, wlan0 (= AP) and wlan1 (= Wi-Fi)
        if (wifiRadioOn == "disabled") {
            try {
                //It is disabled, which is a surprise -> turn on radio!
                execSync(`sudo nmcli radio wifi on  | tr -d '\n'  `,
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
                // here "" is returned if radio was enabled...  no action
            }
            catch (err) {
                console.log("nwork: ERROR cannot enables Wi-Fi radio", err);
                return false;
            };
        };
    }
    catch (err) {
        console.log("nwork: ERROR cannot read 'nmcli radio wifi'", err);
        return false;
    };
    //Check status of Wi-Fi on wlan1:
    let wifiStatusArray = await mod.wirelessStatus();
    //wifi status is: [SSID, IP-address] or []
    //console.log("network: what is status of wifi?, might be [];\n", wifiStatusArray);
    if (wifiStatusArray.length > 0) {
        // b) Streamer is connected to a Wi-Fi network
        accesspointUp(ap);
        console.log(aux.timeStamp(), "nwork: wifi was UP:-", wifi);
    }
    else {
        // c) Streamer not connected to any Wi-Fi network, try  -> be sure to bring wifi
        try {
            execSync(`sudo nmcli connection up ${wifi} `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
            return true;
        }
        catch (err) {
            console.log("nwork: cannot turn on Wi-Fi:", err);
            return false;
        };
        accesspointUp(ap);
        console.log(aux.timeStamp(), "nwork:Wireless was DOWN... it goes UP[!]", wifi);
    };
    aux.sleep(wait).then(() => {
    });
    return true;
};

//Bluetooth Commands =====================================================================
//...........................................................................Bluetooth CMD
/**Turn off the Bluetooth system using rfkill
 * Bluetooth Hci0 is software blocked - turned off.
 * This will disconnect any connected devices. 
 * Paired devices (sinks and sources) and trusted 
 * devices (only sinks) are not removed.
 * @return {boolean}  true or false, of no interest
 */
async function turnOffBluetooth() {
    try {
        execSync(`sudo rfkill block bluetooth`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        return true;
    }
    catch (err) {
        console.log("bluetoothctl: cannot block bluetooth");
        return false;
    };
};
/**Turn on the Bluetooth system
 * Bluetooth Hci0 is turned on.
 * @return {boolean}  true, of no interest
 */
async function turnOnBluetooth() {
    try {
        execSync(`sudo rfkill unblock bluetooth`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        return true;
    }
    catch (err) {
        console.log("bluetoothctl: cannot unblock bluetooth");
        return false;
    };
};
/**Advertise Streamer Bluetooth capability
 * Bluetoothctl is turned on and Bluetooth is visible again.
 * @return {boolean}  true, of no interest
 */
async function showBluetooth() {
    try {
        execSync(`sudo bluetoothctl power on `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
    }
    catch (err) {
        //console.log("bluetoothctl: cannot turn on power for bluetoothctl", err);
    };
    try {
        execSync(`sudo bluetoothctl pairable on && sudo bluetoothctl discoverable on `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
    }
    catch (err) {
        //console.log("bluetoothctl: cannot make bluetooth visible - no pairing possible", err);
    };
    return true;
};
/**Hide Streamer's Bluetooth
 * Bluetoothctl is turned off and Bluetooth is not visble
 * @return {boolean}  true, of no interest
 */
async function hideBluetooth() {
    try {
        execSync(`sudo bluetoothctl power off`,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
    }
    catch (err) {
        console.log("bluetoothctl: cannot turn off power for bluetoothctl");
    };
    try {
        execSync(`sudo bluetoothctl pairable off && sudo bluetoothctl discoverable off `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
    }
    catch (err) {
        console.log("bluetoothctl: cannot stop bluetooth pairing - still visible");
    };
    return true;
};

//________________________________________________________________________________________
//REMOVE operations for any Bluetooth Devices ________________________for both sink/source
/**Untrusts, disconnects, unpairs and removes a Bluetooth device from bluetoothctl
 * Only for already disconnected phones or at restart.
 *  CLI: bluetoothctl remove BD-address
 * @param  {string}    bdAddr, BD-address
 * @return {boolean}   true/false - hopefully it got removed
 */
function removeDevice(bdAddr) {
    //console.log(aux.timeStamp(), "nwork: incoming:", bdAddr);
    let outcome = false;
    try {
        outcome = execSync(`sudo bluetoothctl remove ${bdAddr} `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
        //console.log(aux.timeStamp(), "nwork: remove:", bdAddr, "message:", outcome);
    }
    catch (err) {
        console.log(aux.timeStamp(), "nwork: bluetoothctl cannot remove:", bdAddr, "\n", err);
    };
    return outcome;
};

/** Disconnect a source device, it will still be paired.
 * @param  {string} deviceBD, BD address to be disconnected
 * @return {false}            always true, but not of any interest at all...
 */
function btDisconnectSource(deviceBD) {
    try { 
        execSync(`sudo bluetoothctl disconnect ${deviceBD} `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 65000 });
    }
    catch (err) {
        console.log(aux.timeStamp(), "nwork: FATAL ERROR in disconnect of SOURCE \n", err);
    };
    return true;
};

//Wireless Commands ======================================================================
//............................................................................Wireless CMD
/**Turn OFF the Access Point (Hotspot)
 * * The connection profile is 'Hotspot' and can be found in
 * the directory: /etc/NetworkManager/system-connections
 * NOTE: The access point is supposed to be up all the time in this version.
 * @return {boolean}  true or false, of no interest
 */
async function accesspointDown(ap = "Hotspot") {
    try {
        execSync(`sudo nmcli connection down ${ap} `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
            return true;
    }
    catch (err) {
        //console.log("hotspot: cannot turn off Hotspot");
        return false;
    };
};
/**Turn on the Access Point (Hotspot)
 * The AP can coexist with the connected Wi-Fi connection. 
 * The connection profile is 'Hotspot' and can be found in
 * the directory: /etc/NetworkManager/system-connections
 * @param  {string}    ap, nmcli hotspot connection
 * @return {boolean}  true or false, of no interest
 */
async function accesspointUp(ap = "Hotspot") {
    apStatus = mod.accesspointStatus(ap);
    //Access Point status is:  "up"" or "down"
    //Also do:  rfkill unblock bluetooth

    if (apStatus === "down") {
        //hard and soft unblock by rfkill
        try {
            execSync(`sudo rfkill unblock bluetooth `,
                { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
            console.log("hotspot: access point was DOWN, is now up[!] ", ap);
            return true;
        }
        catch (err) {
            console.log("hotspot: cannot turn off Hotspot", err);
            return false;
        };
        //Bring the AP up
        try {
        execSync(`sudo nmcli connection up ${ap} `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 10000 });
        console.log("hotspot: access point was DOWN, is now up[!] ", ap);
            return true;
    }
    catch (err) {
        console.log("hotspot: cannot turn off Hotspot", err);
        return false;
        };
        
    }
    else {
        console.log(aux.timeStamp(), "nwork: access point was up:-", ap);
        return true
    };
 };