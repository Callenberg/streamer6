# streamer6
Streamer software version 6 - frontend and backend for a simple Raspberry Pi music network streamer controller.
Streamer software version 6 - frontend and backend for a simple Raspberry Pi music network streaming controller.

This is a more scaled down version of the software that was used for the network music streamers custom built by the now defunct Retro Audiophile Designs. 

The software makes it possible to stream music using Bluetooth audio or Spotify on a Raspberry Pi 5 with an amplifier, the HAT Raspberry Pi DigiAMP+. It turns the Raspberry Pi with the amplifier into a Bluetooth reciever and it also supports Spotify Connect streaming. Connect the Raspberry Pi to a to a home network with cable or Wi-Fi. Attach the amplifier to old fashioned wired passive Hi-Fi speakers. The Streamer and its connections are managed by a web interface.

Hardware requirements:
=====================
Raspberry Pi 5, 2GB or more RAM, works with Raspberry Pi 3 and Pi 4 too.

A Wi-Fi dongle (two Wi-Fi circuits makes the set up easier and better signal coverage). The onboard Wi-Fi is used as a hotspot.

Class D amplifier Raspberry Pi-DigiAMP+ HAT for Raspberry Pi (or the Raspberry DAC+ -requires some customization)

12-24V power source is required for the amplifier.

Software requirements:
=====================
Raspberry Pi OS based on Debian Trixie https://www.raspberrypi.com/documentation/computers/os.html

librespot https://github.com/librespot-org/librespot

Bluetooth Audio ALSA Backend https://github.com/Arkq/bluez-alsa

Node.js https://nodejs.org/en/download/

socket.io https://socket.io/

Express https://expressjs.com/

(for a full list of Javascript packages and their versions look at the file package-lock.json).

Usage
====
This is only a plain software depository. There is no package to install. The best usage is probably to look at the source code and see if something interests you and then maybe the code can inspire you.
