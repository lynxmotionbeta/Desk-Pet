const espIP = window.location.hostname;
//const espIP = "192.168.0.3";
var cameraGateway = `ws://${espIP}/camera`;
var gateway = `ws://${espIP}/cmd`;

//var gateway = `ws://192.168.1.104/wifi_data`;
var websocket;
var timeOutID;
var ip;

var connection_status = {
    "status": "", // 1 = connected, 0 = No Connected
    "ssid": "",
    "ip": ""
};

var clickCounter = 0;
const maxClicks = 5;

const stateMessage = document.querySelector('#state');
const ssid = document.querySelector('#ssidList');
const pass = document.querySelector('#pass');
const load = document.getElementById('loading');
const distanceField = document.getElementById('distance-value');
const camera = document.getElementById('image-container');
const copyButton = document.getElementById('copy');

var state = "CS";
window.addEventListener('load', onLoad);

function onLoad(event) {
    setTimeout(initCMDSocket, 500);
    setTimeout(initCAMSocket, 500);
    state = "CS"; 
    states();
}

function initCMDSocket() {
    console.log('Trying to open a WIFI WebSocket connection...');
    websocket = new WebSocket(gateway);
    websocket.onopen = onOpen;
    websocket.onclose = onClose;
    websocket.onmessage = onMessage;
}

function initCAMSocket() {
    console.log('Trying to open a WebSocket for CAMERA connection...');
    cameraWebsocket = new WebSocket(cameraGateway);
    cameraWebsocket.onmessage = onCamera;
    cameraWebsocket.onopen = onCamOpen;
    cameraWebsocket.onclose = onCamClose;
}

function onOpen(event) {
    console.log('Connection opened');
    websocket.send("#QNET\r"); //Request the connection status
}

function onClose(event) {
    // console.log('Connection closed');
    setTimeout(initCMDSocket, 3000);
    if (event.wasClean) {
        console.log(`Connection closed cleanly, code=${event.code} reason=${event.reason}`);
    } else {
        console.log('Connection died');
    }
}

function onCamOpen(event) {
    console.log('Camera Connection opened');
}

function onCamClose(event) {
    // console.log('Connection closed');
    setTimeout(initCAMSocket, 3000);
    if (event.wasClean) {
        console.log(`Connection closed cleanly, code=${event.code} reason=${event.reason}`);
    } else {
        console.log('Camera Connection died');
    }
}

function onCamera(response) {

    console.log("CAMERA; received image");
    console.log(response.data);

    const imageData = response.data;

    // Convert the Blob to an ArrayBuffer
    imageData.arrayBuffer().then((arrayBuffer) => {
        // Create a Blob using the ArrayBuffer
        const blob = new Blob([arrayBuffer]);

        // Create a URL to represent the Blob
        const imageURL = URL.createObjectURL(blob);

        // Create an image element and set its source
        const image = new Image();
        image.src = imageURL;
        image.classList.add('responsive-image'); // Add a CSS class to make the image responsive

        // Show the image in the browser
        camera.innerHTML = '';
        camera.appendChild(image);

        // Revoke the object URL after the image has loaded
        image.onload = () => {
            URL.revokeObjectURL(imageURL);
        };
    });
}

function onMessage(message){
    
    var cmdExp = /^\*([A-Z\s]+)(\d+)(.*)\r$/; // Para el comando tipo 3

    var decodedCMD = message.data.match(cmdExp);

    if (!decodedCMD) {
        console.log("Invalid command: \'"+ message.data+"\'");
        return;
    }

    var CMD = decodedCMD[1];
    var value = decodedCMD[2];
    var params = decodedCMD[3];
    console.log("COMMAND: " + CMD);
    console.log("VALUE: " + value);
    console.log("PARAMETERS: " + params);

    if (CMD === "QANET") {
        clearTimeout(timeOutID);
        console.log("NETWORKS message");
        let networks = params.split("@");
        networks.shift();
        console.log(networks);
        load.classList.add('hidden');   //If we receive networks message hide loading icon
        if (networks.length != value*2){
            console.log("ERROR, avoid to use @ in your Wi-Fi password");
        }
        showNetworks(networks);
        state = "CS";
        states();
    } else if (CMD === "QNET") {
        console.log("STATUS message");
        connection_status.status = value;
        let networks = params.split("@");
        networks.shift();
        console.log(networks);
        connection_status.ssid = networks[0];
        if(networks.length === 2){
            connection_status.ip = networks[1];
        }
        state = "CS";
        states();
    }else if (CMD === "QX") {
        console.log("DISTANCE message");
        console.log(value+"mm");
        distanceField.innerHTML = value + ' mm';
    }
}

function showNetworks(msg) {
    const ssids = [];
    const authProtocols = [];

    // Use 'let' instead of 'var' for better scoping, and use 'i' more appropriately
    for (let i = 0; i < msg.length; i += 2) {
        if(msg[i]) {
            ssids.push(msg[i]);
            authProtocols.push(msg[i+1]);
        }
    }

    let networksAvailable;// = '<option value="0" disabled selected>Select your network</option>';

    // Using 'index' from forEach() to replace 'option'
    ssids.forEach((item, index) => {
        networksAvailable += `<option value="${index}">${item}</option>`;
    });
    document.getElementById("ssidList").innerHTML = networksAvailable;
}

function time_func(sec) {
    console.log("TIME FUNCTION");
    timeOutID = setTimeout(function() {
      console.log(`Han pasado ${sec} segundos`);
      switch (state) {
        case "SN": // Scanning Networks
            load.classList.add("hidden");
            stateMessage.innerHTML = "Error, TIMEOUT.";
            state = "CS";
            setTimeout(states,3000);
            break;
        case "WC": // Waiting for connection
            stateMessage.innerHTML = "Please manually connect to DeskPet's wifi network and reload the page.";
            break;
        
      }
    }, sec * 1000);
}

function states(){
    console.log("state function");
    switch (state) {
        case "CS": //Connection status
                if (connection_status.status === "1"){
                    stateMessage.innerHTML = "DeskPet is connected to " + "\""+ connection_status.ssid +"\""  + " network with IP: "+ connection_status.ip;
                    copyButton.classList.remove("hidden");
                }else if(connection_status.status === "0"){
                    stateMessage.innerHTML = "DeskPet could no connect to " + "\""+connection_status.ssid+"\"" + " network";
                    copyButton.classList.add("hidden");
                }else{
                    stateMessage.innerHTML = "Waiting for connection";
                    copyButton.classList.add("hidden");
                }
            break;
        case "WC": //Waiting for connection
            stateMessage.innerHTML = "Connecting, please wait DeskPet will be restarted...";
            break;
        case "SN": // Scanning Networks
            load.classList.remove("hidden");    //Show loading icon when scan is pressed
            websocket.send("#QANET\r");
            time_func(8); //wait 8 sec for response 
            //stateMessage.innerHTML = "";
            break;
        default:
            console.log("states func: Invalid STATE: "+state);
        }
}

function connect() {
    if(state === "CS")
    {
        selected_network = "#CNET@"+ssid.options[ssid.selectedIndex].text
        if(pass.value){
            selected_network+="@"+pass.value;
        }
        selected_network+="\r";
        console.log(selected_network);
        websocket.send(selected_network);
        time_func(12); //wait 12 sec for response 
        state = "WC";
        states();
    }
       
}

function scan() {
    if(state === "CS" ){
        state = "SN";
        states();
    }
}

function copy() {
    //ip = ipAdd.innerHTML;
    console.log(connection_status.ip);
    copyToClipboard(connection_status.ip);
    //navigator.clipboard.writeText(connection_status.ip);
    alert("IP address copied: " + connection_status.ip);
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

function showPass() {
    var x = document.getElementById("pass");
    if(x.type === "text"){
        x.type = "password";
    }else{
        x.type = "text";
    }
    
}

//DEV OPTIONS
function devOptions(){
    clickCounter++;
    if (clickCounter === maxClicks) {
      const devOptions = document.getElementById("dev-options");
      devOptions.style.display = devOptions.style.display === "none" ? "block" : "none";
      clickCounter = 0;
    }
    setTimeout(() => { clickCounter = 0; }, 3000);
}

function toggleDevOptions() {
    const devOptions = document.getElementById("dev-options");
    devOptions.style.display = devOptions.style.display === "none" ? "block" : "none";
}

function adjustLEDBrightness(value) {
    // Implement the function to control LED brightness
    var brightnessPercentage = value + '%';
    const distanceField = document.getElementById('brightness-value');
    distanceField.innerHTML = brightnessPercentage;
    console.log("Brightness: "+value);
    websocket.send("#FL"+value+"\r");
  }
  
function toggleDistanceMeasurement(button) {
    // Implement the function to enable/disable distance measurement in mm
    websocket.send("#QX\r");
}

function requestJpegImage() {
    cameraWebsocket.send("#QIMG\r");
}