import { MOVES, RESPONSE, deskpet } from "./communication.js"
import { JoystickController } from "./joystick.js";
import { alertMessage, hide, show, sleep, limitToRange, enable, disable, pressed, notPressed, isPressed, waitMessage } from "./utils.js"

const version = "Lite 1.0.0";
var versionInfo;

var espIP = window.location.hostname;
//var espIP = "192.168.0.209";
var statusInterval;
var joystick,
    joysticReading;

//// HEADER
var streamButton,
  logoHomeButton;

//// RC CONTROLS 
var hideRC,
  settingsRC,
  ledColorControl,
  ledModeControl,
  hidePeri,
  settingsPeri,
  rollSlider,
  pitchSlider,
  yawSlider,
  rpyResetbuttons,
  fLedSlider;

//// WIFI MANAGER
var wifiConnect,
  wifiShow,
  wifiScan,
  wifiCopy,
  stateMsg,
  wifiManagerCard,
  ssid,
  password;

//// VIDEO
var videoContainer,
  video,
  closeButton,
  saveButton,
  canvas,
  ctx;

var settingsButton,
  rcPushButtons;

//// SETTINGS SUB MENU
var settings,
  wifiManager,
  command,
  commandReply;

var controlBox;
var sendCommandButton;
var batteryLevel;

//// CONNECTION VARIABLES
var overlay,
  connectingCard,
  connectingMsg;

////  Initializes the interface functions.
async function startUpInterface() {
  // Connecting to ESP 
  connectingCard.classList.remove("hidden");

  deskpet.setIP(espIP);

  // Connect the camera socket and command socket with a delay of 500 milliseconds.
  deskpet.connectCAMSocket(document.getElementById('video'));
  deskpet.connectCMDSocket();

  // Start a timer to measure elapsed time.
  var startTime = Date.now();

  // Wait until both command and camera sockets are connected, or a timeout occurs.
  while (true) {
    if (deskpet.isCmdConnected() && deskpet.isCamConnected()) {
      break;
    }
    if (Date.now() - startTime > 10000) {
      connectingMsg.innerText = "This is taking too long, please check your network and DeskPet's IP address";
      startTime = Date.now();
    }
    await sleep(500);
  }

  //Deskpet is already connected to interface using the next IP
  robotState.IP = espIP;

  // Set an interval to update the battery voltage every 60 seconds.
  updateBatteryVoltage(1);
  setInterval(() => {
    updateBatteryVoltage(1); // Keep the battery level updated
  }, 20000);

  // Hide the overlay once the connection is established.
  overlay.style.display = 'none';
  connectingCard.classList.add("hidden");

  // Initialize the joystick controller.
  joystick = new JoystickController("stick", 35, 8);

  // Start the main loop.
  loop();

  setInterval(readJoystick, rcButtonRefreshTime);

  alertMessage("Tip", "Rotate your device to landscape for a better experience");

}

async function loop() {
  //console.log(motion);
  await sleep(500);
  requestAnimationFrame(loop);
}

async function checkConnection() {
  while (!deskpet.isCmdConnected() || !deskpet.isCamConnected()) {
    await sleep(500);
  }
  return true;
}

document.addEventListener('DOMContentLoaded', function (event) {

  /////////////// ELEMENT VARIABLES

  //// HEADER BUTTONS
  streamButton = document.getElementById('toggle-stream');
  logoHomeButton = document.getElementById('lynx-logo');

  settingsButton = document.getElementById('cam-settings');

  //// SETTINGS SUB MENU
  settings = document.getElementById('settings');

  sendCommandButton = document.getElementById('send-command');
  wifiManager = document.getElementById('wifi-manager');
  command = document.querySelector('.command');
  commandReply = document.getElementById('command-reply');

  //// RC CONTROLS 
  hideRC = document.getElementById('rc-hide');
  settingsRC = document.getElementById('rc-settings');
  controlBox = document.getElementById('control-box');
  rollSlider = document.getElementById("roll-value");
  pitchSlider = document.getElementById("pitch-value");
  yawSlider = document.getElementById("yaw-value");
  fLedSlider = document.getElementById("front-light-brightness");
  hidePeri = document.getElementById('peri-hide');
  settingsPeri = document.getElementById('peripheral-settings');
  rpyResetbuttons = document.querySelectorAll('#rc-settings button');

  ledColorControl = document.querySelectorAll(".circle-button");
  ledModeControl = document.querySelectorAll(".mode-rgb");
  rcPushButtons = document.querySelectorAll(".rc-buttons");

  //// VIDEO
  videoContainer = document.getElementById('video-container');
  video = document.getElementById('video');
  closeButton = document.getElementById('close-stream');
  saveButton = document.getElementById('save-still');
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

  //// CONNECTION 
  overlay = document.querySelector('.overlay');
  connectingCard = document.getElementById('waiting-card');
  connectingMsg = document.getElementById('connection-msg');

  //// WIFI MANAGER 
  wifiConnect = document.getElementById('connect');
  wifiShow = document.getElementById('show-pass');
  wifiScan = document.getElementById('scan');
  wifiCopy = document.getElementById('copy');
  stateMsg = document.getElementById('state');
  wifiManagerCard = document.getElementById('wifi-card');
  password = document.getElementById('pass');
  ssid = document.getElementById('ssidList');

  //// OTHERS
  batteryLevel = document.querySelector('.battery-level');
  versionInfo = document.getElementById('version-info');
  versionInfo.innerText = "Version: " + version;

  /////////////// BUTTON EVENTS
  logoHomeButton.addEventListener('click', () => {
    window.location.reload();
  });
  streamButton.addEventListener('click', toggleStream);
  saveButton.addEventListener('click', handleSaveButtonClick);

  hidePeri.addEventListener('click', handleHidePeripheralSettings);
  hideRC.addEventListener('click', handleHideRCClick);
  closeButton.addEventListener('click', handleCloseButtonClick);

  settingsButton.addEventListener('click', handleSettingsButtonClick);
  sendCommandButton.addEventListener('click', handleSendCommandClick);

  wifiManager.addEventListener('change', handleWifiManagerSwitch);

  //// WIFI MANAGER 
  wifiConnect.addEventListener('click', handleWifiConnectButton);
  wifiShow.addEventListener('click', handleWifiShowButton);
  wifiScan.addEventListener('click', handleWifiScanButton);
  wifiCopy.addEventListener('click', handleWifiCopyButton);

  //// RC CONTROLS
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  rollSlider.addEventListener("input", rollSliderChanged);
  pitchSlider.addEventListener("input", pitchSliderChanged);
  yawSlider.addEventListener("input", yawSliderChanged);

  rpyResetbuttons.forEach(button => {
    button.addEventListener('click', rpyResetHandler);
  });

  rcPushButtons.forEach(button => {
    button.addEventListener("mousedown", controlButtonPressed);
    button.addEventListener("touchstart", controlButtonPressed);
    button.addEventListener("mouseup", controlButtonReleased);
    button.addEventListener("touchend", controlButtonReleased);
  });

  ledColorControl.forEach(button => {
    button.addEventListener("mousedown", ledColorPressed);
    button.addEventListener("touchstart", ledColorPressed);
  });

  ledModeControl.forEach(button => {
    button.addEventListener("mousedown", ledModePressed);
    button.addEventListener("touchstart", ledModePressed);
  });

  fLedSlider.addEventListener("input", frontLedsControl);

  startUpInterface();

})

///////////////////// CAMERA

const stopStream = () => {
  deskpet.stopStreaming();
  window.stop();
  hide(videoContainer);
  notPressed(streamButton);
  sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
}

const startStream = () => {
  deskpet.startStreaming();
  show(videoContainer);
  pressed(streamButton);
  hide(settings);
  show(controlBox);
  notPressed(settingsButton);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

//////////////// TIMED FUNCTIONS

// Function to calculate the charge level in percentage based on the battery voltage
function calculateChargeLevel(batteryVoltage) {
  const minVoltage = 6650; // Estimated minimum voltage (discharged)
  const maxVoltage = 7700; // Estimated maximum voltage (fully charged)
  var batteryLevel = 0;
  if (batteryVoltage === 0) { // Cant communicate with the RP2040
    batteryLevel = -1;
  } else if (batteryVoltage > 0 && batteryVoltage < 3000) { // Batt disconnected or switch off
    batteryLevel = -2;
  } else if (batteryVoltage == 3000) { // Deskpet has been disable due too low battery
    batteryLevel = -3;
  } else {
    const voltageRange = maxVoltage - minVoltage;
    const voltageAboveMin = batteryVoltage - minVoltage;
    const chargeLevel = Math.round((voltageAboveMin / voltageRange) * 100);
    batteryLevel = Math.min(Math.max(chargeLevel, 0), 100); // Ensure it's between 0 and 100
  }
  return batteryLevel;
}

var batteryLevelState = 1;
async function updateBatteryVoltage(extraAttempts) {
  const qresponse = await deskpet.queryBatteryLevel();

  console.log(`Query Battery Level: ${qresponse[1]} STATUS: ${qresponse[0]}`);

  if (qresponse[0] === 0) {
    let chargeLevel = calculateChargeLevel(qresponse[1]);
    if (batteryLevelState !== -3) {
      switch (chargeLevel) {
        case 0:  // Very Low Battery level
          if (batteryLevelState !== 0) {
            batteryLevelState = 0;
            alertMessage("Low battery level", "Please connect DeskPet to the power supply, battery level is too low");
          }
          break;
        case -1: // Cant communicate with the RP2040
          if (batteryLevelState !== -1) {
            batteryLevelState = -1;
          } else {
            alertMessage("Alert", "A communication issue was found in DeskPet when reading the battery voltage, please restart it by turning OFF and ON the power switch");
          }
          break;
        case -2: // Batt disconnected or switch off
          if (batteryLevelState !== -2) {
            batteryLevelState = -2;
            alertMessage("Alert", "Error reading the battery voltage, it is disconnected or DeskPet is switched off.");
          }
          break;
        case -3: // Deskpet has been disable due too low battery
          batteryLevelState = -3;
          await waitMessage(sleep, "Voltage too low", "DeskPet has been disabled due to low battery voltage. Please turn off the power switch and connect it to the power supply", "The interface has been blocked", [0]);
          break;
        default:
          break;
      }
    }

    let alertLevel = 20,
      warnLevel = 60;

    if (chargeLevel >= alertLevel && chargeLevel <= warnLevel) {
      batteryLevel.classList.remove('alert');
      batteryLevel.classList.add('warn');
    } else if (chargeLevel < alertLevel) {
      batteryLevel.classList.remove('warn');
      batteryLevel.classList.add('alert');
    } else {
      batteryLevel.classList.remove('warn', 'alert');
    }
    batteryLevel.style.height = `${chargeLevel}%`;

  } else if (extraAttempts > 0) {
    console.log("Retrying...");
    await sleep(2000);
    await updateBatteryVoltage(extraAttempts - 1);

  } else {
    console.log("Error querying Voltage");
  }
}

/////////////////////// BUTTON HANDLERS

////// WIFI MANAGER

async function handleWifiManagerSwitch() {
  if (wifiManager.checked) {
    // Perform actions when the button is pressed
    show(wifiManagerCard);

    hide(controlBox);
    notPressed(settingsButton);
    hide(settings);

    disable(streamButton);

    const result = await deskpet.queryCurrentNetwork();
    //////
    if (result[0] === RESPONSE.OK) {
      const msg = result[1];
      if (msg[0] === "1") {
        robotState.IP = msg[2];
        robotState.SSID = msg[1];
        stateMsg.innerHTML = "DeskPet is connected to " + "\"" + msg[1] + "\"" + " network with IP: " + msg[2];
        wifiCopy.classList.remove("hidden");
      } else {
        stateMsg.innerHTML = "DeskPet could no connect to " + "\"" + msg[1] + "\"" + " network";
        wifiCopy.classList.add("hidden");
      }
    }
    ///////
  } else {
    // Perform actions when the button is not pressed
    hide(wifiManagerCard);
    enable(streamButton);
  }


}

function showConnectionStatus() {
  if (robotState.IP === "192.168.0.1") {
    stateMsg.innerHTML = "You are connected to the WIFI DeskPet with IP 192.168.0.1";
    wifiCopy.classList.add("hidden");
  } else if (robotState.IP !== "0.0.0.0") {
    stateMsg.innerHTML = "DeskPet is connected to " + "\"" + robotState.SSID + "\"" + " network with IP: " + robotState.IP;
    wifiCopy.classList.remove("hidden");
  } else {
    stateMsg.innerHTML = "DeskPet could no connect to " + "\"" + robotState.SSID + "\"" + " network";
    wifiCopy.classList.add("hidden");
  }
}

async function handleWifiConnectButton() {
  const selected_network = ssid.options[ssid.selectedIndex].text;
  const pass = password.value;
  if (selected_network === "Select your network") {
    alertMessage("Error", "Please scan available networks first");
  } else if (selected_network === "") {
    alertMessage("Error", "No available network found. Please try again");
  } else {
    deskpet.configNetwork(selected_network, pass);
    await waitMessage(sleep, "Connecting", "Please wait, DeskPet will be restarted...", "", [4000]);
    await waitMessage(sleep, "Connecting", "Please connect your device to the desired wifi network...", "", [5000]);
    location.reload();
  }
}

async function handleWifiScanButton() {
  const result = await waitMessage(deskpet.scanNetworks, "Scanning", "Please wait while DeskPet scans for available networks");

  if (result[0] === RESPONSE.OK) {
    const ssids = [];
    const signal = [];
    const msg = result[1];
    if (msg[0] === '0') {
      alertMessage("Error", "No available network found. Please try again");
    } else {
      for (let i = 1; i < msg.length; i += 2) {
        if (msg[i]) {
          ssids.push(msg[i]);
          signal.push(msg[i + 1]);
        }
      }

      let networksAvailable;

      ssids.forEach((item, index) => {
        networksAvailable += `<option value="${index}">${item}</option>`;
      });
      ssid.innerHTML = networksAvailable;
    }
    showConnectionStatus();
  } else {
    stateMsg.innerText = "Error| TIMEOUT";
  }
}

function handleWifiCopyButton() {
  console.log(robotState.IP);
  copyToClipboard(robotState.IP);
  alertMessage("IP address copied", robotState.IP + " Copied");
}

function copyToClipboard(text) {
  // Crea un elemento de texto temporal
  const tempElement = document.createElement('textarea');
  tempElement.value = text;
  document.body.appendChild(tempElement);

  // Selecciona y copia el texto
  tempElement.select();
  document.execCommand('copy');

  // Remueve el elemento temporal
  document.body.removeChild(tempElement);
}

function handleWifiShowButton() {
  var x = document.getElementById("pass");
  if (x.type === "text") {
    x.type = "password";
    wifiShow.innerText = "Show";
  } else {
    x.type = "text";
    wifiShow.innerText = "Hide";
  }
}

function toggleStream() {
  if (isPressed(streamButton)) {
    stopStream();
    if (!saveButton.hidden) {
      hide(saveButton);
    }
  } else {
    startStream();
  }
}

function handleSaveButtonClick() {
  try {
    var dataURL = canvas.toDataURL('image/jpeg', 1.0);
    saveButton.href = dataURL;
    var d = new Date();
    saveButton.download = d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2) + ("0" + d.getHours()).slice(-2) + ("0" + d.getMinutes()).slice(-2) + ("0" + d.getSeconds()).slice(-2) + ".jpg";
  } catch (e) {
    console.error(e);
  }
  hide(saveButton);
  stopStream();
  sleep(1000).then(() => { startStream() });
}

// Function to handle the click event of the "Hide/Show RC" button
function handleHideRCClick() {
  if (!isPressed(hideRC)) {
    if (isPressed(hidePeri)) {
      notPressed(hidePeri);
      hide(settingsPeri);
    }
    // Perform actions when the button is pressed to hide the RC
    pressed(hideRC);
    show(settingsRC);
  } else {
    // Perform actions when the button is pressed to show the RC
    notPressed(hideRC);
    hide(settingsRC);
  }
}

// Function to handle the click event of the "Hide/Show Peripheral" button
function handleHidePeripheralSettings() {
  if (!isPressed(hidePeri)) {
    // Perform actions when the button is pressed to hide the Peripheral
    pressed(hidePeri);
    show(settingsPeri);
  } else {
    // Perform actions when the button is pressed to show the Peripheral
    notPressed(hidePeri);
    hide(settingsPeri);
  }
}

// Function to handle the click event of the "Close" button
function handleCloseButtonClick() {
  // Stop the stream and perform actions to hide elements
  if (isPressed(streamButton)) {
    stopStream();
    if (!saveButton.hidden) {
      hide(saveButton);
    }
  }
}

// Function to handle the click event of the "Settings" button
function handleSettingsButtonClick() {
  if (!isPressed(settingsButton)) {
    if(isPressed(streamButton)){
      stopStream();
    }
    pressed(settingsButton);
    show(settings);
    hide(controlBox);
  } else {
    // Perform actions when the button is not pressed
    notPressed(settingsButton);
    hide(settings);

    // Clean send command form output
    commandReply.querySelector('span').innerHTML = "";
    commandReply.querySelector('div').innerHTML = "";
    show(controlBox);
  }
}

// Function to handle the click event for the 'send-command' button
async function handleSendCommandClick() {
  let startChar = "#"
  if (command.value[0] === startChar) {
    startChar = "";
  }
  const result = await deskpet.sendMsg(startChar + command.value + "\r");
  const stat = commandReply.querySelector('span');
  const ans = commandReply.querySelector('div');
  console.log(result);
  if (result[0] === RESPONSE.OK) {
    if (result[1]) {
      ans.innerHTML = "Reply: " + result[1];
    } else {
      ans.innerHTML = "";
    }
  } else {
    ans.innerHTML = "";
  }
  stat.innerHTML = "Status: " + RESPONSE.decode(result[0]);
}

/////////////////////// RC MODE VARIABLES AND FUNCTIONS

const rpySteps = 5; //degrees
const xyzSteps = 5; //mm
const pLightSteps = 20; //%

const maxHeight = 130; //mm
const minHeight = 60;  //mm

////// KEYBOARD CONTROLS

const keyFlags = {
  'Forward': false,
  'Left': false,
  'Backward': false,
  'Right': false,
  'RotateCCW': false,
  'RotateCW': false,
  'ppHeight': false,
  'ppRoll': false,
  'ppPitch': false,
  'ppYaw': false,
  'ppFLEDs': false,
  'mmHeight': false,
  'mmRoll': false,
  'mmPitch': false,
  'mmYaw': false,
  'mmFLEDs': false,
  'Buzzer': false
};

function calculateAngle() {
  let y = keyFlags.Forward - keyFlags.Backward;
  let x = keyFlags.Right - keyFlags.Left;
  if (x === 0 && y === 0) {
    return 0;
  }
  const radians = Math.atan2(y, x);
  let degrees = radians * (180 / Math.PI);
  if (degrees <= 0) {
    degrees += 360;
  }
  return degrees;
}

function onKeyUp(event) {
  console.log("Key Released");
  switch (event.key) {
    case 'W':
    case 'w':
    case 'ArrowUp':
      console.log('Forward');
      keyFlags.Forward = false;
      robotState.Walking = calculateAngle();
      deskpet.walk(robotState.Walking);
      break;
    case 'A':
    case 'a':
    case 'ArrowLeft':
      console.log('Strafe left');
      keyFlags.Left = false;
      robotState.Walking = calculateAngle();
      deskpet.walk(robotState.Walking);
      break;
    case 'S':
    case 's':
    case 'ArrowDown':
      console.log('Backward');
      keyFlags.Backward = false;
      robotState.Walking = calculateAngle();
      deskpet.walk(robotState.Walking);
      break;
    case 'D':
    case 'd':
    case 'ArrowRight':
      console.log('Strafe right');
      keyFlags.Right = false;
      robotState.Walking = calculateAngle();
      deskpet.walk(robotState.Walking);
      break;
    case 'Q':
    case 'q':
      if (keyFlags.RotateCW) {
        deskpet.rotationCW();
        robotState.Rotation = 1;
        console.log('Rotate CCW');
      }
      else {
        deskpet.stopRotation();
        robotState.Rotation = 0;
        console.log('STOP Rotate CCW');
      }
      keyFlags.RotateCCW = false;
      break;
    case 'E':
    case 'e':
      if (keyFlags.RotateCCW) {
        deskpet.rotationCCW();
        robotState.Rotation = -1;
        console.log('Rotate CW');
      }
      else {
        deskpet.stopRotation();
        robotState.Rotation = 0;
        console.log('STOP Rotate CW');
      }
      keyFlags.RotateCW = false;
      break;
    case 'R':
    case 'r':
      console.log('Go up');
      keyFlags.ppHeight = false;
      break;
    case 'F':
    case 'f':
      console.log('Go down');
      keyFlags.mmHeight = false;
      break;
    case 'T':
    case 't':
      console.log('Roll (-)');
      keyFlags.mmRoll = false;
      break;
    case 'G':
    case 'g':
      console.log('Roll (+)');
      keyFlags.ppRoll = false;
      break;
    case 'Y':
    case 'y':
      console.log('Pitch (-)');
      keyFlags.mmPitch = false;
      break;
    case 'H':
    case 'h':
      console.log('Pitch (+)');
      keyFlags.ppPitch = false;
      break;
    case 'U':
    case 'u':
      console.log('Yaw (-)');
      keyFlags.mmYaw = false;
      break;
    case 'J':
    case 'j':
      console.log('Yaw (+)');
      keyFlags.ppYaw = false;
      break;
    case 'B':
    case 'b':
      console.log('Speak (piezo)');
      keyFlags.Buzzer = false;
      break;
    case 'P':
    case 'p':
      console.log('Frontal LEDs (+)');
      keyFlags.ppFLEDs = false;
      break;
    case 'M':
    case 'm':
      console.log('Frontal LEDs (-)');
      keyFlags.mmFLEDs = false;
      break;
    default:
      break;
  }
}

function onKeyDown(event) {
  //console.log("Key Pressed");
  //Block the keyboard when a text entry is available in the interface 
  if (isPressed(settingsButton) || wifiManager.checked) {
    return;
  }

  if (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'i')) {
    // Prevent the default behavior (opening the developer tools)
    event.preventDefault();
  }

  switch (event.key) {
    case 'W':
    case 'w':
    case 'ArrowUp':
      if (keyFlags.Forward) {
        return;
      }
      console.log('Forward');
      keyFlags.Forward = true;
      robotState.Walking = calculateAngle();
      deskpet.walk(robotState.Walking);
      break;
    case 'A':
    case 'a':
    case 'ArrowLeft':
      if (keyFlags.Left) {
        return;
      }
      console.log('Strafe left');
      keyFlags.Left = true;
      robotState.Walking = calculateAngle();
      deskpet.walk(robotState.Walking);
      break;
    case 'S':
    case 's':
    case 'ArrowDown':
      if (keyFlags.Backward) {
        return;
      }
      console.log('Backward');
      keyFlags.Backward = true;
      robotState.Walking = calculateAngle();
      deskpet.walk(robotState.Walking);
      break;
    case 'D':
    case 'd':
    case 'ArrowRight':
      if (keyFlags.Right) {
        return;
      }
      console.log('Strafe right');
      keyFlags.Right = true;
      robotState.Walking = calculateAngle();
      deskpet.walk(robotState.Walking);
      break;
    case 'Q':
    case 'q':
      if (keyFlags.RotateCW || robotState.Rotation === 1) {
        deskpet.stopRotation();
        robotState.Rotation = 0;
        console.log('STOP Rotate CCW');
      }
      else if (!keyFlags.RotateCCW) {
        deskpet.rotationCCW();
        robotState.Rotation = -1;
        console.log('Rotate CCW');
      }
      keyFlags.RotateCCW = true;
      break;
    case 'E':
    case 'e':
      if (keyFlags.RotateCCW || robotState.Rotation === -1) {
        deskpet.stopRotation();
        robotState.Rotation = 0;
        console.log('STOP Rotate CW');
      }
      else if (!keyFlags.RotateCW) {
        deskpet.rotationCW();
        robotState.Rotation = 1;
        console.log('Rotate CW');
      }
      keyFlags.RotateCW = true;
      break;
    case 'X':
    case 'x':
      if (robotState.Sequence == MOVES.UP) {
        return;
      }
      console.log('Stand up');
      robotState.Sequence = MOVES.UP;
      deskpet.setMove(MOVES.UP);
      break;
    case 'Z':
    case 'z':
      if (robotState.Sequence == MOVES.SIT) {
        return;
      }
      console.log('Sit');
      robotState.Sequence = MOVES.SIT;
      deskpet.setMove(MOVES.SIT);
      break;
    case 'L':
    case 'l':
      if (robotState.Sequence == MOVES.LAY) {
        return;
      }
      console.log('Lay down');
      robotState.Sequence = MOVES.LAY;
      deskpet.setMove(MOVES.LAY);
      break;
    case 'R':
    case 'r':
      if (keyFlags.mmHeight || keyFlags.ppHeight) {
        return;
      }
      console.log('Go up');
      robotState.Z = limitToRange(robotState.Z += rpySteps, minHeight, maxHeight);
      deskpet.zAxisDisp(robotState.Z);
      keyFlags.ppHeight = true;
      break;
    case 'F':
    case 'f':
      if (keyFlags.mmHeight || keyFlags.ppHeight) {
        return;
      }
      console.log('Go down');
      robotState.Z = limitToRange(robotState.Z -= rpySteps, minHeight, maxHeight);
      deskpet.zAxisDisp(robotState.Z);
      keyFlags.mmHeight = true;
      break;
    case 'T':
    case 't':
      if (keyFlags.mmRoll || keyFlags.ppRoll) {
        return;
      }
      console.log('Roll (-)');
      robotState.Roll = limitToRange(robotState.Roll -= rpySteps, parseInt(rollSlider.min), parseInt(rollSlider.max));
      deskpet.roll(robotState.Roll);
      rollSlider.value = robotState.Roll;
      keyFlags.mmRoll = true;
      break;
    case 'G':
    case 'g':
      if (keyFlags.mmRoll || keyFlags.ppRoll) {
        return;
      }
      console.log('Roll (+)');
      robotState.Roll = limitToRange(robotState.Roll += rpySteps, parseInt(rollSlider.min), parseInt(rollSlider.max));
      deskpet.roll(robotState.Roll);
      rollSlider.value = robotState.Roll;
      keyFlags.ppRoll = true;
      break;
    case 'Y':
    case 'y':
      if (keyFlags.mmPitch || keyFlags.ppPitch) {
        return;
      }
      console.log('Pitch (-)');
      robotState.Pitch = limitToRange(robotState.Pitch -= rpySteps, parseInt(pitchSlider.min), parseInt(pitchSlider.max));
      deskpet.pitch(robotState.Pitch);
      pitchSlider.value = robotState.Pitch;
      keyFlags.mmPitch = true;
      break;
    case 'H':
    case 'h':
      if (keyFlags.mmPitch || keyFlags.ppPitch) {
        return;
      }
      console.log('Pitch (+)');
      robotState.Pitch = limitToRange(robotState.Pitch += rpySteps, parseInt(pitchSlider.min), parseInt(pitchSlider.max));
      deskpet.pitch(robotState.Pitch);
      pitchSlider.value = robotState.Pitch;
      keyFlags.ppPitch = true;
      break;
    case 'U':
    case 'u':
      if (keyFlags.mmYaw || keyFlags.ppYaw) {
        return;
      }
      console.log('Yaw (-)');
      robotState.Yaw = limitToRange(robotState.Yaw -= rpySteps, parseInt(yawSlider.min), parseInt(yawSlider.max));
      deskpet.yaw(robotState.Yaw);
      yawSlider.value = robotState.Yaw;
      keyFlags.mmYaw = true;
      break;
    case 'J':
    case 'j':
      if (keyFlags.ppYaw || keyFlags.mmYaw) {
        return;
      }
      console.log('Yaw (+)');
      robotState.Yaw = limitToRange(robotState.Yaw += rpySteps, parseInt(yawSlider.min), parseInt(yawSlider.max));
      deskpet.yaw(robotState.Yaw);
      yawSlider.value = robotState.Yaw;
      keyFlags.ppYaw = true;
      break;
    case 'C':
    case 'c':
      if (robotState.Sequence == MOVES.WIGGLE) {
        return;
      }
      console.log('Wag tail');
      robotState.Sequence = MOVES.WIGGLE;
      deskpet.setMove(MOVES.WIGGLE);
      break;
    case 'V':
    case 'v':
      if (robotState.Sequence == MOVES.PAW) {
        return;
      }
      console.log('Give paw');
      robotState.Sequence = MOVES.PAW;
      deskpet.setMove(MOVES.PAW);
      break;
    case 'B':
    case 'b':
      if (keyFlags.Buzzer) {
        return;
      }
      console.log('Speak (piezo)');
      deskpet.setBuzzer(800, 150);
      keyFlags.Buzzer = true;
      break;
    case 'P':
    case 'p':
      if (keyFlags.mmFLEDs || keyFlags.ppFLEDs) {
        return;
      }
      console.log('Frontal LEDs (+)');
      robotState.Leds = limitToRange(robotState.Leds += pLightSteps, 0, 100);
      deskpet.setFrontLight(robotState.Leds);
      keyFlags.ppFLEDs = true;
      break;
    case 'M':
    case 'm':
      if (keyFlags.mmFLEDs || keyFlags.ppFLEDs) {
        return;
      }
      console.log('Frontal LEDs (-)');
      robotState.Leds = limitToRange(robotState.Leds -= pLightSteps, 0, 100);
      deskpet.setFrontLight(robotState.Leds);
      keyFlags.mmFLEDs = true;
      break;
    default:
      //console.log('Key not recognized');
      break;
  }
}

////// RC MODE SCREEN CONTROLS

var robotState = {
  "Walking": 0,
  "Rotation": 0, //-1: CCW, 0: STOP, 1: CW
  "Speed": 4,
  "Roll": 0,
  "Pitch": 0,
  "Yaw": 0,
  "XB": 0,
  "X": 0,
  'Y': 0,
  'Z': parseInt((maxHeight + minHeight) / 2),
  'Sequence': MOVES.UP,
  'Leds': 0,
  'Mode': false, // 0: RC, 1: AUTO 
  'Device': false, // 0: Mobile, 1: PC
  'Assembly': false, // 
  'JointsOffsetLoaded': false, // Flag to indicate if the joint offset tablet was updated correctly
  'IP': '0.0.0.0' //IPv4 address used in the last connection
}

var rcButtonRefreshTime = 500; //ms

function rpyResetHandler() {
  // Get the id of the clicked button
  const buttonId = this.id;

  // Reset the value of the corresponding slider
  switch (buttonId) {
    case 'reset-roll':
      rollSlider.value = 0;
      rollSliderChanged();
      break;
    case 'reset-pitch':
      pitchSlider.value = 0;
      pitchSliderChanged();
      break;
    case 'reset-yaw':
      yawSlider.value = 0;
      yawSliderChanged();
      break;
    default:
      break;
  }
}

var rollButtonTimer;
function rollSliderChanged() {
  robotState.Roll = parseInt(rollSlider.value);
  if (!rollButtonTimer) {
    rollButtonTimer = setTimeout(() => {
      deskpet.roll(robotState.Roll);
      rollButtonTimer = null;
    }, rcButtonRefreshTime);
  }
}

var pitchButtonTimer;
function pitchSliderChanged() {
  robotState.Pitch = parseInt(pitchSlider.value);
  if (!pitchButtonTimer) {
    pitchButtonTimer = setTimeout(() => {
      deskpet.pitch(robotState.Pitch);
      pitchButtonTimer = null;
    }, rcButtonRefreshTime);
  }
}

var yawButtonTimer;
function yawSliderChanged() {
  robotState.Yaw = parseInt(yawSlider.value);
  if (!yawButtonTimer) {
    yawButtonTimer = setTimeout(() => {
      deskpet.yaw(robotState.Yaw);
      yawButtonTimer = null;
    }, rcButtonRefreshTime);
  }
}

var frontLedsControlTimer;
function frontLedsControl() {
  if (!frontLedsControlTimer) {
    frontLedsControlTimer = setTimeout(() => {
      deskpet.setFrontLight(parseInt(fLedSlider.value));
      frontLedsControlTimer = null;
    }, rcButtonRefreshTime);
  }
}

function ledModePressed(event) {
  deskpet.setLEDBlinking(event.target.id);
}

function ledColorPressed(event) {
  const pressedColor = event.target;
  deskpet.setLEDColor(pressedColor.style.backgroundColor);
}


let walkButtonsDebounceTimer;
const debounceDelay = 30;

function controlButtonReleased(event) {
  clearTimeout(walkButtonsDebounceTimer); // Clear any existing timer
  walkButtonsDebounceTimer = setTimeout(() => {
    console.log("released: " + event.target.id);
    if (event.target.id === "leftButton" || event.target.id === "rightButton") {
      robotState.Rotation = 0;
      deskpet.stopRotation();
    }
    walkButtonsDebounceTimer = null;
  }, debounceDelay);
}

function controlButtonPressed(event) {
  clearTimeout(walkButtonsDebounceTimer); // Clear any existing timer
  walkButtonsDebounceTimer = setTimeout(() => {
    console.log("pressed: " + event.target.id);
    if (event.target.id === "upButton") {
      robotState.Z = limitToRange(robotState.Z += xyzSteps, minHeight, maxHeight);
      deskpet.zAxisDisp(robotState.Z);
    } else if (event.target.id === "leftButton") {
      if (robotState.Rotation === 0) {
        deskpet.rotationCCW();
        robotState.Rotation = -1;
      }
    } else if (event.target.id === "rightButton") {
      if (robotState.Rotation === 0) {
        deskpet.rotationCW();
        robotState.Rotation = 1;
      }
    } else if (event.target.id === "downButton") {
      robotState.Z = limitToRange(robotState.Z -= xyzSteps, minHeight, maxHeight);
      deskpet.zAxisDisp(robotState.Z);
    } else if (event.target.id === "heightButton") {
      robotState.Z = 90;
      deskpet.zAxisDisp(90);
    }
    walkButtonsDebounceTimer = null;
  }, debounceDelay);
}

let joistickReleased = true;
function readJoystick() {
  const motion = joystick.getState();
  if (keyFlags.Forward || keyFlags.Backward || keyFlags.Right || keyFlags.Left) {
    return;
  }
  if (motion.angle !== 0) { // Joystick is pressed
    joistickReleased = false;
    const speed = motion.speed === 0 ? 1 : motion.speed;
    if (motion.angle !== robotState.Walking) {
      robotState.Walking = motion.angle;
      deskpet.walk(motion.angle, speed);
    }
  } else if (!joistickReleased) { // Joystick is not pressed
    joistickReleased = true;
    robotState.Walking = 0;
    deskpet.walk(0);
  }
}