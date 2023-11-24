import { MOVES, COLORS, MODES, RESPONSE, MotionRegister, deskpet } from "./communication.js"
import { JoystickController } from "./joystic.js";
import { alertMessage, hide, show, sleep, checkIfValidIP, limitToRange, enable, disable, pressed, notPressed, isPressed, isEnable, waitMessage } from "./utils.js"
import { getHeaderIAButtons, faceSettings, ballButton, signdetButton, objdetButton, facedetButton, enrollButton, recogButton } from "./AI.js";

const baseHost = document.location.origin;
var espIP;
var joystick;

var statusInterval;
var joysticReading;

//// HEADER
var streamButton,
  stillButton;

//// RC CONTROLS 
var hideRC,
  settingsRC,
  rollSlider,
  pitchSlider,
  yawSlider;

//// VIDEO
var videoContainer,
  video,
  closeButton,
  saveButton,
  canvas,
  ctx;

var rcButton,
  settingsButton,
  infoButton,
  rcPushButtons;

//// SETTINGS SUB MENU
var settings,
  assemblySwitch,
  modeSwitch,
  command,
  commandReply;

var controlBox;
var sendCommandButton;
var information;
var batteryLevel;

//// Assembly
var assemblyTutorial,
  assemblyStepList,
  nextButton,
  backButton,
  finishButton,
  plusButtons,
  minusButtons;

//// CONNECTION VARIABLES
var saveIpButton,
  overlay,
  connectingCard,
  enterIpCard,
  ipAddressInput,
  ipValidation,
  connectingMsg;


//////////////// IP REQUEST FUNCTIONS
function handleSaveIPButtonClick() {
  espIP = ipAddressInput.value;
  if (checkIfValidIP(espIP)) {
    enterIpCard.classList.add("hidden");
    startUpInterface();
  } else {
    ipValidation.innerText = "Invalid IP";
  }
}


////  Initializes the interface fucntions.
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

  // Set an interval to update the battery voltage every 60 seconds.
  updateBatteryVoltage(1);
  statusInterval = setInterval(() => {
    updateBatteryVoltage(1); // Keep the battery level updated
  }, 60000);

  // Hide the overlay once the connection is established.
  overlay.style.display = 'none';
  connectingCard.classList.add("hidden");

  // Initialize the joystick controller.
  joystick = new JoystickController("stick", 35, 8);

  // Start the main loop.
  loop();

}

async function loop() {

  //console.log(motion);
  await sleep(500);
  requestAnimationFrame(loop);

}


document.addEventListener('DOMContentLoaded', function (event) {

  /////////////// ELEMENT VARIABLES

  getHeaderIAButtons();

  //// HEADER BUTTONS
  streamButton = document.getElementById('toggle-stream');
  stillButton = document.getElementById('get-still');

  rcButton = document.getElementById('rc-control');
  settingsButton = document.getElementById('cam-settings');
  infoButton = document.getElementById('info');

  //// SETTINGS SUB MENU
  settings = document.getElementById('settings');

  sendCommandButton = document.getElementById('send-command');

  modeSwitch = document.getElementById('control-mode');
  assemblySwitch = document.getElementById('assembly');
  command = document.querySelector('.command');
  commandReply = document.getElementById('command-reply');

  //// ASSEMBLY  
  assemblyTutorial = document.getElementById("assembly-tutorial");
  assemblyStepList = assemblyTutorial.querySelectorAll(".step-card");
  nextButton = document.getElementById('next-button');
  backButton = document.getElementById('back-button');
  finishButton = document.getElementById('finish-button');
  plusButtons = document.querySelectorAll(".plus-button");
  minusButtons = document.querySelectorAll(".minus-button");

  //// RC CONTROLS 
  hideRC = document.getElementById('rc-hide');
  settingsRC = document.getElementById('rc-settings');
  controlBox = document.getElementById('control-box');
  rollSlider = document.getElementById("roll-value");
  pitchSlider = document.getElementById("pitch-value");
  yawSlider = document.getElementById("yaw-value");

  rcPushButtons = document.querySelectorAll(".rc-buttons");

  //// VIDEO
  videoContainer = document.getElementById('video-container');
  video = document.getElementById('video');
  closeButton = document.getElementById('close-stream');
  saveButton = document.getElementById('save-still');
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

  //// CONNECTION 
  saveIpButton = document.getElementById('submit-ip');
  overlay = document.querySelector('.overlay');
  connectingCard = document.getElementById('waiting-card');
  enterIpCard = document.getElementById('enterIP-card');
  ipAddressInput = document.getElementById('ip-address');
  ipValidation = document.getElementById('ip-address-valid');
  connectingMsg = document.getElementById('connection-msg');

  //// OTHERS
  information = document.getElementById('information');
  batteryLevel = document.querySelector('.battery-level');

  /////////////// BUTTON EVENTS
  streamButton.addEventListener('click', toggleStream);
  stillButton.addEventListener('click', handleCaptureImageClick);
  saveButton.addEventListener('click', handleSaveButtonClick);
  infoButton.addEventListener('click', handleInfoButtonClick);

  hideRC.addEventListener('click', handleHideRCClick);
  closeButton.addEventListener('click', handleCloseButtonClick);

  settingsButton.addEventListener('click', handleSettingsButtonClick);
  rcButton.addEventListener('click', handleRCButtonClick);
  sendCommandButton.addEventListener('click', handleSendCommandClick);
  saveIpButton.addEventListener('click', handleSaveIPButtonClick);

  //// ASSEMBLY
  nextButton.addEventListener('click', handleAssemblyNexStepButton);
  backButton.addEventListener('click', handleAssemblyBackButton);
  finishButton.addEventListener('click', handleAssemblyFinishButton);
  plusButtons.forEach(function (button) { button.addEventListener("click", handleCalibratePlusButton) });
  minusButtons.forEach(function (button) { button.addEventListener("click", handleCalibrateMinusButton) });

  modeSwitch.addEventListener('change', handleModeSwitch);
  assemblySwitch.addEventListener('change', handleAssemblyMode);

  rollSlider.addEventListener("input", rollSliderChanged);
  pitchSlider.addEventListener("input", pitchSliderChanged);
  yawSlider.addEventListener("input", yawSliderChanged);

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);


  rcPushButtons.forEach(button => {
    button.addEventListener("mousedown", controlButtonPressed);
    button.addEventListener("touchstart", controlButtonPressed);
    button.addEventListener("mouseup", controlButtonReleased);
    button.addEventListener("touchend", controlButtonReleased);
  });

})

///////////////////// CAMERA

const stopStream = () => {
  deskpet.stopStreaming();
  window.stop();
  hide(videoContainer);
  notPressed(streamButton);
  disable(stillButton);
  disable(ballButton);
  disable(signdetButton);
  disable(objdetButton);
  disable(facedetButton);
  disable(recogButton);
  disable(enrollButton);
  hide(faceSettings);
  sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
}

const startStream = () => {
  deskpet.startStreaming();
  show(videoContainer);
  pressed(streamButton);
  hide(settings);
  notPressed(settingsButton);
  enable(stillButton);
  enable(ballButton);
  enable(signdetButton);
  enable(objdetButton);
  enable(facedetButton);
  enable(enrollButton);
  enable(recogButton);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

//////////////// TIMED FUNCTIONS

async function updateBatteryVoltage(extraAttempts) {
  const qresponse = await deskpet.queryBatteryLevel();

  console.log(`Query Battery Level: ${qresponse[1]} STATUS: ${qresponse[0]}`);

  if (qresponse[0] === 0) {

    let alertLevel = 20,
      warnLevel = 60;

    if (qresponse[1] >= alertLevel && qresponse[1] <= warnLevel) {
      batteryLevel.classList.remove('alert');
      batteryLevel.classList.add('warn');
    } else if (qresponse[1] < alertLevel) {
      batteryLevel.classList.remove('warn');
      batteryLevel.classList.add('alert');
    } else {
      batteryLevel.classList.remove('warn', 'alert');
    }
    batteryLevel.style.height = `${qresponse[1]}%`;

  } else if (extraAttempts > 0) {
    console.log("Retrying...");
    await sleep(2000);
    await updateBatteryVoltage(extraAttempts - 1);

  } else {
    console.log("Error querying Voltage");
  }
}

/////////////////////// BUTTON HANDLERS

function toggleStream() {
  if (isPressed(streamButton)) {
    stopStream();
    if (!saveButton.hidden) {
      hide(saveButton);
      disable(stillButton)
    }
  } else {
    startStream();
  }
}

function handleCaptureImageClick() {
  pressed(stillButton);
  canvas.width = video.naturalWidth;
  canvas.height = video.naturalHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  show(videoContainer);
  show(saveButton);
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

// Function to handle the click event of the "Information" button
function handleInfoButtonClick() {
  if (infoButton.innerHTML === '<i class="bi-info-circle"></i>') {
    // Perform actions when the button is pressed
    pressed(infoButton);
    show(information);
    enrollButton.innerHTML = '<i class="bi-person-plus"></i>';
    hide(faceSettings);
    if (isPressed(rcButton)) {
      notPressed(rcButton);
    }
    hide(controlBox);
    notPressed(settingsButton);
    hide(settings);
  } else {
    // Perform actions when the button is not pressed
    notPressed(infoButton);
    hide(information);
  }
}

// Function to handle the click event of the "Hide/Show RC" button
function handleHideRCClick() {
  if (hideRC.innerHTML === '<i class="bi-arrow-bar-right"></i>') {
    // Perform actions when the button is pressed to hide the RC
    hideRC.innerHTML = '<i class="bi-arrow-bar-left"></i>';
    hide(settingsRC);
  } else {
    // Perform actions when the button is pressed to show the RC
    hideRC.innerHTML = '<i class="bi-arrow-bar-right"></i>';
    show(settingsRC);
  }
}

// Function to handle the click event of the "Close" button
function handleCloseButtonClick() {
  // Stop the stream and perform actions to hide elements
  if (!saveButton.hidden) {
    hide(saveButton);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    notPressed(stillButton);
  } else {
    hide(videoContainer);
    stopStream();
  }
}

// Function to handle the click event of the "Settings" button
function handleSettingsButtonClick() {
  if (!isPressed(settingsButton)) {
    // Perform actions when the button is pressed to show settings
    if (isPressed(streamButton)) {
      stopStream();
    }

    if (isPressed(rcButton)) {
      notPressed(rcButton);
    }
    if (isPressed(infoButton)) {
      notPressed(infoButton);
    }

    pressed(settingsButton);
    show(settings);
    hide(controlBox);
    hide(faceSettings);
    hide(information);
  } else {
    // Perform actions when the button is not pressed
    notPressed(settingsButton);
    hide(settings);

    // Clean send command form output
    commandReply.querySelector('span').innerHTML = "";
    commandReply.querySelector('div').innerHTML = "";

  }
}

// Function to handle the click event of the "Remote Control" button
function handleRCButtonClick() {
  if (isPressed(rcButton)) {
    // Perform actions when the button is not pressed
    notPressed(rcButton);
    hide(controlBox);
    hide(settingsRC);
    clearInterval(joysticReading);
  } else {
    // Perform actions when the button is pressed
    pressed(rcButton);
    show(controlBox);
    show(settingsRC);
    hide(settings);
    notPressed(settingsButton);
    hide(information);
    notPressed(infoButton);
    joysticReading = setInterval(readJoystick, rcButtonRefreshTime);
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

// Add a change event listener to detect when the Control Mode changes
function handleModeSwitch() {
  robotState.Mode = modeSwitch.checked;
}

//////////////////// ASSEMBLY MODE 

var jointOffsets = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];

var assemblyStepCounter = 0;

function updateJointOffsetTable() {
  var span;
  var leg = 1;
  var joint = 1;
  for (leg = 1; leg <= 4; leg++) {
    for (joint = 1; joint <= 3; joint++) {
      span = document.getElementById(leg.toString() + joint.toString()).querySelector('.value');
      span.innerHTML = jointOffsets[leg - 1][joint - 1];
    }
  }
}

var conter_leg_offset = 1;
var conter_joint_offset = 1;
async function loadJointsOffset() {
  var qresponse;
  var counter = 1;
  const attempts = 2;

  while (conter_leg_offset <= 4) {
    while (conter_joint_offset <= 3) {
      qresponse = await deskpet.queryJointOffset(conter_leg_offset, conter_joint_offset);
      if (qresponse[0] === RESPONSE.OK) {
        jointOffsets[conter_leg_offset - 1][conter_joint_offset - 1] = qresponse[1];
        conter_joint_offset += 1;
        counter = 1;
      }
      else if (attempts > counter) {
        counter += 1;
      } else {
        robotState.JointsOffsetLoaded = false;
        return false;
      }
      await sleep(5);
    }
    conter_joint_offset = 1;
    conter_leg_offset += 1;
  }

  robotState.JointsOffsetLoaded = true;
  return true;
}

async function handleAssemblyMode() {
  var count = 0;
  const attempts = 3;

  robotState.Assembly = assemblySwitch.checked;
  if (robotState.Assembly) {
    disable(ballButton);
    disable(signdetButton);
    disable(objdetButton);
    disable(facedetButton);
    disable(recogButton);
    disable(rcButton);
    disable(streamButton);
    hide(settings);
    notPressed(settingsButton);

    showAssemblySteps();
    
    if (!robotState.JointsOffsetLoaded) {
      await waitMessage(loadJointsOffset, "Loading Joints Offset", "Please wait...");
      if (!robotState.JointsOffsetLoaded) {
        await waitMessage(loadJointsOffset, "Loading Joints Offset", "Please wait...", "Error loading Offsets, trying again...");
        if (!robotState.JointsOffsetLoaded) {
          alertMessage("Loading Joints Offset", "Error loading Offsets, please check your network");
          assemblySwitch.checked = false;
          handleAssemblyMode();
          return;
        }
      }
      if (robotState.JointsOffsetLoaded) {
        updateJointOffsetTable();
      }
    }

    // Activate the assembly mode which sets a specific angular position for each joint.
    deskpet.assemblyON();

    // Check that the assembly mode has been set correctly.
    var result = await deskpet.queryMotion(MotionRegister.Assembly);
    while ((result[0] !== RESPONSE.OK || result[1] !== '1') && count < attempts) {
      deskpet.assemblyON();
      await sleep(20);
      result = await deskpet.queryMotion(MotionRegister.Assembly);
      count += 1;
    }

    show(assemblyTutorial);

  } else {

    hide(assemblyTutorial);

    enable(rcButton);
    enable(streamButton);

    hide(assemblyStepList[assemblyStepCounter]);
    assemblyStepCounter = 0;
    hide(nextButton);
    hide(backButton);
    hide(finishButton);

    deskpet.assemblyOFF();

    // Check that the assembly mode has been unset correctly.
    var result = await deskpet.queryMotion(MotionRegister.Assembly);
    while ((result[0] !== RESPONSE.OK || result[1] !== '0') && count < attempts) {
      deskpet.assemblyOFF();
      await sleep(20);
      result = await deskpet.queryMotion(MotionRegister.Assembly);
      count += 1;
    }

  }
}

function handleAssemblyBackButton() {
  hide(assemblyStepList[assemblyStepCounter]);
  assemblyStepCounter -= 1;
  if (assemblyStepCounter < 1) {
    assemblyStepCounter = 0
  }
  showAssemblySteps();
}

function handleAssemblyNexStepButton() {
  hide(assemblyStepList[assemblyStepCounter]);
  assemblyStepCounter += 1;
  if (assemblyStepCounter >= assemblyStepList.length - 1) {
    assemblyStepCounter = assemblyStepList.length - 1
  }
  showAssemblySteps();
}

function handleAssemblyFinishButton() {
  assemblySwitch.checked = false;
  handleAssemblyMode();
}

function showAssemblySteps() {
  if (assemblyStepCounter <= 0) {
    show(nextButton);
    hide(backButton);
    finishButton.innerText = "Cancel"
    show(finishButton);

  }
  else if (assemblyStepCounter >= assemblyStepList.length - 1) {
    hide(nextButton);
    show(backButton);

    finishButton.innerText = "Finish"
    show(finishButton);

  } else {
    show(nextButton);
    show(backButton);
    hide(finishButton);
  }

  show(assemblyStepList[assemblyStepCounter]);
}

var savingOffset = false;
async function handleCalibratePlusButton() {
  if (savingOffset) {
    return;
  }
  savingOffset = true;
  var count = 0;
  const attempts = 3;

  // Get the related span element and joint id
  const tdElement = this.closest("td");
  const id = tdElement.getAttribute("id");
  const leg = id.charAt(0);
  const joint = id.charAt(1);

  var span = tdElement.querySelector('span');

  // Get the current value (as a number) from the span
  var currentValue = parseFloat(span.textContent);
  var newValue = limitToRange(currentValue + 1, -15, 15);

  // Update the content of the span with the new value
  span.textContent = newValue;

  jointOffsets[leg - 1][joint - 1] = newValue;
  deskpet.configJointOffset(leg, joint, newValue);
  await sleep(20);

  var storedValue = await deskpet.queryJointOffset(leg, joint);
  while ((storedValue[0] != 0 || storedValue[1] != newValue) && count < attempts) {
    console.log("error in value PLUS");
    deskpet.configJointOffset(leg, joint, newValue);
    await sleep(20);
    storedValue = await deskpet.queryJointOffset(leg, joint);
    count += 1;
  }
  savingOffset = false;
}

async function handleCalibrateMinusButton() {
  if (savingOffset) {
    return;
  }
  savingOffset = true;
  var count = 0;
  const attempts = 3;
  // Get the related span element and joint id
  const tdElement = this.closest("td");
  const id = tdElement.getAttribute("id");
  const leg = id.charAt(0);
  const joint = id.charAt(1);

  var span = tdElement.querySelector('span');

  // Get the current value (as a number) from the span
  var currentValue = parseFloat(span.textContent);
  var newValue = limitToRange(currentValue - 1, -15, 15);

  // Update the content of the span with the new value
  span.textContent = newValue;

  jointOffsets[leg - 1][joint - 1] = newValue;
  deskpet.configJointOffset(leg, joint, newValue);
  await sleep(20);

  var storedValue = await deskpet.queryJointOffset(leg, joint);
  while ((storedValue[0] != 0 || storedValue[1] != newValue) && count < attempts) {
    console.log("error in value MINUS");
    deskpet.configJointOffset(leg, joint, newValue);
    await sleep(20);
    storedValue = await deskpet.queryJointOffset(leg, joint);
    count += 1;
  }
  savingOffset = false;
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
      if (keyFlags.RotateCW || robotState.Rotation === 0) {
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
      if (keyFlags.RotateCCW || robotState.Rotation === 0) {
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
  if (isPressed(settingsButton) || isPressed(enrollButton)) {
    return;
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
      //deskpet.setBuzzer(1000,1000);
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
  'JointsOffsetLoaded': false // Flag to indicate if the joint offset tablet was updated correctly
}

var rcButtonRefreshTime = 500; //ms

var rollButtonTimer;
function rollSliderChanged() {
  robotState.Roll = parseInt(rollSlider.value);
  if (!rollButtonTimer) {
    // Si no hay un temporizador en ejecución, configura uno nuevo
    rollButtonTimer = setTimeout(() => {
      deskpet.roll(robotState.Roll);
      rollButtonTimer = null; // Restablece la variable temporizador
    }, rcButtonRefreshTime);
  }
}

var pitchButtonTimer;
function pitchSliderChanged() {
  robotState.Pitch = parseInt(pitchSlider.value);
  if (!pitchButtonTimer) {
    // Si no hay un temporizador en ejecución, configura uno nuevo
    pitchButtonTimer = setTimeout(() => {
      deskpet.pitch(robotState.Pitch);
      pitchButtonTimer = null; // Restablece la variable temporizador
    }, rcButtonRefreshTime);
  }
}

var yawButtonTimer;
function yawSliderChanged() {
  robotState.Yaw = parseInt(yawSlider.value);
  if (!yawButtonTimer) {
    // Si no hay un temporizador en ejecución, configura uno nuevo
    yawButtonTimer = setTimeout(() => {
      deskpet.yaw(robotState.Yaw);
      yawButtonTimer = null; // Restablece la variable temporizador
    }, rcButtonRefreshTime);
  }
}

function controlButtonReleased(event) {
  console.log("released: " + event.target.id);
  if (event.target.id === "leftButton" || event.target.id === "rightButton") {
    robotState.Rotation = 0;
    deskpet.stopRotation();
  }
}

function controlButtonPressed(event) {
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
  } else if (event.target.id === "sitButton") {
    if (robotState.Sequence == MOVES.UP) {
      robotState.Sequence = MOVES.SIT;
    } else {
      robotState.Sequence = MOVES.UP; // reset state to UP:0 (Default)
    }
    deskpet.setMove(robotState.Sequence);
  }
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