//Copyright 2026 by Callenberg on Github
//GNU General Public License v3.0 or later see license.txt            [Source code]
//        ~ backend control of Network Music Streamer ~
/*
//--------------------------------------------------debugging to files in /streamer/data
//var LogStream = '/streamer/data/ctlstdout.log';
var LogStream = '/dev/null';

const fs = require('fs');
const { Console } = require('console');

const output = fs.createWriteStream(LogStream);
const errorOutput = fs.createWriteStream('/dev/null');

const console = new Console({ stdout: output, stderr: errorOutput });
//------------------------------------------------------------------------------------
*/
const aux = require('/streamer/lib/streamer-auxiliary.js'); //auxiliary functions
const mod = require('./streamer-model.js');                //model of streamer
//BOOT sequence starts ======================================================= bootctl
console.log("\n");
console.log("\nStreamer is now booting:  . . . . . . . . . . . . . . . . . . . . .");
const RAD_SYSTEM_VERSION = mod.getVersion();//official version
console.log("Version:", RAD_SYSTEM_VERSION);
console.log("Copyright 2026 by Callenberg on Github,  license GPL 3.0 or later");
console.log(aux.timeStamp(), "====================================================");
//Required modules . . .
const exec = require('child_process').exec;         //for OS CLI cmds
const execSync = require('child_process').execSync; //for synced OS CLI cmds
const detect = require('./lib/streamer-detect.js'); //detect loops

const view = require('/streamer/streamer-view.js');  //view of streamer
const nwork = require('./lib/streamer-network.js');  //network & bluetooth mngt
const alsa = require('./lib/streamer-alsa.js');      //sound mngt
const spot = require('./lib/streamer-spotify.js');   //spotify - librespot

module.exports.untrustDevice = untrustDevice;
module.exports.disconnectBtDevice = disconnectBtDevice;
module.exports.connectNetwork = connectNetwork;
module.exports.disconnectNetwork = disconnectNetwork;
module.exports.restartAllStreaming = restartAllStreaming;   //NOT IN USE
module.exports.userStopStreaming = userStopStreaming;       //NOT IN USE

//[C] Control - Immediately-Invoked Function Expression (IIFE) for boot sequence
(() => {
    
    //start boot commands
    console.log(aux.timeStamp(), "Boot Phase:         call for boot to commence...");
    bootPhaseOne();
})()

/**Boot function calls starts...
 * with starting and resetting time critical subsystems of streamer
 * @param               wait, delay before next phase
 * @return {?}    of no interest
 */
async function bootPhaseOne(wait = 50) {
    console.log(aux.timeStamp(), "________________________________________________");
    console.log(aux.timeStamp(), "Boot Phase: time critical------------[1] started");
    await aux.remountSSD(true);         //true writes a message, be sure the SSD is r/w
    await view.bootWebServer();         //start web server and io.socket
    await alsa.soundBootPreparation();  //reset volume and unmutes amplifier
    //...wait
    aux.sleep(wait).then(() => {               
        bootPhaseTwo();
    });             
};
/**Boot continues with starting:
 *  reset less time critical subsystems of streamer
 * @param {integer}     wait, delay before next time,needs to be in the 100s
 * @return {?}    of no interest
 */
async function bootPhaseTwo(wait = 100) {
    console.log(aux.timeStamp(), "________________________________________________");
    console.log(aux.timeStamp(), "Boot Phase: resets-------------------[2] started");
    spot.stopSpotifyService();
    stopBluealsaService();
    nwork.prepareBluetooth();  //disconnects all Bluetooth devices
    nwork.prepareWireless();   //AP or Wi-Fi connections are set
    //...wait
    aux.sleep(wait).then(() => {               
        bootPhaseThree();
    });
};
/**Boot continues with:  
 *  start stream and detect subsystems for start page
 * @param {integer}     wait, delay in ms
 * @return {?}          of no interest
 */
async function bootPhaseThree(wait = 50) {
    console.log(aux.timeStamp(), "________________________________________________");
    console.log(aux.timeStamp(), "Boot Phase: watcher------------------[3] started");
    let lanIP = await mod.wiredStatus();
    let wifi = await mod.wirelessStatus();
    console.log(aux.timeStamp(), "IP address Wi-Fi? ", wifi[1]);
    console.log(aux.timeStamp(), "IP address LAN?   ", lanIP);
    //console.log(aux.timeStamp(), "Boot Phase: NO start of start page watcher   [!]");
    //console.log(aux.timeStamp(), "ctl: start page watcher is active ~~~");
    watchModel();
    //...wait
    aux.sleep(wait).then(() => {  
        
        bootPhaseFour();
    });
};
/**Boot ends with:  
 * start services and play a start sound
 * @param {integer}     wait, delay in ms
 * @return {boolean}    of no interest
 */
async function bootPhaseFour() {
    console.log(aux.timeStamp(), "________________________________________________");
    console.log(aux.timeStamp(), "Boot Phase: last part----------------[4] started");
    spot.startSpotifyService();
    startBluealsaService();
    console.log(aux.timeStamp(), "Boot Phase: all streaming service started...");
    await alsa.startupSound(100); //play start sound at lower volume
    //console.log(aux.timeStamp(), "Boot Phase: NO alsa.startupSound()           [!]");
    console.log(aux.timeStamp(), "===============================================|");
    console.log(aux.timeStamp(), "Streamer Boot Completed in:");
    console.log(execSync(`sudo systemd-analyze time`,
        { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 }));
    console.log("Boot residue  . . . . . . . . . . . . . . . . . . . . . . . . . |")
    if (await mod.areOpenPages() === true) {
        view.renderAllPages()
    };
};
//BOOT ends =================================================================================== boot ends
//=======================================================================================================

//[C] control - =========================================================================================
//..........................................................................[start watching model states]
/** Start/stop Watch - Detect          [Watch - Detect - Identify Change - Act on Change - Render states]
 * Start the monitoring of states that are rendered dynamically on start page. The monitoring is going
 * on when at least one start page is open.
 * It detects almost immediately if a start pages opens. If the start page is explicitely closed that is
 * also detected pretty much immediately, but open a Model or About page (and thereby close the start page) 
 * will not be detected at once - it will take 20 to 45 seconds. That behaviour is not really a problem
 * here. The important thing is that the monitor actually stops watching.
 * @param  {integer}   interval for timer in ms, default 1000 (1 sec.)
 * @return {boolean}   true,
 */
async function watchModel(interval = 1000) {
    let pageStatus = await mod.isOpenStartPage(); //boolean: false or true
    let oldPageStatus = pageStatus;
    console.log(aux.timeStamp(), "Ctl: Start Page watcher activated [H]  ");
    monitorTimer = setInterval(async function () {
        pageStatus = await mod.isOpenStartPage();
        //if ((pageStatus == false) && (oldPageStatus == false)) {
        if ((!pageStatus ) && (!oldPageStatus)) {
            //1) no start page is currently open - do nothing
        }
        else if
            ((pageStatus === true) && (oldPageStatus === true)) {
            //2) At least one start page is still open - do nothing           
        }
        else if
            ((pageStatus === true) && (!oldPageStatus)) {
            //3) A start page has opened - START watching
            console.log(aux.timeStamp(), "Ctl: Start Page detected OPEN     [H] +++++++++++++");
                detect.startWatching();
        }
        else if 
            ((!pageStatus) && (oldPageStatus === true)) {
            //4) No more open start pages - STOP watching
            console.log(aux.timeStamp(), "Ctl: Start Pages are all CLOSED   [H] :::::::::::::");
                detect.stopWatching();
        }
        oldPageStatus = pageStatus;
    }, interval);
};
//------------------------------------------------------------------------------------------User Requests
//_______________________________________________________________________________________________________

//..............................................................................[untrust Bluetooth device]
/** Remove a Bluetooth device (only source in this version) by user. It is already disconnected, 
 * but paired. The device is removed, otherwise it stays paired and might reconnect. 
 * @param  {string}    data, an object with BD address and type of Bluetooth device
 * @return {boolean}   true, always
 */
async function untrustDevice(data) {
    let bdaddr = data.bdAddr;
    await nwork.removeDevice(bdaddr);
    view.pairedDevicesUpdate();
    return true;
};
//............................................................................[Disconnect a source device]
//--------------------------------------------------------------------------------------------------------
/** Disconnect Bluetooth source devices (often a phone) by user command.
 * The device is still paired after this. Update both source frames.
 * @param  {string}    data, an object with the BD address
 * @return {boolean}   true, always
 */
async function disconnectBtDevice(data) {
    let bdaddr = data.bdAddr;
    await nwork.btDisconnectSource(bdaddr);
    view.connectedDevicesUpdate();
    view.pairedDevicesUpdate();
    return true;
};
//_______________________________________________________________________________________________________
//Network services and connections management......................................... [Network Services]
//===========================================it is assumed that Network Page is open=====================

/**Start Bluetooth service only [DEPRECATED: or start Hotspot depending on the incoming] 
 * user request from front end.
 * Streamer-View.js will rerender using view.networkUpdate(networkType)
 * @param     {data}          data, { network: <network type> }
 * @return    {?}             of no interest
 * */
function connectNetwork(data) {
    switch (data.network) {
        //Bluetooth - turns on the bluetooth network service
        case "bluetooth":
            console.log(aux.timeStamp(), "ctl: request to START Bluetooth service...");
            nwork.turnOnBluetooth();
            break;
        default:
            //What is going on?... abnormal
            aux.sleep(2000).then(() => { //hold it for 2 secs...
                view.bluetoothUpdate();
                view.wiredUpdate();
                return false;
            });
    };
};
/**Disconnector - Disable Bluetooth service only! [DEPRECATED:or disconnect Wi-Fi or stop Hotspot] 
 * depending on the incoming user command from front end. Can only be Bluetooth in this version.
 * Streamer-View.js will rerender using view.networkUpdate(networkType)
 * @param     {data}          data, { network: <network type> }
 * @return    {?}             of no interest
 * */
async function disconnectNetwork(data) {
    console.log(aux.timeStamp(), "Ctl: request to STOP network service =", data.network);
    switch (data.network) {
        //Bluetooth off - turns off the bluetooth network service
        case "bluetooth":
            //console.log(aux.timeStamp(), "ctl: request to STOP Bluetooth service...");
            await nwork.turnOffBluetooth();
            break;
        default:
            //What is going on?... abnormal
            aux.sleep(2000).then(() => { //hold it for 2 secs...
                view.bluetoothUpdate();
                view.wiredUpdate();
                return false;
            });
    };
};

//DEPRECATED __________________________________________________________________________________DEPRECATED
/** Wi-Fi - scan for reachable wifi networks.
 * Return the list as an array to the frontend WiFi page on the format:
 * [ ssid ssid ...]
 * @return{boolean}      true  ....of no interest
 
async function wirelessScan() {
    console.log(aux.timeStamp(), "ctl: wi-fi scan will start now");
    let wifiArray = await nwork.scanForWiFi();
    console.log(aux.timeStamp(), "ctl: wi-fi scan yielded this array:\n", wifiArray);
    //the assumption is that Network Page is open
    view.renderScannedSSIDs(wifiArray);
    return true;
};
/** Wi-Fi - connects to Wi-Fi, given the ssid and the password
 * If the connect is successful all the streaming services are restarted. If there
 * is streaming going on there is a need to write idle:stop to the streamsensor.log
 * [ ssid ssid ...]
 * @param  {object}        data, {ssid: <ssid>, password: <password> }
 * @return {boolean}       false or true  ...depending of the outcome
 
async function connectWireless(data) {
    console.log(aux.timeStamp(), "ctl:user choose this ssid:", data.ssid);
    let isConnected = await nwork.connectWifi(data.ssid, data.password);
    //the assumption is that Network Page is open
    view.wirelessUpdate();
    if (false) {
    //if (isConnected == true) {    //this did not help to reconnect
        let isStreaming = await detect.whatIsStreaming();
        //console.log(aux.timeStamp(), "ctl:write to streamsensor.log???...", isStreaming);
        (isStreaming !== false) &&  await detect.stopStreamsensor(isStreaming); //write idle to streamsensor.log
        restartAllStreaming();                            //restart services and hope they could be found by Wi-Fi too
    };
    return isConnected;
};*/
//Candidates to be deprecated - keep it for now.                                            NOT IN USE
//_______________________________________________________________________________________________________
//Restart Streamer........................................................................ [soft restart]
//===========================================it is assumed that Start Page is open=======================
/**Restart Streamer, a soft restart - not reboot.
 * Stop streaming services and reset them. Disconnect Bluetooth devices, if Bluetooth is on.
 * Restart all critical timers.
 * Return to the state with amplifier unmuted, no bluetooth devices and
 * state is idle. However, any Wi-Fi and LAN connnctions are kept (nmcli is not used).
 * @return {boolean}      true
                                                             //NOT IN USE --- NEEDS A REWRITE!
async function restartStreamer(wait = 1500) {
    let isBluetooth = await mod.bluetoothStatus();
    view.renderMessage({ page: "start", type: "info", missive: "Restarting Streamer system..." });
    await detect.stopPagesDetect();
    await detect.stopStreamDetect();
    await detect.stopStreamsensor();
    view.renderMessage({ page: "start", type: "info", missive: "Audio streaming is reset." });
    spot.stopSpotifyService();
    //air.stopAirplayService();
    stopBluealsaService();
    if (true) {    //All devices disconnect always, before: (isBluetooth === "yes")    
        //remove all bluetooth devices
        //let theSpeaker = await mod.theConnectedBluetoothSink();                 //"<bd-aStopped audio streamingddr>" or ""
        let theSpeaker = "";
        let connectedArray = await mod.connectedBluetoothSourcesNames();        //[{bdAddr: "<bd-addr>", name: "<name>""}, ...] or []
        //let trustedArray = await mod.trustedOnlyBluetoothSpeakers();            //[{bdAddr: "<bd-addr>", name: "<name>""}, ...] or []
        let trustedArray = [] 
        let pairedArray = await mod.pairedOnlyBluetoothSources();               //[{bdAddr: "<bd-addr>", name: "<name>""}, ...] or []
        isBluetooth.indexOf("no") > -1 && await nwork.turnOnBluetooth();
    //wait for bluetooth which has to be on in order to remove
        aux.sleep(wait * 0.5).then(async function () {
            if (theSpeaker.length > 1) {
                await nwork.removeDevice(theSpeaker);
            };
            removeAllDevices(connectedArray);
            removeAllDevices(trustedArray);
            removeAllDevices(pairedArray);
            view.renderMessage({ page: "start", type: "info", missive: "Resetting Bluetooth. Any Bluetooth devices are disconnected" });
            //now Bluetooth has to be turned off - bluetooth is always on here - turn it off
            nwork.turnOffBluetooth();
            //await disableAsoundConf();
        });
    };  
    //...wait
    aux.sleep(wait * 2).then(async function () {
        await detect.beginPagesDetect();
        await detect.beginStreamDetect();
        (isBluetooth.indexOf("yes") > -1) && nwork.turnOnBluetooth();
        restartAllStreaming();
        aux.sleep(wait).then(() => {
            //render pages
            view.renderAllPages();
            aux.sleep(wait * 0.25).then(() => {
                view.renderMessage({ page: "start", type: "done", missive: "Streamer system restarted!" });
            });
        });
    });     
};*/
/**Helper to restart Streamer - removes all bluetooth devices from bluetoothctl register.           NOT IN USE
 * All the devices will be disconnected, untrusted and unpaired.
 * Could be moved to streamer-network.js
 * @param   {array}       array, an array of objects [{bdAddr: "<bd-addr>", name: "<name>""}, ...] or []
 * @return {boolean}      true
 */
async function removeAllDevices(array) {
    for (let i = 0, arrayLength = array.length; i < arrayLength; ++i) {
        await nwork.removeDevice(array[i].bdAddr)
    };
    return true;
};


//[C] control - streaming service management========================================== 
//------------------------------------------------------------------Streaming Services  

//Restart of of all streaming services......................................... [restart of all streaming]
/**Restart all streaming services. Required when a Bluetooth speaker is connected or disconnected.
 * The systemctl 'restart' command is a two-step operation: it first stops each service and 
 * then immediately starts it again. This is a must since configuration changes are made,
 * and a complete reinitialization is needed for alsa changes (asound.conf in this case). 
 * No more need to restart the bt detetect loop - file descriptor loop with timer: [2]
 * @return {boolean}      true
 */
function restartAllStreaming() {            //NOT IN USE ANYMORE
    spot.restartSpotify();
    restartBluealsaAplay();
   console.log(aux.timeStamp(), "ctl:  streaming services restarted ::::::::::");
    return true;
};

//When a user stops a streaming service - restart the service..................... [user stops a services]
/** Stop spotify streaming is pretty straight forward but bluetooth audio stream has to
 * be stopped in i more brutal way by turning bluetooth off/on.
 * @param {string} streamingStarted, the service that the user stopped
 * @return {?}     of no interest
 */
async function userStopStreaming(streamingStopped) {            //NOT IN USE ANYMORE
    console.log(aux.timeStamp(), "ctl: user STOPPED =", streamingStopped, "[!]")
    switch (streamingStopped) {
        case "spotify":
            spot.stopSpotifyService();
            await aux.sleep(150).then(() => {
                spot.restartSpotify();         //must start spotify service again
            });
            break;
        case "bluetooth":
             await nwork.turnOffBluetooth();    //have to really turn off the bluetooth service
             await aux.sleep(500).then(() => {
                 nwork.turnOnBluetooth();       //must turn on the bluetooth service again
             });
            break;
        default://this should not happen...
            //stopAllStreaming();       //is an option here
            return false
    };
};

//========================================================================================================
//Bluealsa-aplay function - should be in a file of its own----------------------------------Bluealsa-aplay
//========================================================================================================
//THIS IS PROBABLY ALL OBSOLETE NOW - delete code.
//Restart of bluealsa-aplay.service.................................. [required restart of bluealsa-aplay]
/**Restart the bluealsa aplay service, the function that plays bluetooth streams.
 * No more need to restart the bt detetect loop - file descriptor loop with timer: [2]
 * This is used when there has been a connect/disconnect of a Bluetooth speaker. HAS TO BE DEPRECATED
 * @return {boolean}      true
 */
function restartBluealsaAplay() {
    try {
        execSync(`sudo systemctl restart bluealsa-aplay.service `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 65000 });
       
    }
    catch (err) {
        console.log(aux.timeStamp(), "ctl: ERROR, restart aplay.service failed!\n", err);
    };
    return true;
};
//Start of bluealsa-aplay.service............................................. [start bluealsa-aplay again]
/**Start the bluealsa aplay service, the function that plays bluetooth streams.
 * This is used when another service has stopped streaming.
 * Also checks if blue-alsa is really up and running, if not try again...
 * @return {boolean}      true
 */
async function startBluealsaService() {
    try {
        execSync(`sudo systemctl start bluealsa-aplay.service `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 65000 });
        //console.log(aux.timeStamp(), "ctl: start of bluealsa-aplay service was required -> ->");
    }
    catch (err) {
        console.log(aux.timeStamp(), "ctl: ERROR, restart aplay.service failed!\n", err);
    };
    let pid = await mod.readServicePid("bluealsa-aplay");
    if (pid !== "") {
        //Good to go; bluealsa-aplay is up - no action here
        //console.log(aux.timeStamp(),"ctl: system service started for bluealsa ----- #", pid);
        return true;
    }
    else {
        //bluealsa-aplay is not running, try again, no sync this time.
        await aux.sleep(1000).then(() => {
            try {
                exec('sudo systemctl restart bluealsa-aplay.service',
                    { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000 });
                return true;
            }
            catch (err) {
                consolelog(aux.timeStamp(),"air: ERROR couldn't start bluealsa-aplay\n", err);
                return false;
            };
        });
    };
    return true;
};
//Stop bluealsa-aplay.service....................................................... [stop bluealsa-aplay]
/**Stop the bluealsa aplay service, the function that plays bluetooth streams.
 * This is used when another service has stopped streaming.
 * @return {boolean}      true
 */
function stopBluealsaService() {
    try {
        execSync(`sudo systemctl stop bluealsa-aplay.service `,
            { uid: 1000, gid: 1000, encoding: 'utf8', timeout: 65000 });
        //console.log(aux.timeStamp(), "ctl: stop of bluealsa-aplay service was required -> ->");
    }
    catch (err) {
        console.log(aux.timeStamp(), "ctl: ERROR, restart aplay.service failed!\n", err);
    };
    return true;
};
