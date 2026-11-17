//Copyright 2026 by Callenberg on Github
//GNU General Public License v3.0 see license.txt            [Source code]
//                      ~ view of Streamer ~

const fs = require('fs');
//--------------------------------------------------debugging to files in /streamer/data
/*
//var LogStream = '/streamer/data/ctlstdout.log';
var LogStream = '/dev/null';
const { Console } = require('console');

const output = fs.createWriteStream(LogStream);
const errorOutput = fs.createWriteStream('/dev/null');

const console = new Console({ stdout: output, stderr: errorOutput });

//------------------------------------------------------------------------------------
*/
const aux =   require('/streamer/lib/streamer-auxiliary.js'); //auxiliary functions
const mod =   require('/streamer/streamer-model.js');
const detect =  require('/streamer/lib/streamer-detect.js');
const ctl =   require('/streamer/streamer-control.js');
const nwork = require('/streamer/lib/streamer-network.js');
const route = require('/streamer/streamer-routing.js');

//------------------------------------------boot:
module.exports.bootWebServer = bootWebServer;
//-----------------------------------------pages:
module.exports.renderAllPages = renderAllPages;
module.exports.renderStartPage = renderStartPage;
//module.exports.renderScannedSSIDs = renderScannedSSIDs;
//module.exports.renderBluetoothPage = renderBluetoothPage;
//module.exports.renderScannedSpeakers = renderScannedSpeakers;
//module.exports.renderMessage = renderMessage;
//-----------------------------------------frames:
module.exports.streamingUpdate = streamingUpdate;
//module.exports.volumeUpdate = volumeUpdate;
module.exports.bluetoothUpdate = bluetoothUpdate;
//module.exports.bluetoothSpeakerUpdate = bluetoothSpeakerUpdate;
module.exports.wirelessUpdate = wirelessUpdate;
//module.exports.accesspointUpdate = accesspointUpdate;
module.exports.wiredUpdate = wiredUpdate;
//module.exports.internetUpdate = internetUpdate;
//module.exports.trustedSpeakersUpdate = trustedSpeakersUpdate;
module.exports.connectedDevicesUpdate = connectedDevicesUpdate;
module.exports.pairedDevicesUpdate = pairedDevicesUpdate;
//--------------------------------------protocols:
module.exports.setupFrontEndProtocol = setupFrontEndProtocol;


//[V] VIEW definition ===================================== packers for frontend
//Packing frame data for frontend render functions------------------------------
//The frontend is a state-based UI - states defines the rendering. Each frame
//functions that creates data frames based on the state of Streamer.
//  [H]. Start page       -- parsed in streamer.js
//  [A]. About page       -- parsed in streamerabout.js              
//  [M]. Model page       -- parsed in streamermodel.js             

//  [B]. Bluetooth page   -- parsed in streamerbluetooth.js     DEPRECATED
//  [N]. Network pages    -- parsed in streamernetwork.js       DEPRECATED
//  [R]. Reset            -- parsed in playersettings.js        DEPRECATED

//Global variables
var io;               //holder for socket.io server object, set in bootWebServer()
var blockUI = false;  //during connections the UI needs to be blocked

//Export the the socket.io server object as an global variable
module.exports.io = io;


//BOOT =============================================================================================
//Start web server and sockets........................................................... boot phase

/**Boot. Start the Express webserver and io.sockets for front- and backend 
 * communications with io.on (recieve) and io.emit (send).
 * Define the web pages to be shown.
 * @param {integer}   wait, pause time in ms, default 200
 * @global {io}       socket.io server object
 * @return {boolean}  of no interest
 */
async function bootWebServer(wait = 200) {
    let pages = [
        '/pages/streamer.html',
        '/pages/streamerabout.html',
        '/pages/streamermodel.html'
    ];
    let ioObject = await route.startWebServer(pages);
    io = ioObject;                            //set GV 'io' to socket.io server object
    mod.getIo(ioObject);
    aux.sleep(wait).then(() => {
        console.log(aux.timeStamp(), "view: Webserver and io.socket up...");
        setupFrontEndProtocol(ioObject);     //start listening on 'io'
    });
    return true;
};
//PAGES================================================================================== Page Level

/**Organize events from the frontend through socket.io --- socket
 * Here the event handling is divided into two parts:
 *  P1. Incoming request when web page opens or asks for updates
 *  P2. User issued commands on web pages
 * Reference: https://socket.io/docs/v4/emit-cheatsheet/
 * @param     {object}         ioServer, socket.io object, also GV 'io',
 *                             Note: 'socket' is a connected web page 
 * @listener  {socket.io}     'connection'
 * @return    {boolean}        of no interest
 */
function setupFrontEndProtocol(ioServer) {
    ioServer.on('connection', function (socket) {
        //P1. Protocol for page requests (e.g page open,...)
        incomingPageRequests(socket);
        //P2. Protocol for user commands (e.g. turn on Bluetooth,..)
        incomingUserRequests(socket);
    });
    return true;
};

/**Boot. Renders all web pages, used at boot and at restarts.
 * Render any previously open pages, also done automatically by socket.io
 * @return {boolean} always true
 */
function renderAllPages() {                         
    if (mod.areOpenPages() === true) {
        console.log(aux.timeStamp(), "_________________________________________");
        console.log(aux.timeStamp(), "view: render all pages... [H] [A] [M]    ");
        console.log(aux.timeStamp(), "=========================================");
        renderStartPage();
        renderAboutPage();
        renderModelPage();
    }
    else {
        console.log(aux.timeStamp(), "_________________________________________");
        console.log(aux.timeStamp(), "view: no open pages - no rendering    ");
        console.log(aux.timeStamp(), "=========================================");
    };
    return true;
};
/**Renders start page
 * Render all frames. 
 * @return {boolean} always true
 */
function renderStartPage() {
    console.log(aux.timeStamp(), "_________________________________________");
    console.log(aux.timeStamp(), "view: render start page...            [H]");
    streamingUpdate();
    wirelessUpdate();
    wiredUpdate();
    bluetoothUpdate();
    connectedDevicesUpdate();
    pairedDevicesUpdate();
   console.log(aux.timeStamp(), "------------------------------------------");
    return true;
};

/**Renders about page
 * Render all frames.
 * @return {boolean} always true
 */
function renderAboutPage() {
    console.log(aux.timeStamp(), "_________________________________________");
    console.log(aux.timeStamp(), "view: render about Streamer           [A]");
    timeVersionsLicenseUpdate();
    //internetUpdate();
    diskMemoryUpdate();
    ramMemoryUpdate();
    nowStreamingUpdate();
    amplifierUpdate();
    signalUpdate();
    internetUpdate();
    hardwareUpdate();
    console.log(aux.timeStamp(), "--------------------------------------[A]");
    return true;
};
/**Renders model page
 * Render all frames.
 * @return {boolean} always true
 */
function renderModelPage() {
    console.log(aux.timeStamp(), "_________________________________________");
    console.log(aux.timeStamp(), "view: render  Streamer  Model         [M]");
    timeVersionsLicenseUpdate();
    streamingUpdate();
    volumeUpdate();
    bluetoothUpdate();
    wirelessUpdate();
    accesspointUpdate();
    wiredUpdate();
    internetUpdate();
    connectedDevicesUpdate();
    pairedDevicesUpdate();
    internalUpdate();
    criticalUpdate();
    console.log(aux.timeStamp(), "--------------------------------------[M]");
    return true;
};


//FRAMES ============================================================================== Frame Level
//Render start page frames........................................................Start Page Frames
//---------------------------------------------------------------------------------Frame: Streaming
/**Updates streaming state to frontend by sending a frame: 
 * Emits ("streaming", "idle" / "spotify" / "bluetooth" / "error" / "unknown")
 * @param  {string}     ifNewState, streamer changed into a new state
 * @global {io}         "streaming"
 * @return {string}      streaming state
 */
async function streamingUpdate(ifNewState = "") {
    let streamingState = ifNewState;
    if (ifNewState === "") {
        //console.log(aux.timeStamp(), "view: read status from alsa:-", ifNewState);
        streamingState = await mod.getStreamingStatus();
    };
    //console.log(aux.timeStamp(), "view: streaming frame updated:-", streamingState );
    io.emit("streaming", streamingState);
    return streamingState;
};

//---------------------------------------------------------------------------------Frame: Bluetooth
/**Updates Bluetooth connection state to frontend by sending a frame:           
 * Emits ("bluetooth",	"yes" / "no" )   - yes means unblocked.
 * @global {io}     "bluetooth"
 * @return {string}  bluetooth connection status, on or off
 */
async function bluetoothUpdate() {
    let bluetoothState= await mod.bluetoothStatus();
    //console.log(aux.timeStamp(), "view: bt frame updated:-", bluetoothState);
    io.emit("bluetooth", bluetoothState);
    return bluetoothState;
};

//-------------------------------------------------------------------------------------Frame: Wi-Fi
/**Updates the wireless state                                                
 * Emits ("wireless", ["<ssid>", "<ipaddress>"] / [])
 * @global {io}    "wireless"
 * @return {array}  SSID and IP address or the empty array
 */
async function wirelessUpdate() {
    let wifiStateArray = await mod.wirelessStatus();
    //console.log(aux.timeStamp(), "view: wireless frame updated:-", wifiStateArray);
    io.emit("wireless", wifiStateArray);
    return wifiStateArray;
};

/**Updates the access point status (internal state)                                     
 * Emits ("accesspoint", "up" / "down")
 * Access point is only used for system maintenance - not by user
 * @global {io}     "accesspoint"
 * @return {string}  up or down
 */
async function accesspointUpdate() {
    let apStatus = await mod.accesspointStatus();
    //console.log(aux.timeStamp(), "view: AP frame updated:-", apStatus);
    io.emit("accesspoint", apStatus);
    return apStatus;
};

//--------------------------------------------------------------------------------------Frame: LAN
/**Updates the wired state                                               
 * Emits ("wired", "<ipadress>" / "")
 * @param  {string}  state, is set if a change is detected
 * @global {io}     "wired"
 * @return {string}  IP address or ""
 */
async function wiredUpdate(state = "") {                                    
    let lanState = state;
    if (state === "") {
        lanState = await mod.wiredStatus();
    };
    //console.log(aux.timeStamp(), "view: LAN frame updated:-", lanState);     
    io.emit("wired", lanState);
    return lanState;
};


//Only on About and Model page
/**Updates the Internet state                                          
 * Emits ("internet", "connected" / "disconnected")
 * @param  {string}  state, is set if a change is detected
 * @global {io}     "internet"
 * @return {string}  connected or disconencted
 */
async function internetUpdate(state = false) {                                  
    let internetAccess = state;
    if (state == false) {
         internetAccess = await mod.internetStatus();
    };
    //console.log(aux.timeStamp(), "view: Internet frame updated:-", internetAccess);
    io.emit("internet", internetAccess);
    return internetAccess;
};

//---------------------------------------------------------------Frame: connected bluetooth devices
/**Updates the connected Bluetooth source device list                       [start page]
 * Emits ("connectedDevices", [{bdAddr: <BD-address>, name: <name>},...] )
 * @param  {array}  devices, is set if a change is detected
 * @global {io}     "connectedDevices"
 * @return {string}  [{bdAddr: <BD-address>, name: <name>},...]  or []
 */
async function connectedDevicesUpdate(devices) {
    //console.log(aux.timeStamp(), "view: incoming connecting 'devices' value:-", devices);
    let connectedDevices = devices;
    if (typeof devices === 'undefined') {
        connectedDevices = await mod.connectedBluetoothSourcesNames();
    };
    //console.log(aux.timeStamp(), "view: CONNECTED device sources frame updated:-", connectedDevices);
    io.emit("connectedDevices", connectedDevices);
    return connectedDevices;
};
//------------------------------------------------------------------Frame: paired bluetooth devices
/**Updates the paired Bluetooth source device list
 * Emits ("pairedDevices", [{bdAddr: <BD-address>, name: <name>},...] )
 * @param  {array}  devices, is set if a change is detected
 * @global {io}     "paireddDevices"
 * @return {string}  [{bdAddr: <BD-address>, name: <name>},...]  or []
 */
async function pairedDevicesUpdate(devices) {
    //console.log(aux.timeStamp(), "view: incoming paired 'devices' value:-", devices);
    let pairedDevices = devices;
    if (typeof devices === 'undefined') {
        pairedDevices = await mod.pairedOnlyBluetoothSources();
    };
    //console.log(aux.timeStamp(), "view: disconnected PAIRED device frame updated:-", pairedDevices);
    io.emit("pairedDevices", pairedDevices);
    return pairedDevices;
};
//...........................................................................................HELPER
//---------------------------------------------------------------------------------Frame: Bluetooth
//---------------------------------------------------------------------------------Frame: Wi-Fi
/**Renders a network frame showing the connection status or it removes the frame
 * from the start page if disconnected/stopped. AP is not supported anymore.
 * It is a part of P2. Incoming User Request for connect/disconnect of a network
 * @param {networkType} networkType, bluetooth, hotspot or wifi as a string
 * @return {?}          no interest
 */
function networkUpdate(networkType) {
    //console.log(aux.timeStamp(), "View: request update of frame:", networkType);
    switch (networkType) {
        //Bluetooth off - turns off the bluetooth network service
        case "bluetooth":
            bluetoothUpdate()
            break;
        //Wi-Fi off     
        case "wifi":
            wirelessUpdate();
            //accesspointUpdate(); //often the AP is going up instead of Wi-Fi
            break;
        default:
            return false;
    };
};
//.....................................................................................[About page]
//Render about page frames........................................................About Page Frames
/**Updates the frame about time, date, uptime, versions and licence
 * Emits ("timestamp-versions", { date: "day...", time: "hh:mm...", ..." } )
 * @param  {object}  frameData, { date: "day...", time: "hh:mm...", version: "6.xxxx", os: "...", license: "GNU .." }
 * @global {io}     "timestamp-versions"
 * @return {string}  frameData
 */
async function timeVersionsLicenseUpdate() {
    let frameData = await mod.aboutTimeandVersions();
    io.emit("timestamp-versions", frameData);
    return frameData;
};
/**Updates the frame about memory disk usage
 * Emits ("diskmemory",  { size: "nnn GB", used: "nn%" }  )
 * @param  {object}  frameData,  { size: "nnn GB", used: "nn%" } 
 * @global {io}     "timestamp-versions"
 * @return {string}  frameData
 */
async function diskMemoryUpdate() {
    let frameData = await mod.aboutMemoryUsage();
    io.emit("diskmemory", frameData);
    return frameData;
};
/**Updates the frame about RAM usage
 * Emits ("ram-usage",   { ram: "n GB", inUse: "nn%" }  )
 * @param  {object}  frameData, { ram: "n GB", inUse: "nn%" }
 * @global {io}     "ram-usage"
 * @return {string}  frameData
 */
async function ramMemoryUpdate() {
    let frameData = await mod.aboutRAMUsage();
    io.emit("ram-usage", frameData);
    return frameData;
};
/**Updates the frame about streaming services
 * Emits ("streaming",   { spotify: false, airplay: false, bluealsa: false } )
 * @param  {object}  frameData, { spotify: boolean, airplay: boolean, bluealsa: boolean }
 * @global {io}     "streaming"
 * @return {string}  frameData
 */
async function nowStreamingUpdate() {
    let frameData = await mod.aboutStreamingServices();
    io.emit("streaming", frameData);
    return frameData;
};
/**Updates the frame about amplifier and Bluetoot Speaker
 * Emits ("streaming",   { muted: true, usingAlsa: "", speaker: "" } )
 * @param  {object}  frameData, { muted: boolean, usingAlsa: "", speaker: "", sampling: "", format: "" } }
 * @global {io}     "amplifier"
 * @return {string}  frameData
 */
async function amplifierUpdate() {
    let frameData = await mod.aboutAmplifier();
    io.emit("amplifier", frameData);
    return frameData;
};
/**Updates the frame about signal levels for Wi-Fi and Bluetooth
 * Emits ("signal",   { wifi: false, ssid: "",...}  ...)
 * @param  {object}  frameData,  { wifi: false/"Link Quality...", ssid: "<ssid>", bluetooth: boolean, 
 *                                 speaker: false/{name: <name>, link: "Good..."}, 
 *                                 sources: false/[ {name: <name>, link: "Good..."}, ...], version:"" }
 * @global {io}     "signal"
 * @return {string}  frameData
 */
async function signalUpdate() {
    let frameData = await mod.aboutConnections();
    io.emit("signal", frameData);
    return frameData;
};
/**Updates the frame about the hardware
 * Emits ("hardware",   { computer: "", card: "" } )
 * @param  {object}  frameData, { computer: "", card: ""  }
 * @global {io}     "hardware"
 * @return {string}  frameData
 */
async function hardwareUpdate() {
    let frameData = await mod.aboutHardware();
    io.emit("hardware", frameData);
    return frameData;
};
//.....................................................................................[Model page]
//Render about page frames........................................................Model Page Frames

/**Updates volume information from backend to frontend by sending a frame: 
 * Emits ("volume", 0 - 100 )  - integer 
 * Note: used ONLY at boot of streamer, often the user sets the volume
 * @global {io}     "volume"
 * @return {integer} volume as an integer, interval: 0 - 100
 */
async function volumeUpdate() {
    let currentVolume = await mod.getVolume();
    //console.log(aux.timeStamp(), "view: volume slider updated:-", currentVolume);
    io.emit("volume", currentVolume);
    return currentVolume;
};

/**Updates the frame about internal states of interest
 * Emits ("internal",  { muted: boolean, ... see below )
 * @param  {object}  frameData, { muted: boolean, isOpenPage: boolean, isStartPage: boolean, isFile: boolean }
 * @global {io}     "internal"
 * @return {string}  frameData
 */
async function internalUpdate() {
    let frameData = await mod.internalStates();
    io.emit("internal", frameData);
    return frameData;
};
/**Updates the frame about critical error regarding CPU, temperature and voltage
 * Emits ("internal",  { throttle: false, power: false, hot: ...     see below )
 * @param  {object}  frameData, { throttle: false, power: false, hot: false, temp: string, volt: string }
 * @global {io}     "critical"
 * @return {string}  frameData
 */
async function criticalUpdate() {
    let frameData = await mod.internalErrors();
    io.emit("critical", frameData);
    return frameData;
}

//==========================================================================================Incoming
//Protocol for incoming PAGES requests ===========================================================P1
//--------------------------------------------------------------------------------------------------
/** P1. set up listener for incoming render request from socket page that has
 * opened or wants an update, i.e. rerendering. This specific listener causes
 * rerendering of Streamer web pages. All actions are end points.
 * The object 'socket.data' can store arbitrary system specific data. The type of page
 * is stored in extra attributes for example 'startpage' of 'socket.data'. True if it is a startpage.
 * Attributes used: "startpage", "aboutpage" and "modelpage"
 * This attribute is checked and used by mod.isOpenStartPage()
 * References: https://socket.io/docs/v4/server-instance/#utility-methods
 * @param     {object}        socket, socket.io object, i.e. a connected web page
 * @param     {object}        socket.data, add attribute 'page' -  set to type of page
 * @listener  {socket}        sets up listeners for page rendering events
 * @return    {?}             of no interest
 */
function incomingPageRequests(socket) {
    //Listener for render request from socket connected web page that has opened...
    socket.on('page-opens', async function (data) {
        //console.log("[OPEN]");
        console.log(aux.timeStamp(), "view: page is open:", data.page);       
        
        switch (data.page) {
            case "startpage":
                //console.log(aux.timeStamp(), "view: start page, reason[H]:", data.when);
                //IMPORTANT: mark the socket with type of page
                socket.data.startpage || (socket.data.startpage = true);
                renderStartPage(); //end-point in function - render full start page
                break;
            
            case "aboutpage":
                //console.log(aux.timeStamp(), "view: about page, reason[A]:", data.when);
                //IMPORTANT: mark the socket with type of page
                //socket.data.aboutpage || (socket.data.aboutpage = true);
                renderAboutPage();
                break;

            case "modelpage":
                //console.log(aux.timeStamp(), "view: model page, reason[M]:", data.when);
                //IMPORTANT: mark the socket with type of page
                //socket.data.modelpage || (socket.data.modelpage = true);
                renderModelPage()
                break;
        };
    });
};

//==========================================================================================Incoming
//Protocol for incoming USER commands ============================================================P2
//--------------------------------------------------------------------------------------------------
 /** P2. Sets up listeners for incoming user commands from socket page that are
  * opened. This function defines the frontend protocol of user commands.
  * This set of listeners causes different kind of control actions to be done
  * by streamer-control.js and specialized library function in the folder /lib. Unlike
  * P1 above the end points are not in this function - it occurs at completion of the command.
  * The GV blockUI is set for turn the Bluetooth off or on, otherwise the UI can get confused
  * by several clickings on the button.
  * @param     {socket.io}     socket, socket.io object, i.e. a connected web page
  * @global    {boolean}       blockUI, during connections the UI needs to be blocked
  * @listener  {socket.io}     page generated user events
  * @return    {?}             no one knows...
  */
function incomingUserRequests(socket) {
    //__________________________________________________________________________________
    //Stop streaming..................................................... STOP streaming
    //data is a string "spotify" | "bluetooth"
    socket.on('stop-streaming-now', function (data) {
        console.log(aux.timeStamp(), "[H] Frontend: stop streaming", data);
        ctl.userStopStreaming(data);
    });

   //-----------------------------------------------------------------------------------
   //Bluetooth source (phone)............................Bluetooth Source (unpair phone)
    //Remove a disconnected bluetooth audio source from frontend (untrust = unpair)
    //data is an object { bdAddr: <mac>, type: "phone" }
   socket.on('untrust-device', function (data) {
     console.log(aux.timeStamp(), "[H] Frontend: untrust bt device", data);
     ctl.untrustDevice(data);
   });

   //_________________________________________________________________________________
   //Bluetooth source (phone).....................Bluetooth Source (disconnected phone)
    //Disconnect a bluetooth audio source device (a smart phone...)
    //data is an object { bdAddr: mac }
   socket.on('disconnect-device', function (data) {
     console.log(aux.timeStamp(), "[H] Frontend: disconnect for phone", data);
     ctl.disconnectBtDevice(data);
   });

   //_________________________________________________________________________________
   //Connected..................................................Bluetooth Service (ON)
    //Enable Bluetooth service only [DEPRECATED: or start Hotspot (Access Point)]
    //data is an object { network: "bluetooth" }
   socket.on('connect-network', function (data) {
     console.log(aux.timeStamp(), "[H] Frontend: connect request", data);
       if ((data.network === 'bluetooth') && (blockUI === false)) {
           blockUI = true;
           ctl.connectNetwork(data);
           aux.sleep(200).then(() => {
               networkUpdate(data.network); //render frame for network
               blockUI = false;
           });
       };
   });
   //Disabled................................................Bluetooth Service (OFF)
    //Disabled Bluetooth service only [DEPRECATED: or disconnect Wi-Fi or stop Hotspot]
    //data is an object { network: "bluetooth" }
   socket.on('disconnect-network', function (data) {
       console.log(aux.timeStamp(), "[H] Frontend: disconnect request", data);
       if ((data.network === 'bluetooth') && (blockUI === false)) {
           blockUI = true;
           ctl.disconnectNetwork(data);
           aux.sleep(300).then(() => {
               console.log(aux.timeStamp(), "view: wait is over, render:", data.network);
               bluetoothUpdate();           //frame for bluetooth
               blockUI = false;
           });
       };
   });
   
};
//======================================================================== End of protocol 2
