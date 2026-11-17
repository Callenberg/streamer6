//Copyright 2026 by Callenberg on Github, all rights reserved.
//GNU General Public License v3.0 see license.txt            [Source code]
//             ~ spotify handler for backend ~
const aux = require('./streamer-auxiliary.js');     //for wait function
const exec = require('child_process').exec;         //for OS cmds
const execSync = require('child_process').execSync; //for synced OS cmds
const mod = require('/streamer/streamer-model.js'); //model of streamer, read pid


module.exports.stopSpotifyService = stopSpotifyService;
module.exports.startSpotifyService = startSpotifyService;
module.exports.restartSpotify = restartSpotify;


/**Called by Streamer at boot - start librespot,service
 * Also checks if librespot is really up and running, if not try again...
 * @return {boolean}      true if succesful
 */
async function startSpotifyService() {
  let pid = "";
  try {
    execSync('sudo systemctl start librespot.service',
      {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000});
  }
  catch (err) {
    //console.log(aux.timeStamp(),"Spotify: librespot start ERROR\n", err)
  };
  pid = await mod.readServicePid("librespot");
  if (pid !== "") {
    //Good to go; librespot is up - no action here
    //console.log(aux.timeStamp(),"spot: system service started for librespot ----- #", pid);
    return true;
  }
  else {
    await aux.sleep(1000).then(() => {
      try {
        exec('sudo systemctl restart librespot',
          {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000});
          return true
      }
      catch (err) {
        //consolelog(aux.timeStamp(),"spot: ERROR couldn't start librespot\n", err);
        return false;
      };
  });
  }
};

//............................................................ Boot Preparations
/**Called by streamer BEFORE boot - stops librespot
 * Also used by res.stopSpotify when user wants to stop streaming. Then the
 * parameter 'sendSignalToo' is true.
 * @return {boolean}      of no interest
 */
function stopSpotifyService() {
  try {   //Stop Spotify Connect during the boot phase
    execSync(`sudo systemctl stop librespot.service`,
            {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000});
  }
  catch (err) {
    console.log(aux.timeStamp(),"Spotify: librespot stop ERROR\n", err);
  };
};
//..............................................................just restart service
/**Restarts Spotify without the checking of startSpotify() above. 
 * Called by ctl.restartAllStreaming - 'exec' instead of 'execSync'?
 * @return {boolean}      of no interest
 */
function restartSpotify() {
  try {
     exec(`sudo systemctl restart librespot.service`,
            {uid: 1000, gid: 1000, encoding: 'utf8', timeout: 15000});
          }
  catch (err) {
    console.log(aux.timeStamp(),"Spotify: RESTART librespot ERROR\n", err);
  };
  return true;
};
