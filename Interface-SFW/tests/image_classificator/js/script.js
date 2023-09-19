import {LSS} from "./communication.js"


////////////////// VARIABLES
var videoContainer = document.getElementById('video-container'),
    video = document.getElementById('video'),
    streamButton = document.getElementById('toggle-stream');


const espIP = "192.168.0.3";
var deskpet = new LSS(espIP);

/////////////// WEBSOCKET FUNCTIONS
window.addEventListener('load', onLoad);
  
function onLoad() {
    setTimeout(deskpet.connectCAMSocket(video), 500);
    loadTeachableModel();
}

//////////////// BUTTONS & TRIGGERS

streamButton.onclick = () => {
    if (streamButton.innerHTML == '<i class="bi-camera-video-off"></i>') {
        videoContainer.classList.add('hidden');
        videoContainer.hidden = true;
        streamButton.style.background = ('rgb(57, 57, 57)');
        streamButton.innerHTML = '<i class="bi-camera-video"></i>';
        deskpet.stopStreaming();
    } else {
        videoContainer.classList.remove('hidden');
        videoContainer.hidden = false;
        streamButton.style.background = ('rgb(87, 87, 87)');
        streamButton.innerHTML = '<i class="bi-camera-video-off"></i>';

        //Start websocket streaming
        deskpet.startStreaming();
        predictionLoop();
    }
}

function predictionLoop() {
    if (!videoContainer.hidden) {
        if (video.complete && video.naturalWidth !== 0) {
            predict().then(() => {
                requestAnimationFrame(predictionLoop);
            });
        }
        else {
            requestAnimationFrame(predictionLoop);
        }
    }
}

//////////////  AI MODELS

// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image

// the link to your model provided by Teachable Machine export panel
var model, webcam, labelContainer, maxPredictions;

// Load the image model 
async function loadTeachableModel() {
    const iaModelURL = "./models/tm-model/";
    const modelURL = iaModelURL + "model.json";
    const metadataURL = iaModelURL + "metadata.json";

    // load the model and metadata
    // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
    // or files from your local hard drive
    // Note: the pose library adds "tmImage" object to your window (window.tmImage)
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) { // and class labels
        labelContainer.appendChild(document.createElement("div"));
    }
}

var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d"); 
// run the webcam image through the image model
async function predict() {
    // predict can take in an image, video or canvas html element
    canvas.height = video.height;
    canvas.width = video.width;
    context.drawImage(video, 0, 0, video.width, video.height); 

    const prediction = await model.predict(canvas);
    console.log(prediction[1].probability);
    for (let i = 0; i < maxPredictions; i++) {
        let prob = (prediction[i].probability * 100).toFixed(0);
        let red = 255 - i * 5;
        let green = 250 - i * 50;
        let blue = 50 - i * 10;
        var classPrediction = "<div class=\"bar-graph-holder\"><div class=\"bar-graph-label\">" + prediction[i].className + "&nbsp;</div><div class=\"detections-holder\"><div class=\"bar-graph\" style=\"background:rgb(";
        classPrediction += red + "," + green + "," + blue + "); width:" + prob + "%\"><span class=\"value-label\">&nbsp;" + prob + "%</span></div></div></div>";
        labelContainer.childNodes[i].innerHTML = classPrediction;
    }
}



