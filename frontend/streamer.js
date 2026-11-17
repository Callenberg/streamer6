//Copyright 2026 by Callenberg on Github
//GNU General Public License v3.0 or later                 [Source code]
//             ~ Frontend code for Streamer Start Page ~

//Global variables
var socket = io.connect();  //socket connects for communication to backend
var disconnection = false;  //true if there has been a disconnect


//Render on page show events==========================================================
document.onvisibilitychange = () => {
    if (document.visibilityState !== "hidden") {
        console.log(timeStamp(), "Internal: ==== document is not hidden ====");
        //PRESENCE call to backend! -- render full page again
        socket.emit('page-opens', { page: "startpage", when: "visible again" }); 
    };
};

//========================================================================================
//Open page code =========================================================================
/**This is the main part of listeners for page events (not buttons)
 * "document.addEventListener('DOMContentLoaded', function () { ..." is the head
 *          ...the tail is further down. Do not delete the tail!
 * (all backend listeners for commands have to be enclosured by this listener)
 * When the base set up of the page, streamer.html, is loaded -  start listen on socket!
 * @return {?}          never returns, of no interest
 */
document.addEventListener('DOMContentLoaded', function () {
    //The DOM is loaded, initial HTML document rendered
    console.log(timeStamp(), "DOM is ready!");
    //PRESENCE call to backend! -- first (attempt) to render full page
    socket.emit('page-opens', { page: "startpage", when: "DOM ready" });  

//.................................................................................iOS
   // iOS web app full screen hacks for all pages; Progressive Web App (PWA) looks
  if(window.navigator.standalone == true) {
    // make all links remain in web app mode.                       NOTE: jQuery
    $('a').click(function() { window.location = $(this).attr('href');
                return false;
                    });
                  };
//.................................................................................iOS

//===========================================================Backend Command Listeners
///Listeners for rendering of information frames......................................
    socket.on('streaming', function (dataString) {
      //data is a string, e.g. "idle...", "spotify", 
      //console.log(timeStamp(),"From backend: new status frame", dataString);
      renderStreamingState(dataString);
      disconnection && connectionAgain();
      disconnection = false; /*connection established*/
    });

    socket.on("bluetooth", function (dataString) {
     //Set bluetooth state - data is a string "on" or "off"
     //console.log(timeStamp(),"From backend: bluetooth is", dataString);
     renderBluetoothStatus(dataString);
     disconnection && connectionAgain();
     disconnection = false; /*connection established*/
});

    socket.on("wireless", function (dataArray) {
        //Set wireless state - data is an array; ["SSID"", "IP address"]
        //console.log(timeStamp(), "From backend: connected to Wi-Fi:", dataArray);
        renderWirelessStatus(dataArray);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("wired", function (dataString) {
        //Set cable attached state - data is a string "ip adress" or ""
        //console.log(timeStamp(), "From backend: LAN cable status:", dataString);
        renderWiredStatus(dataString);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    //BLUETOOTH DEVICES ::::::::::::::::::::::::::::::::::::::::::
    socket.on("connectedDevices", function (dataArray) {
        //Render connected source devices (often phones) - dataArray is an array
        //of device objects: [{bdAddr: <BD-address>, name: <name>},...] 
        //console.log(timeStamp(), "From backend: bluetooth connected SOURCES are:", dataArray);
        renderConnectedSources(dataArray);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on("pairedDevices", function (dataArray) {
        //Render paired source devices that are not connected anymore - dataArray is an array
        //of device objects: [{bdAddr: <BD-address>, name: <name>},...] 
       //console.log(timeStamp(), "From backend: bluetooth disconnected pairedSOURCES are:", dataArray);
        renderPairedSources(dataArray);
        disconnection && connectionAgain();
        disconnection = false; /*connection established*/
    });

    socket.on('connect_error', (error) => {
        if (error && (disconnection === false)) {
            disconnection = true; /*disconnected*/
            disconnect(); /*render disconnected frame */

            //Last desperate call to backend for render... will be buffered
            socket.emit('page-opens', { page: "startpage", when: "after error" });
        };
        //no action here
    });
    socket.on("disconnect", () => {
        if (disconnection === false) {
            disconnection = true; /*disconnected*/
            disconnect(); /*render disconnected frame */

            //Last desperate call to backend for render... will be buffered
            socket.emit('page-opens', { page: "startpage", when: "after disconnect" });
        };
        //no action here
    });

//=================================================================== this is the TAIL
//Open page sequence END =============================================================
});


//================================================================ generate HTML======
// Building HTML dynamically for Streamer page =======================================
//====================================================================================
//Streamer frames                                                 DOM-manipulation
//------------------------------------------------------------------------------------
//Status frames are created by HTML builds:      A to J
//Information frames are created by HTML builds: K to P

/**HTML - render Streaming status - called by backend.
 * The state frame has the id player-status and it is an <ul> element. The
 * content of the frame is a <li> element. It might have a button/listener.
 * State string can be: "idle", "bluetooth", "spotify", "error", "unknown"
 * @param  {string}     state, current state to render
 * @param  {DOM}        id, 'player-status' -- should be renamed to streamer-status
 * @return {html}       of no interest
 */
function renderStreamingState(state) {
  //console.log("Making HTML for:", status);
  switch(state) {
    case "idle":
    document.getElementById("player-status").innerHTML = idleStatusHTML();
    break;
      case "bluetooth":
    //Triggers: busyStreaming() + whatIsStreaming()
    document.getElementById("player-status").innerHTML = bluetoothStatusHTML();
    //button setting onclick="functionName()" or one-time listeners?
    break;
    case "spotify":
    //Triggers: busyStreaming() + whatIsStreaming()
    document.getElementById("player-status").innerHTML = spotifyStatusHTML();
    //button setting onclick="functionName()"
    break;
    case "disconnected":                       
    //Called from disconnect() below . . .
    document.getElementById("player-status").innerHTML = disconnectedStatusHTML();
          break;
    case "error":
    //Called from disconnect() below . . .
    document.getElementById("player-status").innerHTML = disconnectedStatusHTML();
          break;
    case "unknown":
    //Called from disconnect() below . . .
    document.getElementById("player-status").innerHTML = unknownStatusHTML();
    break;
    default:
    document.getElementById("player-status").innerHTML = unknownStatusHTML();
    return false;
  };
};

 //_____________________________________________________________HTML builds___________
 // Build state frames for streamer streaming states - state frame is persistent  A - J
 //-----------------------------------------------------------------------------------
 //A. HTML build for idle state [no button]....................................
function idleStatusHTML() {
     return `
     <li id="idle-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="wifi-symbol fas fa-record-vinyl fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Idle... </p>
     </div> </li>
     `;
};
//B. HTML build for USB Playback state.........................................DEPRECATED

//C. HTML build for Bluetooth streaming state..................................bluetoothStopClicked()
function bluetoothStatusHTML() {
     return `
     <li id="bluetooth-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="wifi-symbol fab fa-bluetooth-b fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Streaming Bluetooth... </p>
     </div>
     <div id="stop-bluetooth" class="col-auto d-flex justify-content-end align-top pt-1 px-1">
       <button class="playback-btn" type="button">
         <i class="settings-btn fas fa-times-circle fa-2x" title="Stop Streaming" onclick="bluetoothStopClicked()"></i>
       </button>
     </div> </li>
     `;
};
//D. HTML build for Spotify streaming state....................................spotifyStopClicked()
function spotifyStatusHTML() {
     return `
     <li id="spotify-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="wifi-symbol fab fa-spotify fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Streaming Spotify... </p>
     </div>
     <div id="stop-spotify" class="col-auto d-flex justify-content-end align-top pt-1 px-1">
       <button class="playback-btn" type="button">
         <i class="settings-btn fas fa-times-circle fa-2x" title="Stop Streaming" onclick="spotifyStopClicked()"></i>
       </button>
     </div>  </li>
     `;
};
//E. HTML build for Airplay streaming status....................................DEPRECATED
//NOTE: Cannot use fontawesome icons, instead a css web-mask is used [line 93]
//<div class="bg-secondary airplay-symbol"> </div> and .css airplay-symbol

//F. HTML build for UPnP streaming status.................................... DEPRECATED
//NOTE: Cannot use fontawesome icons, instead a plain svg file is used
//Found icon here: https://iconape.com/upnp-logo-icon-svg-png.html
//Found <img> tips here: vgontheweb.com/#implementation
//<img src="upnp.svg" alt="Breaking Borders Logo" height="45" width="45">
//Changes to upnp.svg file: <path fill="#373D45"... and <path fill="#73777C"...

//G. HTML build for restarting  [no button]...............................NOT IN USE
// originally fas fa-power-off
function restartPlayerStatusHTML() {
     return `
     <li id="restart-player-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="symbol-off fas fa-times fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Restarting Player... </p>
     </div> </li>
     `;
};
//H. HTML build for restarting  [no button]...............................NOT IN USE
//originally fs fa-circle-notch
function restartStreamingStatusHTML() {
     return `
     <li id="restart-streaming-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="symbol-off fas fa-times fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Restarting all streaming... </p>
     </div> </li>
     `;
};
//I. HTML build for disconnect state [error state]................................
function disconnectedStatusHTML() {
     return `
     <li id="idle-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="symbol-off fas fa-times fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">ERROR: Disconnected </p>
     </div> </li>
     `;
};
//J. HTML build for empty status [unknown state]................................
function unknownStatusHTML() {
    return `
    <li id="idle-status" class="list-group-item d-flex justify-content-between align-items-center player-list">
       <div class="col-auto">
       <i class="symbol-off fas fa-times fa-2x px-2 my-2"></i>
     </div>
     <div class="col pl-0">
       <p class="settings-text pl-0 my-3">Unknown state... <b>restart required!</b></p>
     </div> </li>
     `;
};
//____________________________________________________________________________________
//Connection State frames                                         DOM-manipulation
//------------------------------------------------------------------------------------
/**HTML - if Bluetooth is on then render frame HTML for Bluetooth state,
 * or if it is off remove the frame with an empty string (does this really work?)
 * @param  {bluetooth}bluetooth, yes or no as a string
 * @param  {id}       id = 'bluetooth-list' for HTML
 * @param  {button}   button = "#disconnect-bluetooth" for off-button
 * @return {html}    frame
 */
function renderBluetoothStatus(bluetooth) {
    if (bluetooth == "yes") {
        document.getElementById("bluetooth-list").innerHTML =
            btStatusHTML();
        $("#disconnect-bluetooth").on('click', function () {
            console.log("Button; turn-off Bluetooth - all and everything");
            turnoffBluetoothClicked();
        });
    }
    else {
        //document.getElementById("bluetooth-list").innerHTML = "";
        //$("#disconnect-bluetooth").off('click');
        document.getElementById("bluetooth-list").innerHTML =
            bluetoothOffHTML();
        $("#connect-bluetooth").on('click', function () {
            console.log("Button; turn-On Bluetooth");
            turnonBluetoothClicked();
        });
        $("#disconnect-bluetooth").off('click');
    };
};

/**HTML - if the Streamer is connected to Wi-Fi render frame HTML,
 * @param  {dataArray} dataArray, ["ssid", "ipaddr"] or []
 * @param  {id}        id = 'wireless-status'
 * @param  {button}    button, "#disconnect-wifi"
 * @return {html}      frame
 */
function renderWirelessStatus(dataArray) {
    if (dataArray.length > 0) {
        document.getElementById("wireless-status").innerHTML =
            wirelessHTML(dataArray[0], dataArray[1]);
        $("#disconnect-wifi").on('click', function () {
            console.log("Button; disconnect Wi-Fi");
            disconnectWifiClicked();
        });
    }
    else {
        document.getElementById("wireless-status").innerHTML = "";
        $("#disconnect-wifi").off('click');
    };
};

/**HTML - if the Streamer is connect to LAN with a cable, render frame
 * No button.
 * @param  {ipAddr}   ipAddr = "nnn.nnn.n.nnn" or ""     
 * @param  {id}       id = 'wired-status'
 * @return {html}     frame
 */
function renderWiredStatus(ipAddr) {
    document.getElementById("wired-status").innerHTML =
        wiredStatusHTML(ipAddr);
};
//_______________________________________________________________________________________________
/**HTML - render state frame HTML for connected sources devices.               [Connected Phones]
 * @param  {bluetooth} deviceArray, [{bdAddr: <BD-address>, name: <name>},...] or []
 * @param  {id}        id = "bluetooth-connected-devices"
 * @param  {button}    button = ".sourcedevice-btn" to disconnect phone
 * @return {?} 
 */
function renderConnectedSources(deviceArray) {
    if (deviceArray.length == 0) {
        document.getElementById("bluetooth-connected-devices").innerHTML =
            bluetoothNoSourcesHTML();
        $(".sourcedevice-btn").off('click');
    }
    else {
        document.getElementById("bluetooth-connected-devices").innerHTML =
            bluetoothConnectedSourcesHTML(deviceArray);
        //might be one or more buttons - use class .playback-btn
        $(".sourcedevice-btn").on('click', function () {
            console.log("C. disconnect a phone");
            disconnectDeviceClicked($(this));
        });
    };
};
/**HTML - render state frame HTML for the disconnected paired sources devices.    [Paired Phones]
     * @param  {bluetooth} deviceArray, [{bdAddr: <BD-address>, name: <name>},...] or []
     * @param  {id}        id = "bluetooth-paired-devices"
     * @param  {button}    button = ".list-remove-phone-btn" to remove phone
     * @return {?} 
     */
function renderPairedSources(deviceArray) {
    if (deviceArray.length == 0) {
        document.getElementById("bluetooth-paired-devices").innerHTML = "";
        $(".list-remove-phone-btn").off('click');
    }
    else {
        document.getElementById("bluetooth-paired-devices").innerHTML =
            bluetoothPairedSourcesHTML(deviceArray);
        //might be one or more buttons - use class .playback-btn
        $(".list-remove-phone-btn").on('click', function () {
            console.log("C2. remove the PHONE");
            removePhoneClicked($(this));
        });
    };
};
//--------------------------------------------------------HTML builds for state frames
//Information generates various HTML builds: K to P
//------------------------------------------------------------------------------------
//They have different ids like 'bluetooth-list' or 'wired-status' and they are <ul>
//elements.The ids are used by .innerHTML() function for each <ul>.
//The content of the frame are <li> elements. They might each have a button.
/**K. HTML - create frame HTML for Bluetooth on
 * @param  {id}       id = 'bluetooth-list'.
 * @return {html}    frame
 */
function btStatusHTML() {
    return  `
    <li id="btservice" class="list-group-item d-flex justify-content-between align-items-center player-list">
      <div class="col-auto pr-2">
        <i class="bluetooth-symbol fab fa-bluetooth-b fa-2x px-2 my-2"></i>
      </div>
      <div class="col pl-1">
        <p class="settings-text my-3">Bluetooth is <strong>ON</strong></p>
      </div>
      <div id="disconnect-bluetooth" class="col-auto d-flex justify-content-end align-top p-1">
        <button class="playback-btn" type="button">
          <i class="settings-btn fas fa-times-circle fa-2x" title="Turn-off Bluetooth"></i>
        </button>
      </div> </li>
    `;
};
/**HTML - create frame HTML for Bluetooth off
     * @param  {id}       ulid = 'bluetooth-list' is used above
     * @return {html}    frame
     */
function bluetoothOffHTML() {
    return `
    <li id="btservice" class="list-group-item d-flex justify-content-between align-items-center player-list">
        <div class="col-auto pl-2 pr-0">
         <i class="nobluetooth fab fa-bluetooth-b fa-2x px-2 my-2"></i>
        </div>
         <div class="col-auto pl-0 pr-3">
         <i class="symbol-off fas fa-circle"></i>
        </div>
        <div id="connect-bluetooth" class="col my-2 ml-0 pl-1">
            <button type="button" class="btn usb-root-btn"title="Turn on Bluetooth">
                Turn On Bluetooth
             </button>
        </div>
    </li>
    `;

};

/**M. HTML - create frame HTML for connected Wi-Fi
 * that shows SSID and IP address
 * @param  {ssid}     ssid, SSID a string
 * @param  {ipAddr}   ipAddr, IP adress a string
 * @param  {id}       id = 'wireless-status'
 * @return {html}     frame
 */
function wirelessHTML(ssid, ipAddr) {
    return `
      <li id="wifi-is-on" class="list-group-item d-flex justify-content-between align-items-center player-list mb-1">
      <div class="col-auto">
        <i class="wifi-symbol fas fa-wifi fa-2x my-2 p-0"></i>
      </div>
      <div class="col p-0">
        <p id="wifi-text" class="settings-text mt-1 mb-2 pl-0">Wi-Fi: <strong>${ssid}</strong><br> IP-address is ${ipAddr}</p>
      </div>
      </li>
      `;
};
/**N. HTML - create frame HTML for accesspoint up           ---NOT IN USE for user, but AP still exists
 * @param  {id}       id = 'accesspoint-status'
 * @return {html}     frame
 */
function apStatusHTML() {
    return `
        <li id="hotspot-is-on" class="list-group-item d-flex justify-content-between align-items-center player-list mb-1">
        <div class="col-auto ">
          <i class="wifi-symbol fas fa-wifi fa-2x fa-rotate-180 mt-2 mb-2 p-0"></i>
        </div>
        <div class="col p-0">
          <p class="settings-text hotspot mt-1 mb-0">Hotspot available: <br> Connect to IP-address 10.0.0.1 </p>
          <p class="settings-text-small mt-0 mb-2">[Note: Hotspot can be disconnected] </p>
        </div>
        <div id="disconnect-hotspot" class="col-auto d-flex justify-content-end align-top pt-1 px-1">
          <button class="playback-btn" type="button">
            <i class="settings-btn fas fa-times-circle fa-2x" title="Stop hotspot"></i>
          </button>
        </div>  </li>
        `;
};
/**O. HTML - create frame HTML for Ethernet LAN cable with IP address
 * @param  {id}       id = 'wired-status'
 * @return {html}     frame
 */
function wiredStatusHTML(ipAddr) {
    //console.log("Wired status, lenght of data", ipAddr.length > 0 );
    if (ipAddr.length > 0) {
        return `
         <li id="lan-is-on" class="list-group-item d-flex justify-content-between align-items-center player-list mb-1">
        <div class="col-auto">
            <i class="lan-symbol fas fa-ethernet fa-2x mt-1 mb-2"></i>
        </div>
        <div class="col pl-0">
            <p class="settings-text mt-1 mb-2">LAN cable connected <br> IP-address is ${ipAddr}</p>
        </div>  </li>
        `;
    }
    else {
        return `
        <li id="lan-is-off" class="list-group-item d-flex justify-content-between align-items-center player-list mb-1">
            <div class="col-auto">
            <i class="nolan fas fa-ethernet fa-2x mt-1 mb-2"></i>
            </div>
            <div class="col pl-0">
                <p class="settings-text mt-1 mb-2">No LAN cable attached </p>
            </div>  </li>
            `;
    }; 
};
//.............................................................................
/**HTML - create frame HTML for when there is NO connected sources (phones...)
     * @param  {id}       ulid = "bluetooth-connected-devices" is used above
     * @return {html}     frame
     */
function bluetoothNoSourcesHTML() {
    return `
    <li class="list-group-item d-flex justify-content-between
                                      align-items-center player-list mt-n1 ">
    <div class="col-auto pl-2 pr-0">
      <i class="nobluetooth fab fa-bluetooth-b fa-2x px-2 my-2"></i>
    </div>
    <div class="col-auto pl-0 pr-3">
      <i class="nobluetooth fas fa-mobile-alt fa-2x"></i>
    </div>
    <div class="col pl-0">
      <p class="settings-text my-3">No devices connected</p>
    </div>
    </li>
    `;
};
//HTML build for bluetooth source devices..................................................
/**HTML - create frame HTML for the list of connected sources (phones...)
 * @param  {array}    deviceArray, [{bdAddr: <BD-address>, name: <name>},...] 
 * @param  {id}       ulid = "bluetooth-connected-devices" is used above
 * @return {html}     frame
 */
function bluetoothConnectedSourcesHTML(deviceArray) {
    const numberOfDevices = deviceArray.length;
    let listring = "";
    let subFrameString = "";
    let frameStrings = "";
    for (let i = 0; i < numberOfDevices; i++) {
        liString = `
        <li id="bluetooth" class="list-group-item d-flex justify-content-between
            align-items-center player-list mt-n1"
            data-mac="${deviceArray[i].bdAddr}">
                   `;
        subFrameString = `
        <div class="col-auto pl-2 pr-0">
            <i class="bluetooth-symbol fab fa-bluetooth-b fa-2x px-2 my-2"></i>
          </div>
          <div class="col-auto pl-0 pr-3">
            <i class="bluetooth-symbol fas fa-mobile-alt fa-2x"></i>
          </div>
          <div class="col pl-0">
            <p class="settings-text my-3">
              <strong> ${deviceArray[i].name} </strong></p>
          </div>
          <div id="disconnect-device" class="col-auto d-flex justify-content-end align-top p-1">
            <button class="sourcedevice-btn" type="button">
              <i class="settings-btn fas fa-times-circle fa-2x" title="Disconnect"></i>
            </button>
          </div>
        </li> 
        `;
        frameStrings = frameStrings + liString + subFrameString;
    };
    return frameStrings
};
/**HTML - create frame HTML for when there are paired disconnected sources (phones...)
 * @param  {id}       ulid = "bluetooth-paired-devices" is used above
 * @return {html}     frame
 */
function bluetoothPairedSourcesHTML(deviceArray) {
    const numberOfDevices = deviceArray.length;
    let listring = "";
    let subFrameString = "";
    let frameStrings = "";
    for (let i = 0; i < numberOfDevices; i++) {
        liString = `
        <li id="bluetooth" class="list-group-item d-flex justify-content-between
            align-items-center player-list mt-n1"
            data-mac="${deviceArray[i].bdAddr}">
                   `;
        subFrameString = `
           
          <div class="col-auto pl-2 pr-0">
            <i class="nobluetooth fab fa-bluetooth-b fa-2x px-2 my-2"></i>
          </div>
          <div class="col-auto pl-0 pr-3">
            <i class="nobluetooth fas fa-mobile-alt fa-2x"></i>
          </div>
          <div class="col pl-0 my-1">
          <p class="settings-text-small m-0">Paired: </p>
            <p >
              <strong> ${deviceArray[i].name} </strong></p>
          </div>
          <div id="remove-speaker" class="col-auto d-flex justify-content-end align-top p-1">
            <button class="list-remove-phone-btn" type="button">
              <i class="settings-btn fas fa-minus-circle fa-2x" title="Unpair Device"></i>
            </button>
          </div>
        </li>
        `;
        frameStrings = frameStrings + liString + subFrameString;
    };
    return frameStrings;
};

//_____________________________________________________________________________
// FRONTEND requests invoked by user ------------------------------------------
//-----------------------------------------------------------------------------
//A. delete/stop buttons of status subframes:
//No listners for these buttons. They are called in HTML, like this:
//          "...click="airplayStopClicked()..."
//================================================================= STOP BUTTONS
/**HTML and DOM - user has clicked on stop playback in the status subframe.
 * The function calls comes from DOM ' onclick="playbackStopClicked() " ' attribute
 * @return {boolean}      true
 */

/**HTML and DOM - user has clicked on stop bluetooth in the status subframe.
 * The function calls comes from DOM ' onclick="bluetoothStopClicked() " ' attribute
 * @return {boolean}      true
 */
 function bluetoothStopClicked() {
     console.log("Request to backend: (stop-streaming-now, bluetooth)");
     socket.emit('stop-streaming-now', "bluetooth");
   return true;
 };
 /**HTML and DOM - user has clicked on stop spotify in the status subframe.
  * The function calls comes from DOM ' onclick="spotifyStopClicked() " ' attribute
  * @return {boolean}      true
  */
  function spotifyStopClicked() {
    console.log("Request to backend: (stop-streaming-now, spotify)");
      socket.emit('stop-streaming-now', "spotify");
    return true;
 };
 /**HTML and DOM - user has clicked on stop airplay in the status subframe.
  * The function calls comes from DOM ' onclick="airplayStopClicked() " ' attribute
  * @return {boolean}      true
  */
  
 /**HTML and DOM - user has clicked on stop playback in the status subframe.
  * The function calls comes from DOM ' onclick="airplayStopClicked() " ' attribute
  * @return {boolean}      true
  */
  
//B. Volume slider function
//======================================================================= VOLUME
/**HTML and DOM - set the volume by user  - calls backend                           DEPRECATED
 * The VOLUME slider bar has been moved and released.
 * @param   {DOM}           slider element
 * @return  {number}        new volume
 
function volumeTouched(slider) {
  const newVolume = slider.get() * 1; //faster conversion from string
  console.log("Request to backend: (volume, { volume: newVolume })  new volume=", newVolume);
  socket.emit('volume', { volume: newVolume });
  newVolume;
};/*
//C. Main control button
//======================================================================= RESET
/**HTML and DOM - reset Streamer software - calls backend   
 * @return  {boolean}       always true
 */


//D. stop buttons of information subframes
//========================================================================= INFO
/**HTML and DOM - user has clicked on turn off bluetooth services in the
 * information subframe, invoked by listener (button element).
 * @return {?}      true?
 */
 function turnoffBluetoothClicked() {
   console.log("Request to backend: (disconnect-network, { network: bluetooth })");
   socket.emit('disconnect-network',{ network: "bluetooth" });
   return true;
};
/**HTML and DOM - turns ON Bluetooth
     * @param   {DOM jQuery}  buttonElement clicked button element DOM jQuery
     * @return {boolean}      true
     */
function turnonBluetoothClicked(buttonElement) {
    console.log("To backend:(connect-network,{network: bluetooth })");
    socket.emit('connect-network', { network: "bluetooth" });
    return true;
};

 /**HTML and DOM - user has choosen to disconnect a bt speaker.
  * The speaker will vanish from Player page, but still be shown as trusted
  * on Bluetooth page.
  * @return {?}      true?
  */
 
 /**HTML and DOM - user wants to disconnect wi-fi - calls backend.
  * @param  {DOM jQuery} buttonElement disconnect               -- NOT USED, wifi connection is fixed
  * @return {?}  true?
  */
 function disconnectWifiClicked(){
   //console.log("To backend:(disconnect, [wifi]) ");
   socket.emit('disconnect-network',{ network: "wifi" })
 };
 /**HTML and DOM user wants to turn OFF Hotspot - calls backend  -- NOT USED, AP connection is fixed
  * @return {?}  true?
  */
 function turnoffHotspotClicked(){
   //console.log("To backend:(disconnect-network, {network: hotspot}) ");
   socket.emit('disconnect-network',{ network: "hotspot" })
};
//...................................................................Bluetooth Source Buttons
/**Called from HTML/DOM - user has choosen to remove an already disconnected
 * bt phone that is still trusted and thus rendered at frontend. Untrust!
 * @param  {DOM jQuery} buttonElement remove button DOM jQuery
 * @return {?}    of no interest
 */
function removePhoneClicked(buttonElement) {
    let parentElement = $(buttonElement).parent();
    let grandParentElement = $(parentElement).parent();
    let mac = grandParentElement.attr("data-mac");
    console.log('To backend: (untrust-speaker, {bdAddr:', mac, ", type: phone})");
    socket.emit('untrust-device', { bdAddr: mac, type: "phone" });
};
/**Called from HTML/DOM - user has choosen to disconnect a source, a phone.
 * @param  {DOM jQuery} buttonElement remove button DOM jQuery
 * @return {?}    of no interest
 */
function disconnectDeviceClicked(buttonElement) {
    let parentElement = $(buttonElement).parent();
    let grandParentElement = $(parentElement).parent();
    let mac = grandParentElement.attr("data-mac");
    console.log('To backend: (disconnect-device, {bdAddr:', mac, "})");
    socket.emit('disconnect-device', { bdAddr: mac });
};

// Functions for managing BACKEND disconnect and connected again ---------------
//------------------------------------------------------------------------------
/**HTML and DOM - disconnected by backend
 * Lost the connection - render a disconnected message............. disconnected
 * @return {Boolean}  true
 */
function disconnect() {
  renderStreamingState("disconnected");
    $('#wireless-status').hide();
    $('#wired-status').hide();
    $('#bluetooth-list').hide();
    $('#bluetooth-connected-devices').hide();
    $('#bluetooth-paired-devices').hide();
    //$('#nav-bar').hide();
  return true;
};
/**HTML and DOM - connected by backend
 * The connection came back  - unhide all elements.....................connected
 * @return {Boolean}  true
 */
function connectionAgain() {
    $('#wireless-status').show();
    $('#wired-status').show();
    $('#bluetooth-list').show();
    $('#bluetooth-connected-devices').show();
    $('#bluetooth-paired-devices').show();
    //$('#nav-bar').show();
};

//Auxiliary help functions+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
/**No HTML or DOM  - time stamp hrs:min:sec:msec on format 00:00:00:000
 * @return {string}           time stamp
 */
function timeStamp() {
    const d = new Date();
    return `${`0${d.getHours()}`.slice(-2)}:${`0${d.getMinutes()}`.slice(-2)}:${`0${d.getSeconds()}`.slice(-2)}:${`00${d.getMilliseconds()}`.slice(-3)}`;
};

