class ComponentData {
    constructor() {
        this.status = 0;
        this.value = null;
    }
}

//////  COMMANDS

//// SENSORS
//Distance
const queryDistanceCMD = "QX";
//Battery
const queryBatteryVoltageCMD = "QV";
//Light
const queryLightSensorCMD = "QLS";
//Push button
const queryPushButtonCMD = "QPB";
///IMU

//IMAGE
const queryImageCMD = "QIMG"; // Unofficial LSS standard command

//// PERIPHERALS
//RGB LEDs color
const setLedsCMD = "LED";
const configLedsCMD = "CLED";
const queryLedsCMD = "QLED";
//RGB LEDS blinking mode
const setLedBlinkingCMD = "LB";
const configLedBlinkingCMD = "CLB";
const queryLedBlinkingCMD = "QLB";
//Frontal (camera) LEDs
const setFrontLightsCMD = "FL";
//Buzzer
const setBuzzerCMD = "B";

//// MOTIONS
//// WIRELESS
//// SERVOS

////// VALUES
const query_commands = {
    "QX": new ComponentData(),
    "QV": new ComponentData(),
    "QLS": new ComponentData(),
    "QPB": new ComponentData(),
    "QLED": new ComponentData(),
    "QLB": new ComponentData()
};

const COLORS = {
    "Off": '0', // (black)
    "Red": '1',
    "Green": '2',
    "Blue": '3',
    "Yellow": '4',
    "Cyan": '5',
    "Magenta": '6',
    "White": '7'
}

const MODES = {
    "Off": "0", //Static
    "Blinking": "1", // 1Hz
    "Dimming": "2"  // 0.5Hz
}

const CHECK_INTERVAL = 50; // ms
const RESPONSE_TIMEOUT_MS = 1000; //ms

const RESPONSE_OK = 0;
const RESPONSE_RECEIVED = -1;
const WAITING_RESPONSE = 1;
const TIMEOUT_RESPONSE = 2;
const ERROR_RESPONSE = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForCommandResponse(cmd) {
    const startTime = Date.now();
    while (true) {
        switch (query_commands[cmd].status) {
            case RESPONSE_RECEIVED:
                console.log("Command received");
                query_commands[cmd].status = RESPONSE_OK;
                return [RESPONSE_OK, query_commands[cmd].value];
            case WAITING_RESPONSE:
                console.log("Waiting response");
                if (Date.now() - startTime > RESPONSE_TIMEOUT_MS) {
                    query_commands[cmd].status = RESPONSE_OK; // Leave the status available for another transmission.
                    return [TIMEOUT_RESPONSE, 0];
                }
                await sleep(CHECK_INTERVAL);
                break;
            default:
                console.log("ERROR | Invalid Query Status");
                return [ERROR_RESPONSE, 0];
        }
    }
}

function genericQuerySet(cmd,value){
    if (cmd in query_commands) {
        query_commands[cmd].value = value;
        if(query_commands[cmd].status === WAITING_RESPONSE){
            query_commands[cmd].status = RESPONSE_RECEIVED;
        }else{
            query_commands[cmd].status = RESPONSE_OK; // Leave the status available for another transmission.
            console.log("ERROR| Unexpected message: " + cmd);
        }
    } else {
        console.log("ERROR| Command not supported, CMD: " + cmd);
    }
}

export class LSS {
    constructor(gateway) {
        this.gateway = gateway; 
        this.cmdSK = null;
        this.cameraSK = null;
        this.imgDisplay = null;
    }

    //////////////////////////////// CMD CONNECTION

    connectCMDSocket() {
        // Commands Socket       
        this.cmdSK = new WebSocket(`ws://${this.gateway}/cmd`);

        this.cmdSK.onopen = () => {
            console.log('CMD| Open WebSocket connection');
        };

        this.cmdSK.onmessage = (message) => {
            console.log('CMD| Received message:', message.data);
            var regexServo = /^\*(\d+)([A-Z\s]+)(\d+)\r$/; // LSS servo commands
            var regexDeskpet = /^\*([A-Z\s]+)(\d+)(.*)\r$/; // Deskpet commands

            //var match1 = command.match(regexServo);
            var matchDeskpet = message.data.match(regexDeskpet);

            if (matchDeskpet) {
                var CMD = matchDeskpet[1];
                var value = matchDeskpet[2];
                var params = matchDeskpet[3];
                console.log("Tipo de comando: LSS Deskpet");
                console.log("COMANDO: " + CMD);
                console.log("VALOR: " + value);
                console.log("VALORES: " + params);
            } else {
                console.log("Invalid command");
            }

            genericQuerySet(CMD,value);

        };

        this.cmdSK.onerror = (error) => {
            console.error('CMD| WebSocket ERROR:', error);
        };

        this.cmdSK.onclose = (event) => {
            console.log('CMD| WebSocket connection closed');
            setTimeout(connectCMDSocket, 3000);
            if (event.wasClean) {
                console.log(`Connection closed cleanly, code=${event.code} reason=${event.reason}`);
            } else {
                console.log('Connection died');
            }
        };
    }

    closeCMDSocket() {
        if (this.cmdSK) {
            this.cmdSK.close();
        }
    }

    //////////////////////////////// CAMERA CONNECTION

    connectCAMSocket(imgElement) {
        this.cameraSK = new WebSocket(`ws://${this.gateway}/camera`);
        if (imgElement instanceof Element && imgElement.tagName === 'IMG') {
            this.imgDisplay = imgElement;


            this.cameraSK.onopen = () => {
                console.log('CAM| Open WS Connection');
            };

            this.cameraSK.onmessage = (response) => {
                console.log('CAM| IMG Received: ', response.data.size,'Bytes');
                const frameData = response.data;

                // Create a Blob using the ArrayBuffer
                var frameBlob = new Blob([frameData], { type: 'image/jpeg' });

                // Create a URL to represent the Blob
                const frameURL = URL.createObjectURL(frameBlob);

                this.imgDisplay.src = frameURL;

                this.imgDisplay.onload = function () {
                    URL.revokeObjectURL(frameURL);
                }

            };

            this.cameraSK.onerror = (error) => {
                console.error('CAM| WeBSocket ERROR:', error);
            };

            this.cameraSK.onclose = (event) => {
                setTimeout(connectCAMSocket, 3000);
                if (event.wasClean) {
                    console.log(`Connection closed cleanly, code=${event.code} reason=${event.reason}`);
                } else {
                    console.log('Connection died');
                }
            }
        }else{
            console.log('CAM| The element must be an IMG');
        }
    }

    closeCAMSocket() {
        if (this.cameraSK){
            this.cameraSK.close();
        }
    }

    /////////////////////////////// COMMANDS METHODS
    //// ACTION COMMANDS
    setLEDColor(color){
        var color_value = COLORS[color];
        if (color_value) {
            this.cmdSK.send("#" + setLedsCMD + color_value+"\r");
            return 0;
        } else {
            console.log("Invalid Color");
            return 1;
        }
    }

    setLEDBlinking(mode){
        var mode_value = MODES[mode];
        if (mode_value) {
            this.cmdSK.send("#" + setLedBlinkingCMD + mode_value+"\r");
            return 0;
        } else {
            console.log("Invalid blinking mode");
            return 1;
        }
    }

    setFrontLight(value){
        if (0<=value<=100 || value == 200) { //200 for automanic brightness
            this.cmdSK.send("#" + setFrontLightsCMD + value+"\r");
            return 0;
        } else {
            console.log("Invalid value");
            return 1;
        }
    }

    setBuzzer(value,time){
        if (typeof value === 'undefined'){
            return 1;
        }
        if (typeof time === 'undefined') {
            this.cmdSK.send("#" + setBuzzerCMD + value+"\r");
        } else {
            this.cmdSK.send("#" + setBuzzerCMD + value+"T"+time+"\r");
        }
        return 0;
    }

    //// CONFIG COMMANDS
    configLEDBlinking(mode){
        var mode_value = MODES[mode];
        if (mode_value) {
            this.cmdSK.send("#" + configLedBlinkingCMD + mode_value+"\r");
            return 0;
        } else {
            console.log("Invalid blinking mode");
            return 1;
        }
    }
    
    configLEDColor(color){
        var color_value = COLORS[color];
        if (color_value) {
            this.cmdSK.send("#" + configLedsCMD + color_value+"\r");
            return 0;
        } else {
            console.log("Invalid Color");
            return 1;
        }
    }

    //// QUERY COMMANDS 
    // 
    // Queries returns an int list: [status,value]
    // status: 0: OK, 1: WAITING, 2: TIMEOUT
    // value: It is only a valid value when the status is 0.
    // The querying process operates through polling. Upon the initial function call, it returns with a status of 1 and a null value. 
    // This signifies that it is awaiting a response. The user is required to continue invoking the function until an alternate response is received. 
    // Once the status changes to 0, the requested value will be populated in the value parameter.
    sendCommandIfRequired(cmd) {
        if (query_commands[cmd].status === RESPONSE_OK) {
            console.log("Command sent");
            this.cmdSK.send("#" + cmd + "\r");
            query_commands[cmd].status = WAITING_RESPONSE;
        }
    }

    async queryDistance() {  
        this.sendCommandIfRequired(queryDistanceCMD)
        const result = await waitForCommandResponse(queryDistanceCMD);
        return (result);
    }

    async queryVoltage() {  
        this.sendCommandIfRequired(queryBatteryVoltageCMD)
        const result = await waitForCommandResponse(queryBatteryVoltageCMD);
        return (result);
    }

    async queryButton() {  
        this.sendCommandIfRequired(queryPushButtonCMD)
        const result = await waitForCommandResponse(queryPushButtonCMD);
        return (result);
    }

    async queryLightSensor() {  
        this.sendCommandIfRequired(queryLightSensorCMD)
        const result = await waitForCommandResponse(queryLightSensorCMD);
        return (result);
    }

    async queryLedColor() {  
        this.sendCommandIfRequired(queryLedsCMD)
        const result = await waitForCommandResponse(queryLedsCMD);
        return [result[0],COLORS[result[1]]];
    }

    async queryLedMode() {  
        this.sendCommandIfRequired(queryLedBlinkingCMD)
        const result = await waitForCommandResponse(queryLedBlinkingCMD);
        return [result[0],MODES[result[1]]];
    }

    //// CAMERA COMMANDS 
    queryImage(){
        this.cameraSK.send("#"+queryImageCMD+"\r");
    }
    startStreaming(){
        this.cameraSK.send("#"+queryImageCMD+"1\r");
    }
    stopStreaming(){
        this.cameraSK.send("#"+queryImageCMD+"0\r");
    }
}
