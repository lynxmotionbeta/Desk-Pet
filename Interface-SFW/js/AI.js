import { sleep, show, hide, enable, disable, pressed, notPressed, isPressed, waitMessage, alertMessage } from "./utils.js"
import { RESPONSE, deskpet } from "./communication.js"

//// HEADER BUTTONS
export var ballButton,
    signdetButton,
    objdetButton,
    facedetButton,
    enrollButton,
    recogButton,
    faceSettings;

var saveIDButton;

var visionMode;

var objects,
    sequences,
    objectSequenceButton;

//// canvas
var video,
    canvas,
    ctx;

export function getHeaderIAButtons() {

    visionMode = document.getElementById('mode');

    //// canvas
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    ballButton = document.getElementById('ball-track');
    signdetButton = document.getElementById('sign-detect');
    objdetButton = document.getElementById('object-detect');
    facedetButton = document.getElementById('face-detect');
    enrollButton = document.getElementById('face-add');
    recogButton = document.getElementById('face-recog');

    faceSettings = document.getElementById('face-settings'); // face id settings
    saveIDButton = document.getElementById('save-id');       // stores face id


    objects = document.getElementById('objects');
    sequences = document.getElementById('sequences');
    objectSequenceButton = document.getElementById('object-sequence');

    objdetButton.addEventListener('click', handleObjDetButtonClick);
    signdetButton.addEventListener('click', handleSignDetButtonClick);
    ballButton.addEventListener('click', handleBallButtonClick);
    facedetButton.addEventListener('click', handleFaceDetButtonClick);
    enrollButton.addEventListener('click', handleEnrollButtonClick);
    recogButton.addEventListener('click', handleRecogButtonClick);
    saveIDButton.addEventListener('click', handleSaveIDButtonClick);

    visionMode.addEventListener('change', handleVisionModeChange);

}

// Function to handle the change event of the "Vision Mode" checkbox
function handleVisionModeChange() {
    // Reset flags and variables

    faceapiFlag = 0;
    signDetmodel = undefined;

    if (visionMode.checked) {
        // Perform actions when the checkbox is checked (PC Mode)
        console.log("Changed to PC Mode");
        speed = 1;
    } else {
        // Perform actions when the checkbox is unchecked (Mobile Mode)
        console.log("Changed to Mobile Mode");
        speed = 0;
    }

}

/////////////////////// START OBJECT DETECTION

// Function to handle the click event of the "Object Detection" button
function handleObjDetButtonClick() {
    if (!isPressed(objdetButton)) {
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

var objDetmodel0,
    objDetmodel1;

async function objdetButtonFunc() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (speed == 0) {
        if (objDetmodel0 == null) {
            objDetmodel0 = await waitMessage(() => tflite.loadTFLiteModel('models/lite/object_detection/ssd_mobilenet_v3.tflite'), "Loading Obj. Model", "Please wait until the lite model loads");
            console.log("Loaded lite model");
        }
        const t0 = performance.now();
        tf.engine().startScope();
        const img = tf.browser.fromPixels(video).resizeBilinear([320, 320]).toInt().expandDims();
        const outputTensor = await objDetmodel0.predict(img);
        const boxes = await outputTensor['TFLite_Detection_PostProcess'].arraySync();
        const classes = await outputTensor['TFLite_Detection_PostProcess:1'].dataSync();
        const scores = await outputTensor['TFLite_Detection_PostProcess:2'].arraySync();
        const detections = buildDetections(scores, boxes, classes, classesCoco, 0.5, video);
        tf.engine().endScope();
        const t1 = performance.now();
        updateCanvas();
        printFPS((t1 - t0), "Helvetica");
        for (const detection of detections) {
            const { score, bbox, class: label } = detection;
            printDetections(score, 0.6, bbox, classesCoco[label + 1].name);
        }
    }
    else {
        if (objDetmodel1 == null) {
            objDetmodel1 = await waitMessage(() => cocoSsd.load(), "Loading Obj. Model", "Please wait until the full model loads");
            console.log("Loaded full model");
        }
        const t0 = performance.now();
        tf.engine().startScope();
        const detections = await objDetmodel1.detect(video, 5, 0.7);
        tf.engine().endScope();
        const t1 = performance.now();
        updateCanvas();
        printFPS((t1 - t0), "Helvetica");
        for (const detection of detections) {
            const { score, bbox, class: label } = detection;
            printDetections(score, 0.6, bbox, label);
        }
    }

    if (isPressed(objdetButton)) {
        sleep(50).then(() => { objdetButtonFunc(); });
    }
}

const classesCoco = {
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
/////////////////////// END OBJECT DETECTION


/////////////////////// START FACE DETECTION

// Function to handle the click event of the "Face Detection" button
function handleFaceDetButtonClick() {
    if (!isPressed(facedetButton)) {
        // Check if "Face detection" is loaded
        checkLoaded("Face detection enabled").then((flag) => {
            if (flag) {
                updateCanvas();
                // Enable and perform actions when the button is pressed
                enable(facedetButton);
                pressed(facedetButton);
                detectFaceFunc();
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

var faceDetmodel0 = 0,
    faceDetmodel1 = 0;

var faceModel;

async function detectFaceFunc() {
    updateCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!faceModel) {
        if (speed == 0) {
            if (faceDetmodel0 == 0) {
                await waitMessage(() => faceapi.nets.tinyFaceDetector.loadFromUri('/models/lite/face_detector'), "Loading Model", "Please wait until the lite model loads");
                faceDetmodel0 = 1;
                console.log("Loaded lite model");
            }
            faceModel = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
        }
        else {
            if (faceDetmodel1 == 0) {
                await waitMessage(() => faceapi.nets.ssdMobilenetv1.loadFromUri('/models/full/face_detector'), "Loading Model", "Please wait until the full model loads");
                faceDetmodel1 = 1;
                console.log("Loaded full model");
            }
            faceModel = new faceapi.SsdMobilenetv1Options();
        }
    }

    const t0 = performance.now();
    var results = await faceapi.detectAllFaces(video, faceModel);
    const t1 = performance.now();
    printFPS((t1 - t0), "Helvetica");
    if (results != null) {
        const predictions = faceapi.resizeResults(results, { width: video.width, height: video.height })
        let i = 0;
        for (i in predictions) {
            var bbox = [];
            bbox = [predictions[i].box.x, predictions[i]._box.y, predictions[i].box.width, predictions[i].box.height];
            printDetections(predictions[i].score, 0.6, bbox, "");

            //pitch and yaw angles for tracking
            // if (predictions[i].score > 0.6) {
            //   const fx = predictions[i].box.x + predictions[i].box.width / 2;
            //   const fy = predictions[i].box.y + predictions[i].box.height / 2;
            //   let angles = getAngles(fx, fy, 0, "face");
            //   console.log("x: " + (angles.thetaX.toFixed(1)).toString() + "°");
            //   console.log("y: " + (angles.thetaY.toFixed(1)).toString() + "°");
            // }
        }
    }
    if (isPressed(facedetButton)) {
        sleep(50).then(() => { detectFaceFunc(); });
    }
}

/////////////////////// END FACE DETECTION

/////////////////////// START FACE RECOGNITION

var faceMatcher,
    faceID = 0,
    labeledDescriptors = [],
    faceapiFlag = 0,
    faceDescritorFlag = false,
    faceModel;
var landmark;

async function loadFaceapiModels() {
    if (visionFlag == 0) {
        await checkInfSpeed();
        visionFlag = 1;
    }

    if (speed == 0) {
        if (faceDetmodel0 == 0) {
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models/lite/face_detector');
            faceDetmodel0 = 1;
        }
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models/lite/face_landmark');
        console.log("Loaded lite models");
    }
    else {
        if (faceDetmodel1 == 0) {
            await faceapi.nets.ssdMobilenetv1.loadFromUri('/models/full/face_detector');
            faceDetmodel1 = 1;
        }
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models/full/face_landmark');
        console.log("Loaded full models");
    }
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models/full/face_recognition');
    faceapiFlag = 1;
}

async function handleEnrollButtonClick() {
    const enrollEnabled = enrollButton.innerHTML == '<i class="bi-person-plus"></i>';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!faceDescritorFlag) {
        const result = await waitMessage(loadFaceDescriptor, "Loading learned faces", "Please wait...");
        if (!faceDescritorFlag && !result) {
            alertMessage("Error Loading learned faces", "Please check your connection.", "Close");
            notPressed(enrollButton);
            return;
        }
    }

    if (enrollEnabled) {
        if (faceapiFlag == 0) {
            waitMessage(loadFaceapiModels, "Loading models", "Loading IA face recognition models, please wait...");
        }

        checkLoaded("Face enrollment enabled").then((flag) => {
            switch (flag) {
                case true:
                    show(faceSettings);
                    enable(enrollButton);
                    pressed(enrollButton);
                    //hide(settings);
                    //notPressed(settingsButton);
                    //hide(information);
                    //notPressed(infoButton);
                    break;
                case false:
                    break;
            }
        });
    } else {
        enable(ballButton);
        enable(signdetButton);
        enable(objdetButton);
        enable(facedetButton);
        enable(recogButton);
        notPressed(enrollButton);
        hide(faceSettings);
    }
}

async function loadFaceDescriptor() {
    console.log(">>>>>>>>>>>>> LOADING FACES");
    const result = await deskpet.loadFaces();

    if (result[0] === RESPONSE.OK && result[1] != null) {
        const decodedArray = JSON.parse(result[1]);
        if (decodedArray.length > 0) {
            console.log(decodedArray);
            // Initialize the array of descriptors
            labeledDescriptors = [];
            // Iterate over objects in the decoded array
            decodedArray.forEach((descriptorObject) => {
                const descriptors = descriptorObject.descriptors;
                const label = descriptorObject.label;

                let descriptorArray = [];
                descriptors.forEach((descriptor) => {
                    descriptorArray.push(new Float32Array(descriptor));
                });

                labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(label, descriptorArray));
                addFaceId(label);
            });

            faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
            faceID = labeledDescriptors.length;
            console.log(">>>>>>>>>>>>> " + faceID + " FACES LADED");
            console.log(labeledDescriptors);

            faceDescritorFlag = true;
        }
        return true;
    } else {
        console.log(">>>>>>>>>>>>> Error loading faces");
        return false;
    }
}

//// SAVE FACE ID

function handleSaveIDButtonClick() {
    const name = document.getElementById('fname').value;
    if (name === "") {
        // Alert if no ID name is entered
        alertMessage("Alert", "Please first enter an ID name", "OK");
    } else {
        // Perform actions when a valid ID name is entered
        disable(saveIDButton);
        if (faceapiFlag === 0) {
            loadFaceapiModels();
        }
        saveFaceFunc(name);
    }
}

async function saveFaceFunc(name) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var faceName = name;
    var isEnrolled = false;
    
    if (!faceModel) {
        if (speed == 0) {
            faceModel = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
            landmark = true;
        } else {
            faceModel = new faceapi.SsdMobilenetv1Options();
            landmark = false;
        }
    }
    const detection = await faceapi.detectSingleFace(video, faceModel).withFaceLandmarks(landmark).withFaceDescriptor();
    enable(saveIDButton);
    saveIDButton.style.background = 'rgb(254, 175, 60)';

    if (!detection) {
        alertMessage("No faces found", "", "OK");

    } else {
        const prediction = faceapi.resizeResults(detection, { width: video.width, height: video.height });

        // Check if this face is already enrolled
        if (faceID >= 1) {
            const bestMatch = faceMatcher.findBestMatch(prediction.descriptor);
            if (bestMatch.label !== "unknown" && faceName !== bestMatch.label) {
                isEnrolled = true;
                faceName = bestMatch.label.toString();
                alertMessage("Alert", "This face is already enrolled with the name: " + bestMatch.label.toString(), "Cancel");
            }
        }

        var bbox = [prediction.detection._box._x, prediction.detection._box._y, prediction.detection._box._width, prediction.detection._box._height];
        printDetections(prediction.detection.score, 0.7, bbox, faceName);
        if (!isEnrolled) {

            let ID = labeledDescriptors.find(o => o.label == faceName);
            if (ID) {
                if (ID.descriptors.length < 5) {
                    ID.descriptors.push(detection.descriptor);
                    // Update face array and save it in the ESP
                    faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
                    deskpet.storeFaces(labeledDescriptors);
                } else {
                    alertMessage("Alert", "You have reached the maximum number of views allowed", "OK");
                }
            } else {
                faceID++;
                if (faceID <= 6) {
                    labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(String(faceName), [detection.descriptor]));
                    addFaceId(faceName);
                    // Update face array and save it in the ESP
                    faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
                    deskpet.storeFaces(labeledDescriptors);
                } else {
                    alertMessage("Alert", "You have reached the maximum number of face IDs allowed", "OK");
                }
            }

        }

        sleep(1500).then(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
    }
}

function addFaceId(faceName) {
    let html = "<div class=\"input-group\"><label id=\"delete-id" + faceID + "\">" + faceName + "</label>";
    html += "<button class=\"button inline-button\" id=\"id" + faceID + "\"><i class=\"bi-trash\"></i></button></div>";
    document.getElementById('face-ID').insertAdjacentHTML('beforeend', html);
    const deleteButtons = document.querySelectorAll("#face-ID button");
    deleteButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            reply_click(this.id);
        });
    });
}

function reply_click(clicked_id) {

    // Get the parent div of the button
    const selectedFace = document.getElementById("delete-" + clicked_id);

    if (selectedFace) {
        const closestInputGroup = selectedFace.closest('.input-group');

        if (closestInputGroup) {
            // Get the text content of the element inside the div
            const IDname = closestInputGroup.querySelector('label').textContent;

            // Remove the div and its content
            closestInputGroup.remove();

            // Search for and remove the descriptor in the array
            function IDindex(o) {
                return o.label == IDname;
            }

            let numID = labeledDescriptors.findIndex(IDindex);
            labeledDescriptors.splice(numID, 1);

            // Update the faceMatcher if necessary
            if (faceID > 1) {
                faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
            } else {
                faceMatcher = undefined;
            }

            // Decrease the variable i
            faceID--;

            deskpet.storeFaces(labeledDescriptors);
        }
    }
}

//// RECOGNITION FUNCTION

// Function to handle the click event of the "Recognition" button
async function handleRecogButtonClick() {
    if (faceapiFlag == 0) {
        await waitMessage(loadFaceapiModels, "Loading models", "Loading IA face recognition models, please wait...");
    }

    if (!faceDescritorFlag) {
        const result = await waitMessage(loadFaceDescriptor, "Loading learned faces", "Please wait...");
        if (!faceDescritorFlag) {
            if (result) {
                alertMessage("No stored faces", "Please add a face ID to enable face recognition.", "Close");
            } else {
                alertMessage("Error Loading learned faces", "Please check your connection.", "Close");
            }
            notPressed(recogButton);
            return;
        }
    }
    if (faceMatcher === undefined) {
        alertMessage("No stored faces", "Please add a face ID to enable face recognition.", "Close");
        notPressed(recogButton);
        return;
    }
    if (!faceModel) {
        if (speed == 0) {
            faceModel = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
            landmark = true;
        }
        else {
            faceModel = new faceapi.SsdMobilenetv1Options();
            landmark = false;
        }
    }
    if (!isPressed(recogButton)) {
        checkLoaded("Face recognition enabled").then((flag) => {
            if (flag) {
                // Perform actions when the button is pressed and face recognition is enabled
                enable(recogButton);
                pressed(recogButton);
                recogFaceFunc();
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

async function recogFaceFunc() {
    const t0 = performance.now();
    const results = await faceapi.detectAllFaces(video, faceModel).withFaceLandmarks(landmark).withFaceDescriptors();
    const t1 = performance.now();
    printFPS((t1 - t0), "Helvetica");
    const detection = faceapi.resizeResults(results, { width: video.width, height: video.height });
    var bestMatch;
    var bbox;
    detection.forEach(fd => {
        bestMatch = faceMatcher.findBestMatch(fd.descriptor);
        bbox = [fd.detection._box._x, fd.detection._box._y, fd.detection._box._width, fd.detection._box._height];
        printDetections(1 - bestMatch.distance, 0.5, bbox, bestMatch.label.toString());
    });

    if (isPressed(recogButton)) {
        sleep(50).then(() => { recogFaceFunc(); });
    }
}

/////////////////////// END FACE RECOGNITION


/////////////////////// START SIGN DETECTION

// Function to handle the click event of the "Sign Detection" button
function handleSignDetButtonClick() {
    if (!isPressed(signdetButton)) {
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

var signDetmodel,
    box,
    score,
    classn,
    thresh,
    modelName;

async function signdetButtonFunc() {
    if (signDetmodel == undefined) {
        if (speed == 0) {
            modelName = "/models/lite/sign_detector/model.json";
            box = 0;
            score = 2;
            classn = 3;
            thresh = 0.55;
            console.log("Loaded lite models");
        }
        else {
            modelName = "/models/full/sign_detector/model.json";
            box = 0;
            score = 7;
            classn = 5;
            thresh = 0.75;
            console.log("Loaded full models");
        }
        console.log("Loaded SIGN models");
        signDetmodel = await waitMessage(() => tf.loadGraphModel(modelName), "Loading Model", "Please wait until the model is completely loaded.");
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

    const detections = buildDetections(scores, boxes, classes, classesSign, thresh, video);

    tf.engine().endScope();
    const t1 = performance.now();
    printFPS((t1 - t0), "Helvetica");

    let i = 0;
    for (i in detections) {
        printDetections(detections[i].score, 0.6, detections[i].bbox, detections[i].label);
    }

    if (isPressed(signdetButton)) {
        sleep(50).then(() => { signdetButtonFunc(); });
    }
}

const classesSign = {
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

/////////////////////// END SIGN DETECTION

/////////////////////// START BALL TRACKING

// Function to handle the click event of the "Ball Tracking" button
function handleBallButtonClick() {
    if (!isPressed(ballButton)) {
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

// BALL TRACKING
var ballModel0,
    ballModel1;

let classBall = {
    1: {
        id: 1,
        name: "sports ball",
    }
};
async function ballTracking() {
    var predictions;
    if (speed == 0) {
        if (ballModel0 == undefined) {
            ballModel0 = await waitMessage(() => cocoSsd.load({ base: 'mobilenet_v1' }), "Loading Model", "Please wait until the lite model loads");
        }
        const t0 = performance.now();
        tf.engine().startScope();
        const tfimg = tf.browser.fromPixels(video).toInt();
        const expandedimg = tfimg.expandDims();
        const detections = await ballModel0.executeAsync(expandedimg);
        // console.log(detections);
        const boxes = detections[3].arraySync();//output_3
        const scores = detections[1].arraySync();//Identity_1.0
        const classes = detections[5].dataSync();//Identity_2.0
        tf.engine().endScope();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        predictions = buildDetections(scores, boxes, classes, classBall, 0.7, video);
        const t1 = performance.now();
        printFPS((t1 - t0), "Helvetica");
    }
    else {
        if (ballModel1 == undefined) {
            ballModel1 = await waitMessage(() => cocoSsd.load({ base: 'mobilenet_v1' }), "Loading Model", "Please wait until the full model loads");
        }
        const t0 = performance.now();
        tf.engine().startScope();
        predictions = await ballModel1.detect(video, 5, 0.4);
        tf.engine().endScope();
        const t1 = performance.now();
        printFPS((t1 - t0), "Helvetica");
    }

    var ballxArray = [],
        ballyArray = [],
        balldistArray = [];
    let i = 0;
    for (i in predictions) {
        if (predictions[i].class == "sports ball" || predictions[i].label == "sports ball") {
            let radius = (predictions[i].bbox[2] + predictions[i].bbox[3]) / 4;
            let x = predictions[i].bbox[0] + predictions[i].bbox[2] / 2;
            let y = predictions[i].bbox[1] + predictions[i].bbox[3] / 2;
            drawCircle(ctx, x, y, radius, 0, 'blue', 3);
            //ctx.font = (size / 2).toString() + 'px Helvetica';
            ctx.fillStyle = "blue";
            let ball = getAngles(x, y, radius, "ball");
            ballxArray.push(ball.thetaX.toFixed(1));
            ballyArray.push(ball.thetaY.toFixed(1));
            balldistArray.push((ball.distance / 10).toFixed(1));
        }
    }
    if (balldistArray.length != 0) {
        var closest = balldistArray.reduce(function (lowestIndex, element, index, array) {
            return element < array[lowestIndex] ? index : lowestIndex;
        }, 0);
        // For testing
        let fx = "x: " + ballxArray[closest].toString() + "°";
        let fy = "y: " + ballyArray[closest].toString() + "°";
        let distance = "dist: " + balldistArray[closest].toString() + "cm";
        ctx.fillText(fx, predictions[closest].bbox[0] + predictions[closest].bbox[2] + 10, predictions[closest].bbox[1] + predictions[closest].bbox[3] / 2);
        ctx.fillText(fy, predictions[closest].bbox[0] + predictions[closest].bbox[2] / 2 - 10, predictions[closest].bbox[1] - 10);
        ctx.fillText(distance, predictions[closest].bbox[0] + predictions[closest].bbox[2] / 2 - 10, predictions[closest].bbox[1] + predictions[closest].bbox[3] + 20);
    }
    if (isPressed(ballButton)) {
        sleep(50).then(() => { ballTracking(); });
    }
}


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

/////////////////////// END BALL TRACKING

//// UTILS

function printFPS(timeDif, fontFace) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let size = canvas.width / 32;
    ctx.font = `${size}px ${fontFace}`;
    ctx.fillStyle = "white";
    ctx.fillText((1000 / timeDif).toFixed(0).toString() + " fps", canvas.width - 4 * size, canvas.height - 10);
}

function updateCanvas() {
    canvas.width = video.width;
    canvas.height = video.height;
}
function getAngles(u, v, radiusPX, type) {
    var mx = 2560 / 640,
        my = 1920 / 480;

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
    const x = (u * mx - cx) / fx;
    const y = (v * my - cy) / fy;
    const thetaX = Math.atan(x) * 180 / Math.PI;
    const thetaY = Math.atan(y) * 180 / Math.PI;
    if (type == "ball") {
        var realRadius = 33.44; // Tennis ball
        var radiusMM = radiusPX / ((fx + fy) / (mx + my));
        var distance = realRadius / radiusMM;
    }
    else {
        var distance = 0;
    }
    return {
        thetaX,
        thetaY,
        distance
    };
}

// Print detection bounding boxes and labels
function printDetections(score, thresh, bbox, label) {
    if (score >= thresh) {
        ctx.strokeStyle = 'white';
        ctx.font = "17px Helvetica";
        ctx.fillStyle = "white";
        ctx.strokeRect(bbox[0], bbox[1], bbox[2], bbox[3]);
        ctx.fillText(label, bbox[0] + 5, bbox[1] + 15);
        ctx.fillText(score.toFixed(2), bbox[0] + bbox[2] - 36, bbox[1] + bbox[3] - 15);
    }
}

// Build detection objects from scores, boxes, and classes
function buildDetections(scores, boxes, classes, classesDir, thresh, video) {
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

            let labelid;
            if (classesDir == classesCoco) {
                labelid = classesDir[classes[i] + 1].name;
            } else {
                labelid = classesDir[classes[i]].name;
            }

            detectionObjects.push({
                class: classes[i],
                label: labelid,
                score: score,
                bbox: bbox
            });
        }
    });

    return detectionObjects;
}

var visionFlag = 0,
    speed = 0;

async function checkLoaded(el) {
    var flag = false;
    if (video.complete && video.naturalHeight !== 0) {
        console.log(el);
        updateCanvas();
        disable(ballButton);
        disable(signdetButton);
        disable(objdetButton);
        disable(enrollButton);
        disable(facedetButton);
        disable(recogButton);
        flag = true;

        if (visionFlag == 0) {
            await checkInfSpeed();
            visionFlag = 1;
        }

    } else {
        alertMessage("Alert", "Video has not loaded yet", "OK");
        //alert("Video has not loaded yet");
    }

    return flag;
}

async function checkInfSpeed() {
    if (visionFlag == 0) {
        let sum = 0;
        for (let i = 0; i <= 10; i++) {
            performance.mark('mark1');
            await objdetButtonFunc();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            performance.mark('mark2');
            performance.measure('markMeasure', 'mark1', 'mark2');
            if (i > 2) {
                sum = sum + performance.getEntriesByName('markMeasure')[i].duration;
            }
        }
        var mean = sum / 8;
        console.log("Inference speed (ms): " + mean.toFixed(1));
        // ctx.font = "17px Helvetica";
        if (mean <= 150) {
            speed = 1;
            visionMode.checked = "checked";
            console.log("Default vision mode: PC");
        } else {
            console.log("Default vision mode: Mobile");
        }
    }
}
