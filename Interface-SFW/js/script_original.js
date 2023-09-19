const espIP = "http://192.168.0.3";

function controlCMD(x) {
  const query = `${espIP}/control?var=${D}&val=${x}`
  fetch(query)
    .then(response => {
      console.log(`request to ${query} finished, status: ${response.status}`)
    })
}

// CHECK THIS Buttons Test

// function controlCMD(x) {
//   websocket.send(x);
//   console.log(x);
// }

// function controlCMD(x) {
//   var xhr = new XMLHttpRequest();
//   xhr.open("GET", "/action?go=" + x, true);
//   xhr.send();
// }

// window.onload = document.getElementById("photo").src =     window.location.href.slice(0, -1) + ":81/stream";

// var gateway = `ws://${window.location.hostname}/ws`;
// var websocket;

// window.addEventListener('load', initWebSocket);
// function initWebSocket() {
//   console.log('Trying to open a WebSocket connection...');
//   websocket = new WebSocket(gateway);
//   websocket.onopen = onOpen;
//   websocket.onclose = onClose;
//   websocket.onmessage = onMessage;
// }
// function onOpen(event) {
//   console.log('Ws Connection opened');
// }
// function onClose(event) {
//   console.log('Ws Connection closed');
//   setTimeout(initWebSocket, 2000);
// }
// function onMessage(event) {
//   console.log(event.data);
// }

// switch(window.orientation){
//   case -90: case 90: /* Device is in landscape mode */
//       break;
//   default:    /* Device is in portrait mode */
//       window.orientation = window.orientation-90;
//       break;
// }

document.addEventListener('DOMContentLoaded', function (event) {
  var baseHost = document.location.origin
  var streamUrl = baseHost + ':81'
  function fetchUrl(url, cb) {
    fetch(url)
      .then(function (response) {
        if (response.status !== 200) {
          cb(response.status, response.statusText);
        } else {
          response.text().then(function (data) {
            cb(200, data);
          }).catch(function (err) {
            cb(-1, err);
          });
        }
      })
      .catch(function (err) {
        cb(-1, err);
      });
  }

  function setWindow(start_x, start_y, end_x, end_y, offset_x, offset_y, total_x, total_y, output_x, output_y, scaling, binning, cb) {
    fetchUrl(`${baseHost}/resolution?sx=${start_x}&sy=${start_y}&ex=${end_x}&ey=${end_y}&offx=${offset_x}&offy=${offset_y}&tx=${total_x}&ty=${total_y}&ox=${output_x}&oy=${output_y}&scale=${scaling}&binning=${binning}`, cb);
  }

  // Check later
  const updateValue = (el, value, updateRemote) => {
    updateRemote = updateRemote == null ? true : updateRemote
    let initialValue
    if (el.type == 'checkbox') {
      initialValue = el.checked
      value = !!value
      el.checked = value
    } else {
      initialValue = el.value
      el.value = value
    }

    if (updateRemote && initialValue !== value) {
      updateConfig(el);
    } else if (!updateRemote) {
      if (el.id == "face-recog") {
        value ? enable(enrollButton) : disable(enrollButton)
      }
    }
  }

  const key = document.createElement("key");
  document.addEventListener('keydown', function(event) {

    switch (event.keyCode) {
      case 27://ESC
        console.log('Stop')
        key.value = 0
        break;
      case 87://W
      case 38://Arrow up
        console.log('Forward')
        key.value = 1
        break;
      case 65://A
      case 37://Arrow left
        console.log('Rotate CCW')
        key.value = 2
        break;
      case 83://S
      case 40://Arrow down
        console.log('Backward')
        key.value = 3
        break;
      case 68://D
      case 39://Arrow right
        console.log('Rotate CW')
        key.value = 4
        break;
      case 81://Q
        console.log('Strafe right')
        key.value = 5
        break;
      case 69://E
        console.log('Strafe left')
        key.value = 6
        break;
      case 88://X
        console.log('Stand up')
        key.value = 7
        break;
      case 90://Z
        console.log('Sit')
        key.value = 8
        break;
      case 32://SPACE
        console.log('Lay down')
        key.value = 9
        break;
      case 82://R
        console.log('Go up')
        key.value = 10
        break;
      case 70://F
        console.log('Go down')
        key.value = 11
        break;
      case 84://T
        console.log('Roll (-)')
        key.value = 12
        break;
      case 71://G
        console.log('Roll (+)')
        key.value = 13
        break;
      case 89://Y
        console.log('Pitch (-)')
        key.value = 14
        break;
      case 72://H
        console.log('Pitch (+)')
        key.value = 15
        break;
      case 85://U
        console.log('Yaw (-)')
        key.value = 16
        break;
      case 74://J
        console.log('Yaw (+)')
        key.value = 17
        break;
      case 67://C
        console.log('Wag tail')
        key.value = 18
        break;
      case 86://V
        console.log('Give paw')
        key.value = 19
        break;
      case 66://B
        console.log('Speak (piezo)')
        key.value = 20
        break;
      default:
        console.log('Key not recognized')
        break;
    }
    key.id = 'M';
    key.type = 'text';
    updateConfig(key);
  });

  const framesize = document.getElementById('framesize');
  framesize.onchange = () => {
    updateConfig(framesize);
  }

  const command = document.getElementsByClassName('command');
  document.getElementById('send-command').onclick = () => {
    updateConfig(command[0]);
  }

  function updateConfig(el) {
    let value
    switch (el.type) {
      case 'range':
      case 'text':
      case 'select-one':
        value = el.value
        break
      default:
        return
    }
    
    // const query = `${baseHost}/control?var=${el.id}&val=${value}`
    const query = `${espIP}/control?#${el.id}${value}\\r`
    console.log(query)
    fetch(query)
      .then(response => {
        console.log(`request to ${query} finished, status: ${response.status}`)
      })
  }

  // Attach default on change action
  document
    .querySelectorAll('.default-action')
    .forEach(el => {
      el.onchange = () => updateConfig(el)
    })

  // Read initial values
  fetch(`${baseHost}/status`)
    .then(function (response) {
      return response.json()
    })
    .then(function (state) {
      document
        .querySelectorAll('.default-action')
        .forEach(el => {
          updateValue(el, state[el.id], false)
        })

    })
  
  const objects = document.getElementById('objects');
  const sequences = document.getElementById('sequences');
  document.getElementById('object-sequence').onclick = () => {
    const query = `${espIP}/control?#CR${objects.value}M${sequences.value}\\r`
    console.log(query)
    fetch(query)
      .then(response => {
        console.log(`request to ${query} finished, status: ${response.status}`)
      })
  }

  const hide = el => {
    el.classList.add('hidden');
    el.hidden = true;
  }
  const show = el => {
    el.classList.remove('hidden');
    el.hidden = false;
  }
  const disable = el => {
    el.classList.add('disabled');
    el.disabled = true;
    el.style.background=('rgb(153, 153, 153)');
    switch (el) {
      case signdetButton:
        el.innerHTML = '<i class="bi-stoplights"></i>'
        break;
      case objdetButton:
        el.innerHTML = '<i class="bi-bounding-box"></i>'
        break;
      case facedetButton:
        el.innerHTML = '<i class="bi-person-bounding-box"></i>'
        break;
      case recogButton:
        el.innerHTML = '<i class="bi-person-check"></i>'
        break;
      case enrollButton:
        el.innerHTML = '<i class="bi-person-plus"></i>'
        break;
    }
  }
  const enable = el => {
    el.classList.remove('disabled');
    el.disabled = false;
    el.style.background=('rgb(57, 57, 57)');
  }
  const notPressed = el => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    el.style.background=('rgb(57, 57, 57)');
    switch (el) {
      case streamButton:
        el.innerHTML = '<i class="bi-camera-video"></i>'
        break;
      case signdetButton:
        el.innerHTML = '<i class="bi-stoplights"></i>'
        break;
      case objdetButton:
        el.innerHTML = '<i class="bi-bounding-box"></i>'
        break;
      case facedetButton:
        el.innerHTML = '<i class="bi-person-bounding-box"></i>'
        break;
      case recogButton:
        el.innerHTML = '<i class="bi-person-check"></i>'
        break;
      case enrollButton:
        el.innerHTML = '<i class="bi-person-plus"></i>'
        break;
      case settingsButton:
        el.innerHTML = '<i class="bi-gear"></i>'
        break;
      case infoButton:
        el.innerHTML = '<i class="bi-info-circle"></i>'
        break;
    }
  }
  const pressed = el => {
    el.style.background=('rgb(87, 87, 87)');
    switch (el) {
      case streamButton:
        el.innerHTML = '<i class="bi-camera-video-off"></i>'
        break;
      case signdetButton:
        el.innerHTML = '<i class="bi-stoplights-fill"></i>'
        break;
      case objdetButton:
        el.innerHTML = '<i class="bi-check-square"></i>'
        break;
      case facedetButton:
        el.innerHTML = '<i class="bi-person-square"></i>'
        break;
      case recogButton:
        el.innerHTML = '<i class="bi-person-check-fill"></i>'
        break;
      case enrollButton:
        el.innerHTML = '<i class="bi-person-plus-fill"></i>'
        break;
      case settingsButton:
        el.innerHTML = '<i class="bi-gear-fill"></i>'
        break;
      case infoButton:
        el.innerHTML = '<i class="bi-info-circle-fill"></i>'
        break;
    }
  }

  const videoContainer = document.getElementById('video-container'),
        video = document.getElementById('video'),
        closeButton = document.getElementById('close-stream'),
        streamButton = document.getElementById('toggle-stream'),
        hideRC = document.getElementById('rc-hide'),
        settingsRC = document.getElementById('rc-settings'),
        //videoURL = "http://192.168.1.7:4747/video", //Droidcam
        videoURL = espIP + "/streaming", //ESP12K-OV5640
        canvas = document.getElementById('canvas'),
        ctx = canvas.getContext('2d'),
        stillButton = document.getElementById('get-still'),
        saveButton = document.getElementById('save-still'),
        ballButton = document.getElementById('ball-track'),
        signdetButton = document.getElementById('sign-detect'),
        objdetButton = document.getElementById('object-detect'),
        facedetButton = document.getElementById('face-detect'),
        load = document.getElementById('loading'),
        enrollButton = document.getElementById('face-add'),
        visionMode = document.getElementById('mode');

  const stopStream = () => {
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
    video.src = videoURL;
    // if (IP == "") {
    //   IP = prompt("Please enter DeskPet's IP address", "");
    // }
    // if (checkIfValidIP(IP)) {   //CHANGE CONDITION
    //   let streamURL = "http://" + IP + ":4747/video";
    //   video.src = streamURL;
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
    // } else {
    //   alert("Please enter a valid IP address");
    //   IP = "";
    // }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  let IP = "";

  function checkIfValidIP(str) {
    const regexExp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;
    return regexExp.test(str);
  }

  streamButton.onclick = () => {
    if (streamButton.innerHTML == '<i class="bi-camera-video-off"></i>') {
      stopStream();
    }
    else {
      startStream();
    }
  }

  stillButton.onclick = () => {
    ctx.drawImage(video, 0, 0)
    show(videoContainer)
    show(saveButton)
  }

  saveButton.onclick = () => {
    try {
      var dataURL = canvas.toDataURL('image/jpeg');
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

  closeButton.onclick = () => {
    stopStream();
    hide(videoContainer);
    hide(saveButton)
  }

  hideRC.onclick = () => {
    if(hideRC.innerText  == '>'){
      hideRC.innerText  = '<';
      hide(settingsRC);
    }
    else{
      hideRC.innerText = '>';
      show(settingsRC);
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function buildDetections(scores, boxes, classes, classesDir, thresh) {
    const detectionObjects = [];

    scores[0].forEach((score, i) => {
      if (score >= thresh) {
        const bbox = [];
        const minY = boxes[0][i][0] * video.height;
        const minX = boxes[0][i][1] * video.width;
        const maxY = boxes[0][i][2] * video.height;
        const maxX = boxes[0][i][3] * video.width;
        bbox[0] = minX;
        bbox[1] = minY;
        bbox[2] = maxX - minX;
        bbox[3] = maxY - minY;
        if (classesDir == classesCoco) {
          labelid = classesDir[classes[i]+1].name;
        }
        else{
          labelid = classesDir[classes[i]].name;
        }
        detectionObjects.push({
          class: classes[i],
          label: labelid,
          score: score,
          bbox: bbox
        })
        // ctx.fillText(classesDir[classes[i]].name,video.width/2,video.height/2);
      }
    })
    return detectionObjects
  }

  function printDetections(score, thresh, bbox, label){
    if (score >= thresh){
    ctx.strokeStyle = 'white';
    ctx.font = "17px Helvetica";
    ctx.fillStyle = "white";
    ctx.strokeRect(bbox[0],bbox[1],bbox[2],bbox[3]);
    ctx.fillText(label,bbox[0]+5,bbox[1]+15);
    ctx.fillText(score.toFixed(2),bbox[0]+bbox[2]-35,bbox[1]+15);
    }
  }
  var visionFlag = 0,
      speed = 0;
  
  function updateCanvas(){
    canvas.width = video.width;
    canvas.height = video.height;
    mx = 2560/video.width;
    my = 1920/video.height;
  }

  async function checkLoaded(el){
    if (video.complete && video.naturalHeight !== 0){
      console.log(el);
      updateCanvas();
      disable(ballButton);
      disable(signdetButton);
      disable(objdetButton);
      disable(enrollButton);
      disable(facedetButton);
      disable(recogButton);
      flag = true;
    } else{
      alert("Video has no loaded yet")
      flag = false;
    }
    if (visionFlag == 0){
      await checkInfSpeed();
      visionFlag = 1;
    }
    return flag;
  }

  visionMode.onchange = () => {
    faceapiFlag = 0;
    signDetmodel = undefined;
    if (visionMode.checked){
      console.log("Changed to PC Mode");
      speed = 1;
    }
    else{
      console.log("Changed to Mobile Mode");
      speed = 0;
    }
  }

  async function checkInfSpeed(){
    if (visionFlag == 0){
      let sum = 0;
      for (let i = 0; i <= 10; i++){
        performance.mark('mark1');
        await objdetButtonFunc();
        performance.mark('mark2');
        performance.measure('markMeasure', 'mark1', 'mark2');
        if (i > 2){
          sum = sum + performance.getEntriesByName('markMeasure')[i].duration;
        }
      }
      mean = sum/8;
      console.log("Inference speed (ms): " + mean.toFixed(1));
      ctx.font = "17px Helvetica";
      if (mean <= 150){
        speed = 1;
        visionMode.checked="checked";
        console.log("Default vision mode: PC");
      }
      else{
        console.log("Default vision mode: Mobile");
      }
    }
  }

  function printOnScreen(text, fontFace, maxWidth) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `1px ${fontFace}`;
    size = maxWidth / ctx.measureText(text).width;
    ctx.font = (size/2).toString() + 'px Helvetica';
    ctx.fillStyle = "white";
    ctx.fillText(text,video.width/3.7,video.height/2);
  }

  // BALL TRACKING
  var ballModel0,
      ballModel1,
      ballxArray = [],
      ballyArray = [],
      balldistArray = [];

  function drawCircle(ctx, x, y, radius, fill, stroke, strokeWidth) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false)
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  var  mx = 2560/640,
       my = 1920/480;

  function getAngles(u,v,radiusPX,type){
    // Binning (change in resolution)
    const fx = 2394.278;
    const fy = 2499.953;
    const cx = 1344.899;
    const cy = 885.970;
    // // Droidcam
    // const fx = 472.847;
    // const fy = 475.678;
    // const cx = 319.386;
    // const cy = 239.055;
    x = (u * mx - cx) / fx;
    y = (v * my - cy) / fy;
    thetaX = Math.atan(x) * 180 / Math.PI;
    thetaY = Math.atan(y) * 180 / Math.PI;
    if (type == "ball"){
      realRadius = 33.44; // Tennis ball
      radiusMM = radiusPX / ((fx + fy) / (mx + my));
      distance = realRadius / radiusMM;
    }
    else{
      distance = 0;
    }
    return {
      thetaX,
      thetaY,
      distance
    };
  }

  let classBall = {
    1: {
      id: 1,
      name: "sports ball",
    }
  };

  async function ballTracking() {
    var predictions;
    if (speed == 0){
      if (ballModel0 == undefined){
        printOnScreen("Please wait until the lite model loads","Helvetica",canvas.width);
        ballModel0 = await tf.loadGraphModel("/models/lite/sports_ball_128_f16/model.json");
      }
      const t0 = performance.now();
      tf.engine().startScope();
      tfimg = tf.browser.fromPixels(video).toInt();
      const expandedimg = tfimg.expandDims();
      const detections = await ballModel0.executeAsync(expandedimg);
      // console.log(detections);
      const boxes = detections[3].arraySync();//output_3
      const scores = detections[1].arraySync();//Identity_1.0
      const classes = detections[5].dataSync();//Identity_2.0
      tf.engine().endScope();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      predictions = buildDetections(scores, boxes, classes, classBall, 0.6);
      const t1 = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.fillText((1000/(t1 - t0)).toFixed(1).toString() + " fps",video.width-60,video.height-10);
    }
    else{
      if (ballModel1 == undefined){
        printOnScreen("Please wait until the full model loads","Helvetica",canvas.width)
        ballModel1 = await cocoSsd.load({base: 'mobilenet_v1'});
      }
      const t0 = performance.now();
      tf.engine().startScope();
      predictions = await ballModel1.detect(video, 5, 0.5);
      tf.engine().endScope();
      const t1 = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.fillText((1000/(t1 - t0)).toFixed(0).toString() + " fps",video.width-60,video.height-10);
    }
    ballxArray = [];
    ballyArray = [];
    balldistArray = [];
    for (i in predictions) {
      if (predictions[i].class == "sports ball" || predictions[i].label == "sports ball") {
        radius = (predictions[i].bbox[2] + predictions[i].bbox[3])/4;
        x = predictions[i].bbox[0] + predictions[i].bbox[2]/2;
        y = predictions[i].bbox[1] + predictions[i].bbox[3]/2;
        drawCircle(ctx, x, y, radius, 0, 'blue', 3);
        ctx.font = (size/2).toString() + 'px Helvetica';
        ctx.fillStyle = "blue";
        let ball = getAngles(x,y,radius,"ball");
        ballxArray.push(ball.thetaX.toFixed(1));
        ballyArray.push(ball.thetaY.toFixed(1));
        balldistArray.push((ball.distance/10).toFixed(1));
      }
    }
    if (balldistArray.length != 0){
      var closest = balldistArray.reduce(function(lowestIndex, element, index, array){
            return element < array[lowestIndex] ? index : lowestIndex;
      }, 0);
      // For testing
      fx = "x: " + ballxArray[closest].toString() + "°";
      fy = "y: " + ballyArray[closest].toString() + "°";
      distance = "dist: " + balldistArray[closest].toString() + "cm";
      ctx.fillText(fx,predictions[closest].bbox[0]+predictions[closest].bbox[2]+10,predictions[closest].bbox[1]+predictions[closest].bbox[3]/2);
      ctx.fillText(fy,predictions[closest].bbox[0]+predictions[closest].bbox[2]/2-10,predictions[closest].bbox[1]-10);
      ctx.fillText(distance,predictions[closest].bbox[0]+predictions[closest].bbox[2]/2-10,predictions[closest].bbox[1]+predictions[closest].bbox[3]+20);
    }
    if (ballButton.style.background == ('rgb(87, 87, 87)')){
      sleep(50).then(() => { ballTracking(); });
    }
  }

  //TFLITE
  // var flagtst = 0;

  // async function ballTracking() {
  //   if (flagtst == 0){
  //     printOnScreen("Please wait until the model loads","Helvetica",canvas.width)
  //     ballModel = await tflite.loadTFLiteModel('models/ssd_mobilenet_v3.tflite');
  //     flagtst = 1;
  //   }
  //   const t0 = performance.now();
  //   tf.engine().startScope();
  //   const img = tf.browser.fromPixels(video).resizeBilinear([320,320]).toInt();
  //   const input = img.expandDims();
  //   let outputTensor = await ballModel.predict(input);
  //   console.log(outputTensor);
  //   const boxes = outputTensor['TFLite_Detection_PostProcess'].arraySync();
  //   const classes = outputTensor['TFLite_Detection_PostProcess:1'].dataSync();
  //   const scores = outputTensor['TFLite_Detection_PostProcess:2'].arraySync();
  //   // const boxes = outputTensor['StatefulPartitionedCall:3'].arraySync();
  //   // const classes = outputTensor['StatefulPartitionedCall:2'].dataSync();
  //   // const scores = outputTensor['StatefulPartitionedCall:1'].arraySync();
  //   tf.engine().endScope();
  //   const t1 = performance.now();
  //   ctx.clearRect(0, 0, canvas.width, canvas.height);
  //   ctx.fillText((t1 - t0).toFixed(1).toString(),video.width-50,video.height-10);
  //   const detections = buildDetections(scores, boxes, classes, classesCoco, 0.7);
  //   for (i in detections) {
  //     printDetections(detections[i].score, 0.6, detections[i].bbox, detections[i].label);
  //   }
  //   if (ballButton.style.background == ('rgb(87, 87, 87)')){
  //     sleep(50).then(() => { ballTracking(); });
  //   }
  // }

  ballButton.onclick = () => {
    if (ballButton.style.background == ('rgb(57, 57, 57)')) {
      checkLoaded("Ball tracking enabled").then((flag) => {
      switch (flag){
        case true:
          enable(ballButton);
          pressed(ballButton);
          ballTracking();
          break;
        case false:
          break;
        }
      });
    }else {
      enable(objdetButton);
      enable(signdetButton);
      enable(facedetButton);
      enable(enrollButton);
      enable(recogButton);
      notPressed(ballButton);
      sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
    }
  }

  // SIGN DETECTION
  var signDetmodel;

  let classesSign = {
    1: {
      name: 'Stop',
      id: 1,
    },
    2: {
      name: 'Right',
      id: 2,
    },
    3: {
      name: 'Left',
      id: 3,
    },
    4: {
      name: 'Up',
      id: 4,
    },
    5: {
      name: 'Down',
      id: 5,
    },
    6: {
      name: 'Forward',
      id: 6,
    },
    7: {
      name: 'Backward',
      id: 7,
    }
  };

  async function signdetButtonFunc() {
    if (signDetmodel == undefined){
      if (speed == 0){
        modelName = "/models/lite/sign_detector/model.json";
        box = 0;
        score = 2;
        classn = 3;
        thresh = 0.55;
        printOnScreen("Please wait until the lite model loads","Helvetica",canvas.width);
      }
      else {
        modelName = "/models/full/sign_detector/model.json";
        box = 0;
        score = 7;
        classn = 5;
        thresh = 0.75;
        printOnScreen("Please wait until the full model loads","Helvetica",canvas.width);
      }
      signDetmodel = await tf.loadGraphModel(modelName);
    }
    // console.log(signDetmodel.outputNodes);
    const t0 = performance.now();
    tf.engine().startScope();
    const tfimg = tf.browser.fromPixels(video).toInt();
    const expandedimg = tfimg.expandDims();
    const predictions = await signDetmodel.executeAsync(expandedimg);
    const boxes = predictions[box].arraySync();//Identity:0
    const scores = predictions[score].arraySync();//Identity_4.0
    const classes = predictions[classn].dataSync();//Identity_2.0
    tf.engine().endScope();
    const t1 = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText((1000/(t1 - t0)).toFixed(0).toString() + " fps",video.width-60,video.height-10);
    const detections = buildDetections(scores, boxes, classes, classesSign, thresh);
    // For testing
    for (i in detections) {
      printDetections(detections[i].score, 0.6, detections[i].bbox, detections[i].label);
    }
    if (signdetButton.innerHTML == '<i class="bi-stoplights-fill"></i>'){
      sleep(50).then(() => { signdetButtonFunc(); });
    }
  }

  signdetButton.onclick = () => {
    if (signdetButton.innerHTML == '<i class="bi-stoplights"></i>') {
      checkLoaded("Sign detection enabled").then((flag) => {
      switch (flag){
        case true:
          enable(signdetButton);
          pressed(signdetButton);
          signdetButtonFunc();
          break;
        case false:
          break;
      }
      });
    } else {
      enable(ballButton);
      enable(objdetButton);
      enable(facedetButton);
      enable(enrollButton);
      enable(recogButton);
      notPressed(signdetButton);
      sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
    }
  }

  // OBJECT DETECTION
  var objDetmodel0,
      objDetmodel1;

  let classesCoco = {
    1: {
      id: 1,
      name: 'person',
    },
    2: {
      id: 2,
      name: 'bicycle',
    },
    3: {
      id: 3,
      name: 'car',
    },
    4: {
      id: 4,
      name: 'motorcycle',
    },
    5: {
      id: 5,
      name: 'airplane',
    },
    6: {
      id: 6,
      name: 'bus',
    },
    7: {
      id: 7,
      name: 'train',
    },
    8: {
      id: 8,
      name: 'truck',
    },
    9: {
      id: 9,
      name: 'boat',
    },
    10: {
      id: 10,
      name: 'traffic light',
    },
    11: {
      id: 11,
      name: 'fire hydrant',
    },
    13: {
      id: 13,
      name: 'stop sign',
    },
    14: {
      id: 14,
      name: 'parking meter',
    },
    15: {
      id: 15,
      name: 'bench',
    },
    16: {
      id: 16,
      name: 'bird',
    },
    17: {
      id: 17,
      name: 'cat',
    },
    18: {
      id: 18,
      name: 'dog',
    },
    19: {
      id: 19,
      name: 'horse',
    },
    20: {
      id: 20,
      name: 'sheep',
    },
    21: {
      id: 21,
      name: 'cow',
    },
    22: {
      id: 22,
      name: 'elephant',
    },
    23: {
      id: 23,
      name: 'bear',
    },
    24: {
      id: 24,
      name: 'zebra',
    },
    25: {
      id: 25,
      name: 'giraffe',
    },
    27: {
      id: 27,
      name: 'backpack',
    },
    28: {
      id: 28,
      name: 'umbrella',
    },
    31: {
      id: 31,
      name: 'handbag',
    },
    32: {
      id: 32,
      name: 'tie',
    },
    33: {
      id: 33,
      name: 'suitcase',
    },
    34: {
      id: 34,
      name: 'frisbee',
    },
    35: {
      id: 35,
      name: 'skis',
    },
    36: {
      id: 36,
      name: 'snowboard',
    },
    37: {
      id: 37,
      name: 'sports ball',
    },
    38: {
      id: 38,
      name: 'kite',
    },
    39: {
      id: 39,
      name: 'baseball bat',
    },
    40: {
      id: 40,
      name: 'baseball glove',
    },
    41: {
      id: 41,
      name: 'skateboard',
    },
    42: {
      id: 42,
      name: 'surfboard',
    },
    43: {
      id: 43,
      name: 'tennis racket',
    },
    44: {
      id: 44,
      name: 'bottle',
    },
    46: {
      id: 46,
      name: 'wine glass',
    },
    47: {
      id: 47,
      name: 'cup',
    },
    48: {
      id: 48,
      name: 'fork',
    },
    49: {
      id: 49,
      name: 'knife',
    },
    50: {
      id: 50,
      name: 'spoon',
    },
    51: {
      id: 51,
      name: 'bowl',
    },
    52: {
      id: 52,
      name: 'banana',
    },
    53: {
      id: 53,
      name: 'apple',
    },
    54: {
      id: 54,
      name: 'sandwich',
    },
    55: {
      id: 55,
      name: 'orange',
    },
    56: {
      id: 56,
      name: 'broccoli',
    },
    57: {
      id: 57,
      name: 'carrot',
    },
    58: {
      id: 58,
      name: 'hot dog',
    },
    59: {
      id: 59,
      name: 'pizza',
    },
    60: {
      id: 60,
      name: 'donut',
    },
    61: {
      id: 61,
      name: 'cake',
    },
    62: {
      id: 62,
      name: 'chair',
    },
    63: {
      id: 63,
      name: 'couch',
    },
    64: {
      id: 64,
      name: 'potted plant',
    },
    65: {
      id: 65,
      name: 'bed',
    },
    67: {
      id: 67,
      name: 'dining table',
    },
    70: {
      id: 70,
      name: 'toilet',
    },
    72: {
      id: 72,
      name: 'tv',
    },
    73: {
      id: 73,
      name: 'laptop',
    },
    74: {
      id: 74,
      name: 'mouse',
    },
    75: {
      id: 75,
      name: 'remote',
    },
    76: {
      id: 76,
      name: 'keyboard',
    },
    77: {
      id: 77,
      name: 'cell phone',
    },
    78: {
      id: 78,
      name: 'microwave',
    },
    79: {
      id: 79,
      name: 'oven',
    },
    80: {
      id: 80,
      name: 'toaster',
    },
    81: {
      id: 81,
      name: 'sink',
    },
    82: {
      id: 82,
      name: 'refrigerator',
    },
    84: {
      id: 84,
      name: 'book',
    },
    85: {
      id: 85,
      name: 'clock',
    },
    86: {
      id: 86,
      name: 'vase',
    },
    87: {
      id: 87,
      name: 'scissors',
    },
    88: {
      id: 88,
      name: 'teddy bear',
    },
    89: {
      id: 89,
      name: 'hair drier',
    },
    90: {
      id: 90,
      name: 'toothbrush',
    }
  };

  async function objdetButtonFunc() {
    if (speed == 0){
      if (objDetmodel0 == null){
        printOnScreen("Please wait until the lite model loads","Helvetica",canvas.width);
        objDetmodel0 = await tflite.loadTFLiteModel('models/lite/ssd_mobilenet_v3.tflite');
        console.log("Loaded lite model");

      }
      const t0 = performance.now();
      tf.engine().startScope();
      const img = tf.browser.fromPixels(video).resizeBilinear([320,320]).toInt().expandDims();
      const outputTensor = await objDetmodel0.predict(img);
      const boxes = await outputTensor['TFLite_Detection_PostProcess'].arraySync();
      const classes = await outputTensor['TFLite_Detection_PostProcess:1'].dataSync();
      const scores = await outputTensor['TFLite_Detection_PostProcess:2'].arraySync();
      const detections = buildDetections(scores, boxes, classes, classesCoco, 0.5);
      tf.engine().endScope();
      const t1 = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillText((1000/(t1 - t0)).toFixed(0).toString() + " fps",video.width-60,video.height-10);
      for (i in detections) {
        printDetections(detections[i].score, 0.6, detections[i].bbox, detections[i].label);
      }
    }
    else{
      if (objDetmodel1 == null){
        printOnScreen("Please wait until the full model loads","Helvetica",canvas.width)
        objDetmodel1 = await cocoSsd.load();
        console.log("Loaded full model");
      }
      const t0 = performance.now();
      tf.engine().startScope();
      const detections = await objDetmodel1.detect(video, 5, 0.6);
      tf.engine().endScope();
      const t1 = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillText((1000/(t1 - t0)).toFixed(0).toString() + " fps",video.width-60,video.height-10);
      for (i in detections) {
        printDetections(detections[i].score, 0.7, detections[i].bbox, detections[i].class);
      }
    }
    if (objdetButton.innerHTML == '<i class="bi-check-square"></i>'){
      sleep(50).then(() => { objdetButtonFunc(); });
    }
  }

  objdetButton.onclick = () => {
    if (objdetButton.innerHTML == '<i class="bi-bounding-box"></i>') {
      checkLoaded("Object detection enabled").then((flag) => {
      switch (flag){
        case true:
          enable(objdetButton);
          pressed(objdetButton);
          objdetButtonFunc();
          break;
        case false:
          break;
      }
      });
    } else {
      enable(ballButton);
      enable(signdetButton);
      enable(facedetButton);
      enable(enrollButton);
      enable(recogButton);
      notPressed(objdetButton);
      sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
    }
  }

  const rcButton = document.getElementById('rc-control'),
        settings = document.getElementById('settings'),
        settingsButton = document.getElementById('cam-settings'),
        infoButton = document.getElementById('info'),
        faceSettings = document.getElementById('face-settings'),
        recogButton = document.getElementById('face-recog'),
        saveIDButton = document.getElementById('save-id');

  // FACE DETECTION
  var faceDetmodel0 = 0,
      faceDetmodel1 = 0;

  async function detectFaceFunc() {
    if (speed == 0){
      if (faceDetmodel0 == 0){
        printOnScreen("Please wait until the lite model loads","Helvetica",canvas.width);
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models/lite/face_detector');
        faceDetmodel0 = 1;
        console.log("Loaded lite model");
      }
      model = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
    }
    else {
      if (faceDetmodel1 == 0){
        printOnScreen("Please wait until the full model loads","Helvetica",canvas.width);
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models/full/face_detector');
        faceDetmodel1 = 1;
        console.log("Loaded full model");
      }
      model = new faceapi.SsdMobilenetv1Options();
    }
    const t0 = performance.now();
    var results = await faceapi.detectAllFaces(video, model);
    const t1 = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText((1000/(t1 - t0)).toFixed(0).toString() + " fps",video.width-60,video.height-10);
    if (results != null){
      const predictions = faceapi.resizeResults(results, { width: video.width, height: video.height })
      for (i in predictions) {
        var bbox = [];
        bbox = [predictions[i].box.x, predictions[i]._box.y, predictions[i].box.width, predictions[i].box.height];
        printDetections(predictions[i].score, 0.6, bbox, "");
        if (predictions[i].score > 0.6){
          fx = predictions[i].box.x + predictions[i].box.width/2;
          fy = predictions[i].box.y + predictions[i].box.height/2;
          let angles = getAngles(fx,fy,0,"face");
          console.log("x: " + (angles.thetaX.toFixed(1)).toString() + "°");
          console.log("y: " + (angles.thetaY.toFixed(1)).toString() + "°");
        }
      }
    }
    if (facedetButton.innerHTML == '<i class="bi-person-square"></i>'){
      sleep(50).then(() => { detectFaceFunc(); });
    }
  }

  facedetButton.onclick = () => {
    if (facedetButton.innerHTML == '<i class="bi-person-bounding-box"></i>') {
      checkLoaded("Face detection enabled").then((flag) => {
      switch (flag){
        case true:
          enable(facedetButton);
          pressed(facedetButton);
          detectFaceFunc();
          break;
        case false:
          break;
      }
      });
    } else {
      enable(ballButton);
      enable(signdetButton);
      enable(objdetButton);
      enable(enrollButton);
      enable(recogButton);
      hide(faceSettings);
      notPressed(facedetButton);
      sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
    }
  }

  var faceMatcher,
      labeledDescriptors = [],
      faceapiFlag = 0,
      i = 0,
      html = "",
      name = "";

  // FACE ID
  enrollButton.onclick = () => {
    const enrollEnabled = enrollButton.innerHTML == '<i class="bi-person-plus"></i>';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (enrollEnabled) {
      if (faceapiFlag == 0){
        loadFaceapiModels();
      }
      checkLoaded("Face enrollment enabled").then((flag) => {
        switch (flag){
          case true:
            show(faceSettings);
            enable(enrollButton);
            pressed(enrollButton);
            hide(settings);
            notPressed(settingsButton);
            hide(information);
            notPressed(infoButton);
            break;
          case false:
            break;
        }
      });
    }else {
      enable(ballButton);
      enable(signdetButton);
      enable(objdetButton);
      enable(facedetButton);
      enable(recogButton);
      notPressed(enrollButton);
      hide(faceSettings);
      }
  }

  async function loadFaceapiModels(){
    if (speed == 0){
      printOnScreen("Please wait until the lite models load","Helvetica",canvas.width);
      if (faceDetmodel0 == 0){ //https://raw.githubusercontent.com/geraldinebc/test/master/models/
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models/lite/face_detector');
        faceDetmodel0 = 1;
      }
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models/lite/face_landmark');
      console.log("Loaded lite models");
    }
    else{
      printOnScreen("Please wait until the full models load","Helvetica",canvas.width);
      if (faceDetmodel1 == 0){
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models/full/face_detector');
        faceDetmodel1 = 1;
      }
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models/full/face_landmark');
      console.log("Loaded full models");
    }
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models/full/face_recognition');
    faceapiFlag = 1;
  }

  reply_click = function(clicked_id){
    IDname = document.getElementById(("delete-" + clicked_id)).textContent;
    document.getElementById(("delete-" + clicked_id)).remove();
    document.getElementById((clicked_id)).remove();

    function IDindex(o) {
      return o.label == IDname;
    }

    let numID = labeledDescriptors.findIndex(IDindex);
    labeledDescriptors.splice(numID,1);
    console.log(labeledDescriptors);
    if (i == 1){
      faceMatcher = undefined;
    }
    else{
      faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
    }
    i--;
  }

  async function saveFaceFunc() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (speed == 0){
      model = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
      landmark = true;
    }
    else {
      model = new faceapi.SsdMobilenetv1Options();
      landmark = false;
    }
    const detection = await faceapi.detectSingleFace(video, model).withFaceLandmarks(landmark).withFaceDescriptor();
    enable(saveIDButton);
    saveIDButton.style.background = ('rgb(254, 175, 60)');

    if (!detection) {
      alert("No faces found")
    }
    else {
      let ID = labeledDescriptors.find(o => o.label == name);
      const prediction = faceapi.resizeResults(detection, { width: video.width, height: video.height });
      bbox = [prediction.detection._box._x, prediction.detection._box._y, prediction.detection._box._width, prediction.detection._box._height];
      printDetections(prediction.detection.score, 0.7, bbox, name);

      if (ID){
        if (ID.descriptors.length <= 5){
          ID.descriptors.push(detection.descriptor);
        }
        else{
          alert("You have reached the maximum number of views allowed");
        }
      }
      else{
        i++;
        if (i <= 6){
        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(String(name),[detection.descriptor]));
        html += "<div class=\"input-group\"><label id=\"delete-id" + i + "\">" + name + "</label>";
        html += "<button class=\"button inline-button\" onClick=\"reply_click(this.id)\" id=\"id" + i;
        html += "\"><i class=\"bi-trash\"></i></button></div>";
        document.getElementById('face-ID').innerHTML += html;
        html = "";
        }
        else{
          alert("You have reached the maximum number of face IDs allowed");
        }
      }
      faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
      sleep(1500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
    }
  }

  saveIDButton.onclick = () => {
    name = document.getElementById('fname').value
    if (name == ""){
      alert("Please enter an ID name");
    }
    else{
      disable(saveIDButton);
      if (faceapiFlag == 0){
        loadFaceapiModels();
      }
      saveFaceFunc();
    }
  }

  // FACE RECOGNITION
  var startFaceRec;

  async function recogFaceFunc() {
    if (faceMatcher == undefined){
      enable(ballButton);
      enable(signdetButton);
      enable(objdetButton);
      enable(facedetButton);
      enable(enrollButton);
      notPressed(recogButton);
      alert("Please add a face ID to enable face recognition");
    }
    else if (speed == 0){
      model = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
      landmark = true;
    }
    else {
      model = new faceapi.SsdMobilenetv1Options();
      landmark = false;
    }
    const t0 = performance.now();
    const results = await faceapi.detectAllFaces(video, model).withFaceLandmarks(landmark).withFaceDescriptors();
    const t1 = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText((1000/(t1 - t0)).toFixed(0).toString() + " fps",video.width-60,video.height-10);
    const detection = faceapi.resizeResults(results, { width: video.width, height: video.height });
    detection.forEach(fd => {
      const bestMatch = faceMatcher.findBestMatch(fd.descriptor);
      bbox = [fd.detection._box._x, fd.detection._box._y, fd.detection._box._width, fd.detection._box._height];
      printDetections(1-bestMatch.distance, 0.5, bbox, bestMatch.label.toString());
    })
    if (recogButton.innerHTML == '<i class="bi-person-check-fill"></i>'){
      sleep(50).then(() => { recogFaceFunc(); });
    }
  }

  recogButton.onclick = () => {
    if (recogButton.innerHTML == '<i class="bi-person-check"></i>') {
      checkLoaded("Face recognition enabled").then((flag) => {
      switch (flag){
        case true:
          enable(recogButton);
          pressed(recogButton);
          recogFaceFunc();
          break;
        case false:
          break;
      }
      });
    }else {
      enable(ballButton);
      enable(signdetButton);
      enable(objdetButton);
      enable(facedetButton);
      enable(enrollButton);
      notPressed(recogButton);
      sleep(500).then(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); });
    }
  }

  const controlBox = document.getElementById('control-box')

  rcButton.onclick = () => {
    if (rcButton.style.background == 'rgb(87, 87, 87)') {
      notPressed(rcButton);
      hide(controlBox);
      hide(settingsRC);
    }
    else {
      pressed(rcButton);
      show(controlBox);
      show(settingsRC);
      hide(settings);
      notPressed(settingsButton);
      hide(information);
      notPressed(infoButton);
    }
  }

  settingsButton.onclick = () => {
    if (settingsButton.innerHTML == '<i class="bi-gear"></i>') {
      stopStream();
      pressed(settingsButton);
      show(settings);
      notPressed(rcButton);
      hide(controlBox);
      enrollButton.innerHTML = '<i class="bi-person-plus"></i>'
      hide(faceSettings);
      notPressed(infoButton);
      hide(information);
    }
    else {
      notPressed(settingsButton);
      hide(settings);
    }
  }

  infoButton.onclick = () => {
    if (infoButton.innerHTML == '<i class="bi-info-circle"></i>') {
      pressed(infoButton);
      show(information);
      enrollButton.innerHTML = '<i class="bi-person-plus"></i>'
      hide(faceSettings);
      notPressed(rcButton);
      hide(controlBox);
      notPressed(settingsButton);
      hide(settings);
    }
    else {
      notPressed(infoButton);
      hide(information);
    }
  }

})