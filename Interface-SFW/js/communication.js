//VERSION 2.0

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

export const COLORS = {
    "Off": '0', // (black)
    "Red": '1',
    "Green": '2',
    "Blue": '3',
    "Yellow": '4',
    "Cyan": '5',
    "Magenta": '6',
    "White": '7'
}

export const MODES = {
    "Off": "0", //Static
    "Blinking": "1", // 1Hz
    "Dimming": "2"  // 0.5Hz
}

export const MOVES = {
    "UP": 0,
    "SIT": 1,
    "LAY": 2,
    "PAW": 3,
    "WIGGLE": 4,
    "TINKLE": 5,
    "STRETCH": 6
  };
  

//// MOTION COMMANDS
const motionCMD = "M";

const speedModifierCMD = "S";
const motionValueCMD = "V";

const motion_register = {
    "Walking" : '0',
    "Rotation" : '1',
    "Roll" : '2',
    "Pitch" : '3',
    "Yaw" : '4',
    "XB" : '5',
    "X" : '6',
    'Y' : '7',
    'Z' : '8',
    "Gait" : '9',
    "Trot" : '10',
    "Balance" : '11',
    'Sequence' : '20'
}

//// WIRELESS
//// SERVOS

////// VARIABLES
const query_commands = {
    "QX": new ComponentData(),
    "QV": new ComponentData(),
    "QLS": new ComponentData(),
    "QPB": new ComponentData(),
    "QLED": new ComponentData(),
    "QLB": new ComponentData(),
};

const CHECK_INTERVAL = 50; // ms
const RESPONSE_TIMEOUT_MS = 500; //ms

const RESPONSE_OK = 0;
const RESPONSE_RECEIVED = -1;
const WAITING_RESPONSE = 1;
const TIMEOUT_RESPONSE = 2;
const INVALLID_RESPONSE = 3;
const CONNECTION_ERROR = 4;

async function waitForCommandResponse(cmd) {
    const startTime = Date.now();
    while (true) {
        switch (query_commands[cmd].status) {
            case RESPONSE_RECEIVED:
                console.log("Command received");
                query_commands[cmd].status = RESPONSE_OK;
                return [RESPONSE_OK, query_commands[cmd].value];
            case WAITING_RESPONSE:
                //console.log("Waiting response");
                if (Date.now() - startTime > RESPONSE_TIMEOUT_MS) {
                    query_commands[cmd].status = RESPONSE_OK; // Leave the status available for another transmission.
                    return [TIMEOUT_RESPONSE, 0];
                }
                await sleep(CHECK_INTERVAL);
                break;
            default:
                console.log("ERROR| Invalid Query Status");
                return [INVALLID_RESPONSE, 0];
        }
    }
}

function parseAndHandleMessage(message) {
    const regexDeskpet = /^\*([A-Z\s]+)(\d+)(.*)\r$/;
    const matchDeskpet = message.match(regexDeskpet);

    if (!matchDeskpet) {
        console.log("CMD| Invalid command");
        return;
    }

    const cmd = matchDeskpet[1];
    const value = matchDeskpet[2];
    const params = matchDeskpet[3];

    if (cmd in query_commands) {
        query_commands[cmd].value = value;
        if (query_commands[cmd].status === WAITING_RESPONSE) {
            query_commands[cmd].status = RESPONSE_RECEIVED;
        } else {
            query_commands[cmd].status = RESPONSE_OK;
            //console.log("ERROR| Unexpected message: " + cmd);
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
    isCmdConnected = () => this.cmdSK.readyState === WebSocket.OPEN;

    connectCMDSocket() {
        console.log("CMD| TRYING TO CONNECT.");
        this.cmdSK = new WebSocket(`ws://${this.gateway}/cmd`);
        this.cmdSK.onopen = this.handleCmdSocketOpen;
        this.cmdSK.onmessage = this.handleCmdSocketMessage;
        this.cmdSK.onerror = this.handleCmdSocketError;
        this.cmdSK.onclose = this.handleCmdSocketClose;
    }

    handleCmdSocketOpen = () => {
        console.log('CMD| Open WebSocket connection');
    };

    handleCmdSocketMessage = (message) => {
        console.log('CMD| Received message:', message.data);
        parseAndHandleMessage(message.data);
    };

    handleCmdSocketError = (error) => {
        console.error('CMD| WebSocket ERROR:', error);
    };

    handleCmdSocketClose = (event) => {
        console.log('CMD| WebSocket connection closed');
        setTimeout(() => {
            this.connectCMDSocket();
        }, 3000);
        if (event.wasClean) {
            console.log(`CMD| Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            console.log('CMD| Connection died');
        }
    };

    closeCMDSocket() {
        if (this.cmdSK) {
            this.cmdSK.close();
        }
    }
    
    //////////////////////////////// CAMERA CONNECTION
    isCamConnected = () => this.cameraSK.readyState === WebSocket.OPEN;

    connectCAMSocket(imgElement) {
        console.log("CAM| TRYING TO CONNECT.");

        if (!(imgElement instanceof Element && imgElement.tagName === 'IMG')) {
            console.log('CAM| The element must be an IMG');
            return;
        }

        this.imgDisplay = imgElement;
        this.cameraSK = new WebSocket(`ws://${this.gateway}/camera`);
        this.setupCAMSocket();
    }

    setupCAMSocket() {
        this.cameraSK.onopen = this.handleCAMSocketOpen;
        this.cameraSK.onmessage = this.handleCAMSocketMessage;
        this.cameraSK.onerror = this.handleCAMSocketError;
        this.cameraSK.onclose = this.handleCAMSocketClose;
    }

    handleCAMSocketOpen = () => {
        console.log('CAM| Open WS Connection');
    };

    handleCAMSocketMessage = (response) => {
        console.log('CAM| IMG Received: ', response.data.size, 'Bytes');
        const frameData = response.data;

        // Create a Blob using the ArrayBuffer
        const frameBlob = new Blob([frameData], { type: 'image/jpeg' });

        // Create a URL to represent the Blob
        const frameURL = URL.createObjectURL(frameBlob);

        this.imgDisplay.src = frameURL;

        this.imgDisplay.onload = () => {
            URL.revokeObjectURL(frameURL);
        };
    };

    handleCAMSocketError = (error) => {
        console.error('CAM| WeBSocket ERROR:', error);
    };

    handleCAMSocketClose = (event) => {
        setTimeout(() => {
            if (this.imgDisplay !== null) {
                this.connectCAMSocket(this.imgDisplay);
            } else {
                console.log("CAM| ERROR Image element for video display was not passed.");
            }
        }, 2000);

        if (event.wasClean) {
            console.log(`CAM| Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            console.log('CAM| Connection died');
        }
    };

    closeCAMSocket() {
        if (this.cameraSK) {
            this.cameraSK.close();
        }
    }

    /////////////////////////////// PERIPHERAL COMMANDS

    // Send any message to DeskPet
    sendMsg(msg) {
        if (!this.isCmdConnected()){
            return
        }
        this.cmdSK.send(msg);
    }

    //// ACTION COMMANDS
    setLEDColor(color) {
        var color_value = COLORS[color];
        if (color_value) {
            this.cmdSK.send("#" + setLedsCMD + color_value + "\r");
            return 0;
        } else {
            console.log("Invalid Color");
            return 1;
        }
    }

    setLEDBlinking(mode) {
        var mode_value = MODES[mode];
        if (mode_value) {
            this.cmdSK.send("#" + setLedBlinkingCMD + mode_value + "\r");
            return 0;
        } else {
            console.log("Invalid blinking mode");
            return 1;
        }
    }

    setFrontLight(value) {
        if (0 <= value && value <= 100 || value == 200) { //200 for automanic brightness
            this.cmdSK.send("#" + setFrontLightsCMD + value + "\r");
            return 0;
        } else {
            console.log("Invalid value");
            return 1;
        }
    }

    setBuzzer(value, time) {
        if (typeof value === 'undefined') {
            return 1;
        }
        if (typeof time === 'undefined') {
            this.cmdSK.send("#" + setBuzzerCMD + value + "\r");
        } else {
            this.cmdSK.send("#" + setBuzzerCMD + value + "T" + time + "\r");
        }
        return 0;
    }

    //// CONFIG COMMANDS
    configLEDBlinking(mode) {
        var mode_value = MODES[mode];
        if (mode_value) {
            this.cmdSK.send("#" + configLedBlinkingCMD + mode_value + "\r");
            return 0;
        } else {
            console.log("Invalid blinking mode");
            return 1;
        }
    }

    configLEDColor(color) {
        var color_value = COLORS[color];
        if (color_value) {
            this.cmdSK.send("#" + configLedsCMD + color_value + "\r");
            return 0;
        } else {
            console.log("Invalid Color");
            return 1;
        }
    }

    //// QUERY COMMANDS 
    // Queries returns an int list: [status,value]
    // status: 0: OK, 1: WAITING, 2: TIMEOUT
    // value: It is only a valid value when the status is 0.
    // The querying process operates through polling. Upon the initial function call, it returns with a status of 1 and a null value. 
    // This signifies that it is awaiting a response. The user is required to continue invoking the function until an alternate response is received. 
    // Once the status changes to 0, the requested value will be populated in the value parameter.

    async genericQuery(cmd) {
        if (this.isCmdConnected() && query_commands[cmd].status === RESPONSE_OK) {
            console.log("Command sent");
            this.cmdSK.send("#" + cmd + "\r");
            query_commands[cmd].status = WAITING_RESPONSE;
            const result = await waitForCommandResponse(cmd);
            return result;
        }
        return [CONNECTION_ERROR, 0];
    }

    queryDistance = async () => await this.genericQuery(queryDistanceCMD);

    queryButton = async () => await this.genericQuery(queryPushButtonCMD);

    queryLightSensor = async () => await this.genericQuery(queryLightSensorCMD);

    queryLedColor = async () => await this.genericQuery(queryLedsCMD);

    queryVoltage = async () => await this.genericQuery(queryBatteryVoltageCMD);

    async queryBatteryLevel() {  // battery Level 0-100%
        const result = await this.genericQuery(queryBatteryVoltageCMD)
        return [result[0], calculateChargeLevel(result[1])];
    }

    async queryLedColor() {        
        const result = await this.genericQuery(queryLedsCMD)
        return [result[0], COLORS[result[1]]];
    }

    async queryLedColor() {        
        const result = await this.genericQuery(queryLedBlinkingCMD)
        return [result[0], MODES[result[1]]];
    }

    /////////////////////////////// CAMERA COMMANDS 
    queryImage() {
        if (!this.isCamConnected()){
            return 1;
        }
        this.cameraSK.send("#" + queryImageCMD + "\r");
    }
    startStreaming() {
        if (!this.isCamConnected()){
            return 1;
        }
        this.cameraSK.send("#" + queryImageCMD + "1\r");
    }
    stopStreaming() {
        if (!this.isCamConnected()){
            return 1;
        }
        this.cameraSK.send("#" + queryImageCMD + "0\r");
    }

    /////////////////////////////// MOTION COMMANDS

    //// ACTION COMMANDS

    walk(angle, speed) {
        if (!this.isCmdConnected()){
            return 1;
        }
        if (angle !== undefined) {
            if (speed === undefined) {
                this.cmdSK.send("#" + motionCMD + motion_register.Walking + motionValueCMD + angle + "\r");
                console.log("#" + motionCMD + motion_register.Walking + motionValueCMD + angle + "\r");
            } else {
                this.cmdSK.send("#" + motionCMD + motion_register.Walking + motionValueCMD + angle + speedModifierCMD + speed + "\r");
                console.log("#" + motionCMD + motion_register.Walking + motionValueCMD + angle + speedModifierCMD + speed + "\r");
            }
        }
        return 0;
    }

    rotationCW() {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Rotation + motionValueCMD + "1\r");
    }

    rotationCCW() {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Rotation + motionValueCMD + "-1\r");
    }

    stopRotation() {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Rotation + motionValueCMD + "0\r");
    }

    roll(angle) {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Roll + motionValueCMD + angle + "\r");
    }

    pitch(angle) {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Pitch + motionValueCMD + angle + "\r");
    }

    yaw(angle) {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Yaw + motionValueCMD + angle + "\r");
    }

    xBody(distance) {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.XB + motionValueCMD + distance + "\r");
    }

    xAxisDisp(distance) {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.X + motionValueCMD + distance + "\r");
    }

    yAxisDisp(distance) {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Y + motionValueCMD + distance + "\r");
    }

    zAxisDisp(distance) {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Z + motionValueCMD + distance + "\r");
    }

    setDinamycGait() {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Gait + motionValueCMD + "1\r");
    }

    setStaticGait() {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Gait + motionValueCMD + "0\r");
    }

    trotON() {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Trot + motionValueCMD + "1\r");
    }

    trotOFF() {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Trot + motionValueCMD + "0\r");
    }
    
    balanceON() {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Balance + motionValueCMD + "1\r");
    }

    balanceOFF() {
        if (!this.isCmdConnected()){
            return 1;
        }
        this.cmdSK.send("#" + motionCMD + motion_register.Balance + motionValueCMD + "0\r");
    }

    setMove(move) {
        if (!this.isCmdConnected()){
            return 1;
        }
        if (Object.values(MOVES).includes(move)) {
            this.cmdSK.send("#" + motionCMD + motion_register.Sequence + motionValueCMD + move + "\r");
            return 0;
        } else {
            console.log("Invalid Move");
            return 1;
        }
    }
}

////// UTILS

// Function to calculate the charge level in percentage based on the battery voltage
function calculateChargeLevel(batteryVoltage) {
    const minVoltage = 6400; // Estimated minimum voltage (discharged)
    const maxVoltage = 8200; // Estimated maximum voltage (fully charged)

    const voltageRange = maxVoltage - minVoltage;
    const voltageAboveMin = batteryVoltage - minVoltage;
    const chargeLevel = Math.round((voltageAboveMin / voltageRange) * 100);

    return Math.min(Math.max(chargeLevel, 0), 100); // Ensure it's between 0 and 100
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

