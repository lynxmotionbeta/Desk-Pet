// document.addEventListener('DOMContentLoaded', function (event) {
//     switch(window.orientation) 
//     {  
//         case -90: case 90: /* Device is in landscape mode */
//             break; 
//         default:    /* Device is in portrait mode */
//             window.orientation = window.orientation-90;
//             break;
//     }
// });

var gateway = `ws://${window.location.hostname}/ws`;
var websocket;
// var ip;
// var data = { TYPE: "NETWORKS" };
// const stateMessage = document.querySelector('#state');
// const ipAdd = document.querySelector('#ipAdd');
// const showIp = document.querySelector('#ip');
// const ssid = document.querySelector('#ssidList');
// const pass = document.querySelector('#pass');

window.addEventListener('load', onLoad);

function initWebSocket() {
    console.log('Trying to open a WebSocket connection...');
    websocket = new WebSocket(gateway);
    websocket.onopen = onOpen;
    websocket.onclose = onClose;
    websocket.onmessage = onMessage;
}
function onOpen(event) {
    console.log('Connection opened');
    websocket.send("Scan");
}
function onClose(event) {
    console.log('Connection closed');
    setTimeout(initWebSocket, 2000);
}
function onMessage(event) {
 console.log(event.data);
 var msg = JSON.parse(event.data);
 if(msg.hasOwnProperty("networks")){
    showNetworks(msg);
    load.classList.add('hidden');   //If we receive networks message hide loading icon
    load.hidden = true;
 }
}

function showNetworks(msg){
    var networksAvailable = '<option value="0" disabled selected>Select your network</option>';
    var option = 1;
    msg["networks"].forEach((item) => {
       console.log('SSID:' + item.ssid);
       networksAvailable += '<option value="'+option+'">'+item.ssid+'</option>';
     });
    document.getElementById("ssidList").innerHTML = networksAvailable;
}
/////////////////////////////
const load = document.getElementById('loading');

function scan() {
    load.classList.remove('hidden');    //Show loading icon when scan is pressed
    load.hidden = false;
    websocket.send("Scan");
}
////////////////////////////
function onLoad(event) {
    initWebSocket();
}

// function toggle() {
//     console.log(ssid.options[ssid.selectedIndex].text);
//     console.log(pass.value);
//     stateMessage.innerHTML = "Connecting, please wait..."
//     ipAdd.style.visibility = 'hidden';
//     data.Ssid = ssid.options[ssid.selectedIndex].text;
//     data.Pass = pass.value;
//     dataStrign = JSON.stringify(data);
//     console.log(data);
//     console.log(dataStrign);
//     websocket.send(dataStrign);
// }
// function copy() {
//     ip = ipAdd.innerHTML;
//     navigator.clipboard.writeText(ip);
//     alert("Copied the text: " + ip);
// }

console.log("Javascript code");