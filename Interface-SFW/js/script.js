import { LSS, MOVES, COLORS, MODES } from "./communication.js"
import { JoystickController } from "./joystic.js";
import { hide, show, sleep, checkIfValidIP, limitToRange, enable, disable, pressed, notPressed, isPressed, isEnable } from "./utils.js"


const baseHost = document.location.origin;
var espIP;
var deskpet;
var joystick;

var statusInterval;
var joysticReading;

//// HEADER
var streamButton,
  stillButton,
  ballButton,
  signdetButton,
  objdetButton,
  facedetButton,
  enrollButton,
  visionMode;

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
  settings,
  settingsButton,
  infoButton,
  faceSettings,
  recogButton,
  saveIDButton,
  rcPushButtons;

var modeSwitch;
var controlBox;
var command;
var sendCommandButton;
var objects;
var sequences;
var objectSequenceButton;
var framesize;
var information;
var batteryLevel;

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
    connectingCard.classList.remove("hidden");
    startUpInterface();
  } else {
    ipValidation.innerText = "Invalid IP";
  }
}


////  Initializes the interface fucntions.

async function startUpInterface() {
  // Create a new LSS instance for the DeskPet with the specified IP address.
  deskpet = new LSS(espIP);

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

  // Hide the overlay once the connection is established.
  overlay.style.display = 'none';

  // Set an interval to update the battery voltage every 60 seconds.
  updateBatteryVoltage(1);
  statusInterval = setInterval(() => {
    updateBatteryVoltage(1); // Keep the battery level updated
  }, 60000);

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

  //// HEADER BUTTONS
  streamButton = document.getElementById('toggle-stream');
  stillButton = document.getElementById('get-still');
  ballButton = document.getElementById('ball-track');
  signdetButton = document.getElementById('sign-detect');
  objdetButton = document.getElementById('object-detect');
  facedetButton = document.getElementById('face-detect');
  enrollButton = document.getElementById('face-add');
  recogButton = document.getElementById('face-recog');
  rcButton = document.getElementById('rc-control');
  settingsButton = document.getElementById('cam-settings');
  infoButton = document.getElementById('info');

  //// HEADER SUB MENU
  visionMode = document.getElementById('mode');
  settings = document.getElementById('settings');          // camera settings div
  faceSettings = document.getElementById('face-settings'); // face id settings
  saveIDButton = document.getElementById('save-id');       // stores face id
  command = document.querySelector('.command');
  sendCommandButton = document.getElementById('send-command');
  objects = document.getElementById('objects');
  sequences = document.getElementById('sequences');
  objectSequenceButton = document.getElementById('object-sequence');
  framesize = document.getElementById('framesize');
  modeSwitch = document.getElementById('control-mode');


  //// RC CONTROLS 
  hideRC = document.getElementById('rc-hide');
  settingsRC = document.getElementById('rc-settings');
  controlBox = document.getElementById('control-box');
  rollSlider = document.getElementById("roll-value");
  pitchSlider = document.getElementById("pitch-value");
  yawSlider = document.getElementById("yaw-value");
  // Get buttons by their class and add event listeners
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
  connectingCard = document.getElementById('connecting-card');
  enterIpCard = document.getElementById('enterIP-card');
  ipAddressInput = document.getElementById('ip-address');
  ipValidation = document.getElementById('ip-address-valid');
  connectingMsg = document.getElementById('connection-msg');

  //// OTHERS
  information = document.getElementById('information');
  batteryLevel = document.querySelector('.battery-level');

  /////////////// BUTTONS EVENTS
  streamButton.addEventListener('click', toggleStream);
  stillButton.addEventListener('click', handleCaptureImageClick);
  saveButton.addEventListener('click', handleSaveButtonClick);
  infoButton.addEventListener('click', handleInfoButtonClick);
  objdetButton.addEventListener('click', handleObjDetButtonClick);
  signdetButton.addEventListener('click', handleSignDetButtonClick);
  ballButton.addEventListener('click', handleBallButtonClick);
  hideRC.addEventListener('click', handleHideRCClick);
  closeButton.addEventListener('click', handleCloseButtonClick);
  facedetButton.addEventListener('click', handleFaceDetButtonClick);
  enrollButton.addEventListener('click', handleEnrollButtonClick);
  settingsButton.addEventListener('click', handleSettingsButtonClick);
  rcButton.addEventListener('click', handleRCButtonClick);
  recogButton.addEventListener('click', handleRecogButtonClick);
  saveIDButton.addEventListener('click', handleSaveIDButtonClick);
  sendCommandButton.addEventListener('click', handleSendCommandClick);
  saveIpButton.addEventListener('click', handleSaveIPButtonClick);

  modeSwitch.addEventListener('change', handleModeSwitch);

  rollSlider.addEventListener("input", rollSliderChanged);
  pitchSlider.addEventListener("input", pitchSliderChanged);
  yawSlider.addEventListener("input", yawSliderChanged);

  //objectSequenceButton.addEventListener('click', handleObjectSequenceClick);
  //framesize.addEventListener('change', handleFramesizeChange);
  visionMode.addEventListener('change', handleVisionModeChange);

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);


  rcPushButtons.forEach(button => {
    button.addEventListener("mousedown", controlButtonPressed);
    button.addEventListener("touchstart", controlButtonPressed);
    button.addEventListener("mouseup", controlButtonReleased);
    button.addEventListener("touchend", controlButtonReleased);
  });


  // function setWindow(start_x, start_y, end_x, end_y, offset_x, offset_y, total_x, total_y, output_x, output_y, scaling, binning, cb) {
  //   fetchUrl(`${baseHost}/resolution?sx=${start_x}&sy=${start_y}&ex=${end_x}&ey=${end_y}&offx=${offset_x}&offy=${offset_y}&tx=${total_x}&ty=${total_y}&ox=${output_x}&oy=${output_y}&scale=${scaling}&binning=${binning}`, cb);
  // }

  // // Read initial values from the server
  // fetch(`${baseHost}/status`) // Make a GET request to retrieve initial configuration values
  //   .then(function (response) {
  //     return response.json(); // Parse the JSON response
  //   })
  //   .then(function (state) {
  //     // Iterate through elements with the class "default-action" and update their values
  //     document
  //       .querySelectorAll('.default-action')
  //       .forEach(el => {
  //         updateValue(el, state[el.id], false); // Update element value based on the corresponding value from the server
  //       });
  //   });


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

//////////////// REPETITIVE FUNCTIONS

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
  if (isPressed(streamButton)){
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
    notPressed(rcButton);
    hide(controlBox);
    notPressed(settingsButton);
    hide(settings);
  } else {
    // Perform actions when the button is not pressed
    notPressed(infoButton);
    hide(information);
  }
}

// Function to handle the click event of the "Object Detection" button
function handleObjDetButtonClick() {
  if (objdetButton.innerHTML === '<i class="bi-bounding-box"></i>') {
    // Check if "Object detection" is loaded
    checkLoaded("Object detection enabled").then((flag) => {
      switch (flag) {
        case true:
          // Enable and perform actions when the button is pressed
          enable(objdetButton);
          pressed(objdetButton);
          objdetButtonFunc();
          break;
        case false:
          console.log("Object detection was not loaded");
          break;
      }
    });
  } else {
    // Enable other buttons and perform actions when the button is not pressed
    enable(ballButton);
    enable(signdetButton);
    enable(facedetButton);
    enable(enrollButton);
    enable(recogButton);
    notPressed(objdetButton);
    // Clear the canvas after a delay
    sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
  }
}

// Function to handle the click event of the "Sign Detection" button
function handleSignDetButtonClick() {
  if (signdetButton.innerHTML === '<i class="bi-stoplights"></i>') {
    // Check if "Sign detection" is loaded
    checkLoaded("Sign detection enabled").then((flag) => {
      switch (flag) {
        case true:
          // Enable and perform actions when the button is pressed
          enable(signdetButton);
          pressed(signdetButton);
          signdetButtonFunc();
          break;
        case false:
          // Do nothing if "Sign detection" is not loaded
          break;
      }
    });
  } else {
    // Enable other buttons and perform actions when the button is not pressed
    enable(ballButton);
    enable(objdetButton);
    enable(facedetButton);
    enable(enrollButton);
    enable(recogButton);
    notPressed(signdetButton);
    // Clear the canvas after a delay
    sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
  }
}

// Function to handle the click event of the "Ball Tracking" button
function handleBallButtonClick() {
  if (isEnable(ballButton)){//}.style.background === 'rgb(57, 57, 57)') {
    // Check if "Ball tracking" is loaded
    checkLoaded("Ball tracking enabled").then((flag) => {
      switch (flag) {
        case true:
          // Enable and perform actions when the button is pressed
          enable(ballButton);
          pressed(ballButton);
          ballTracking();
          break;
        case false:
          // Do nothing if "Ball tracking" is not loaded
          break;
      }
    });
  } else {
    // Enable other buttons and perform actions when the button is not pressed
    enable(objdetButton);
    enable(signdetButton);
    enable(facedetButton);
    enable(enrollButton);
    enable(recogButton);
    notPressed(ballButton);
    // Clear the canvas after a delay
    sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
  }
}

// Function to handle the change event of the "Vision Mode" checkbox
function handleVisionModeChange() {
  robotState.Device = visionMode.checked;
  // Reset flags and variables

  // faceapiFlag = 0;
  // signDetmodel = undefined;

  // if (visionMode.checked) {
  //   // Perform actions when the checkbox is checked (PC Mode)
  //   console.log("Changed to PC Mode");
  //   speed = 1;
  // } else {
  //   // Perform actions when the checkbox is unchecked (Mobile Mode)
  //   console.log("Changed to Mobile Mode");
  //   speed = 0;
  // }
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

// Function to handle the click event of the "Face Detection" button
function handleFaceDetButtonClick() {
  if (facedetButton.innerHTML === '<i class="bi-person-bounding-box"></i>') {
    // Check if "Face detection" is loaded
    checkLoaded("Face detection enabled").then((flag) => {
      switch (flag) {
        case true:
          // Enable and perform actions when the button is pressed
          enable(facedetButton);
          pressed(facedetButton);
          detectFaceFunc();
          break;
        case false:
          // Do nothing if "Face detection" is not loaded
          break;
      }
    });
  } else {
    // Enable other buttons and perform actions when the button is not pressed
    enable(ballButton);
    enable(signdetButton);
    enable(objdetButton);
    enable(enrollButton);
    enable(recogButton);
    hide(faceSettings);
    notPressed(facedetButton);
    // Clear the canvas after a delay
    sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
  }
}

// Function to handle the click event of the "Enroll" button
function handleEnrollButtonClick() {
  const enrollEnabled = enrollButton.innerHTML === '<i class="bi-person-plus"></i>';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (enrollEnabled) {
    if (faceapiFlag === 0) {
      loadFaceapiModels();
    }
    // Check if "Face enrollment" is loaded
    checkLoaded("Face enrollment enabled").then((flag) => {
      switch (flag) {
        case true:
          // Perform actions when the button is pressed to enroll
          show(faceSettings);
          enable(enrollButton);
          pressed(enrollButton);
          hide(settings);
          notPressed(settingsButton);
          hide(information);
          notPressed(infoButton);
          break;
        case false:
          // Do nothing if "Face enrollment" is not loaded
          break;
      }
    });
  } else {
    // Enable other buttons and perform actions when the button is not pressed
    enable(ballButton);
    enable(signdetButton);
    enable(objdetButton);
    enable(facedetButton);
    enable(recogButton);
    notPressed(enrollButton);
    hide(faceSettings);
  }
}

// Function to handle the click event of the "Settings" button
function handleSettingsButtonClick() {
  if (!isPressed(settingsButton)){
    // Perform actions when the button is pressed to show settings
    stopStream();
    pressed(settingsButton);
    show(settings);
    notPressed(rcButton);
    hide(controlBox);
    //enrollButton.innerHTML = '<i class="bi-person-plus"></i>';
    hide(faceSettings);
    notPressed(infoButton);
    hide(information);
  } else {
    // Perform actions when the button is not pressed
    notPressed(settingsButton);
    hide(settings);
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

// Function to handle the click event of the "Recognition" button
function handleRecogButtonClick() { //NOT WORKING
  if (recogButton.innerHTML === '<i class="bi-person-check"></i>') {
    // Check if face recognition is loaded
    checkLoaded("Face recognition enabled").then((flag) => {
      switch (flag) {
        case true:
          // Perform actions when the button is pressed and face recognition is enabled
          enable(recogButton);
          pressed(recogButton);
          recogFaceFunc();
          break;
        case false:
          // Handle when face recognition is not loaded
          break;
      }
    });
  } else {
    // Perform actions when the button is not pressed
    enable(ballButton);
    enable(signdetButton);
    enable(objdetButton);
    enable(facedetButton);
    enable(enrollButton);
    notPressed(recogButton);
    sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
  }
}

// Function to handle the click event of the "Save ID" button
function handleSaveIDButtonClick() {  
    const name = document.getElementById('fname').value;
  if (name === "") {
    // Alert if no ID name is entered
    alert("Please enter an ID name");
  } else {
    // Perform actions when a valid ID name is entered
    disable(saveIDButton);
    if (faceapiFlag === 0) {
      loadFaceapiModels();
    }
    saveFaceFunc();
  }
}

// Function to handle the click event for the 'object-sequence' button
function handleObjectSequenceClick() {
  deskpet.configTrigger(objects.value, sequences.value); // NOT IMPLEMENTED
}

// Function to handle the click event for the 'send-command' button
function handleSendCommandClick() {
  deskpet.sendMsg("#"+command.value+"\r");
}



// Add a change event listener to detect when the Control Mode changes
function handleModeSwitch () {
  robotState.Mode = modeSwitch.checked;
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
  console.log("Key Pressed");
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
      console.log('Key not recognized');
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
  'Leds' : 0,
  'Mode' : false, // 0: RC, 1: AUTO 
  'Device' : false // 0: Mobile, 1: PC
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
      deskpet.walk(robotState.Walking, speed);
    }
  } else if (!joistickReleased) { // Joystick is not pressed
    joistickReleased = true;
    robotState.Walking = 0;
    deskpet.walk(0);
  }
}