//VERSION 3.0

//////  COMMANDS

////IMAGE
const queryImageCMD = "QIMG"; // Unofficial LSS 

////IMAGE
const configFaceDescriptorsCMD = "CFD"; // Unofficial LSS 

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

export class RESPONSE {
    static OK = 0;
    static WAITING = 1;
    static TIMEOUT = 2;
    static INVALID_RESPONSE = 3;
    static CONNECTION_ERROR = 4;
    static INVALID_COMMAND = 5;
    static WRONG_FORMAT = 6;

    static decode(response) {
        switch (response) {
            case this.OK:
                return "Success";
            case this.WAITING:
                return "This query command was already in progress";
            case this.TIMEOUT:
                return "Timeout";
            case this.INVALID_RESPONSE:
                return "Error, wrong response format";
            case this.CONNECTION_ERROR:
                return "Connection error";
            case this.INVALID_COMMAND:
                return "Error, command not supported";
            case this.WRONG_FORMAT:
                return "Error, wrong command format";
            default:
                return "Error, unknown response status";
        }
    }

};

const speedModifierCMD = "S";
const valueModifierCMD = "V";

class Command {
    static Query = {
        Motion: "QM",
        Distance: "QX",
        Voltage: "QV",
        LightSensor: "QLS",
        PushButton: "QPB",
        LedsBlink: "QLB",
        LedsColor: "QLED",
        JointOffset: "QJO",
        FaceDescriptors: "QFD"
    };

    static Set = {
        LedsColor: "LED",
        LedsBlink: "LB",
        FrontLight: "FL",
        Buzzer: "B",
        Motion: "M"
    };

    static Config = {
        JointOffset: "CJO",
        LedsColor: "CLED",
        LedsBlink: "CLB"
    };

    static SSC32Query = {
        QueryPulse: "QP",
        QueryPositionDEG: "QD",
        QueryFirmware: "QF",
        QueryCurrent: "QC",
        QueryPositionMV: "QPMV",
        QueryStatus: "Q",
        QueryAngularRange: "QAR",
        QueryPulseRange: "QPR"
    };

    static isSSC32Query(command) {
        return Object.values(this.SSC32Query).includes(command);
    }

    static isValidQuery(command) {
        return Object.values(this.Query).includes(command);
    }

    static isValidSet(command) {
        return Object.values(this.Set).includes(command);
    }

    static isValidConfig(command) {
        return Object.values(this.Config).includes(command);
    }

    static isValidCommand(command) {
        return this.isValidQuery(command) || this.isValidSet(command) || this.isValidConfig(command);
    }
}


export class MotionRegister {
    static Walking = '0';
    static Rotation = '1';
    static Roll = '2';
    static Pitch = '3';
    static Yaw = '4';
    static Xb = '5';
    static X = '6';
    static Y = '7';
    static Z = '8';
    static Gait = '9';
    static Trot = '10';
    static Balance = '11';
    static Assembly = '12';
    static Sequence = '20';

    static isValidRegister(value) {
        for (const key in this) {
            if (this[key] === value) {
                return true;
            }
        }
        return false;
    }
}

const RESPONSE_TIMEOUT_MS = 3000; //ms

const commandPromises = {};

function parseAndHandleMessage(message) { // It is executed each time a message is received
    const regexDeskpet = /^\*([A-Z\s]+)(-?\d+)(.*)\r$/;
    var matchDeskpet = message.match(regexDeskpet);

    if (!matchDeskpet) {
        console.log("CMD| Invalid command");
        return;
    }

    var cmd = matchDeskpet[1];
    var value = matchDeskpet[2];
    const params = matchDeskpet[3];

    if (Command.isValidQuery(cmd)) {
        if (params) { // Register commands
            if(cmd === Command.Query.FaceDescriptors){
                value = params;
            }else{                
                matchDeskpet = params.match(/^([A-Z\s]+)(-?\d+)(.*)$/);
                cmd = cmd + value;
                value = matchDeskpet[2];
            }
        }

        const promise = commandPromises[cmd];

        if (promise) {
            if (value != null) {
                promise.resolve([RESPONSE.OK, value]);
            } else {
                promise.resolve([RESPONSE.INVALID_RESPONSE, 0]);
            }
            clearTimeout(promise.timeoutId);
            delete commandPromises[cmd];
        } else {
            console.log("ERROR| Unexpected message: " + message);
        }
    } else {
        console.log("ERROR| Command not supported, CMD: " + cmd);
    }
}

class LSS {
    constructor() {
        this.gateway = null;
        this.cmdSK = null;
        this.cameraSK = null;
        this.imgDisplay = null;
    }

    //////////////////////////////// CMD CONNECTION
    setIP = (ip) => this.gateway = ip;

    isCmdConnected = () => this.cmdSK.readyState === WebSocket.OPEN;

    connectCMDSocket() {
        console.log("CMD| CONNECTING...");
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
        console.log('CMD| Received message');//, message.data);
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
        console.log("CAM| CONNECTING...");

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
        //console.log('CAM| IMG Received: ', response.data.size, 'Bytes');
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
    async sendMsg(msg) {
        const servoID = 1;
        const cmd = 2;
        const value = 3;

        const regexDeskpet = /^\#(\d+)?([A-Za-z\s]+)(-?\d+)?(.*)\r$/;
        var matchDeskpet = msg.match(regexDeskpet);
        if (!matchDeskpet) {
            return [RESPONSE.WRONG_FORMAT, 0];
        }

        if (matchDeskpet[cmd][0] === "Q") { // Is a query CMD
            if (matchDeskpet[servoID]) {
                return await this.genericQuery(matchDeskpet[cmd], matchDeskpet[servoID]);
            } else {
                return await this.genericQuery(matchDeskpet[cmd], matchDeskpet[value]);
            }
        } else {
            // It is a set/config command
            // Pass through
            this.cmdSK.send(msg);
            // Returns a null value since it is a set/config command
            return [RESPONSE.OK, null];
        }
    }

    //// ACTION COMMANDS
    setLEDColor(color) {
        var color_value = COLORS[color];
        if (color_value) {
            this.cmdSK.send("#" + Command.Set.LedsColor + color_value + "\r");
            return 0;
        } else {
            console.log("Invalid Color");
            return 1;
        }
    }

    setLEDBlinking(mode) {
        var mode_value = MODES[mode];
        if (mode_value) {
            this.cmdSK.send("#" + Command.Set.LedsBlink + mode_value + "\r");
            return 0;
        } else {
            console.log("Invalid blinking mode");
            return 1;
        }
    }

    setFrontLight(value) {
        if (0 <= value && value <= 100 || value == 200) { //200 for automanic brightness
            this.cmdSK.send("#" + Command.Set.FrontLight + value + "\r");
            return 0;
        } else {
            console.log("Invalid value");
            return 1;
        }
    }

    setBuzzer(value, time) {
        if (typeof value === 'undefined' || !this.isCmdConnected()) {
            return 1;
        }
        if (typeof time === 'undefined') {
            this.cmdSK.send("#" + Command.Set.Buzzer + value + "\r");
        } else {
            this.cmdSK.send("#" + Command.Set.Buzzer + value + "T" + time + "\r");
        }
        return 0;
    }

    //// CONFIG COMMANDS
    configLEDBlinking(mode) {
        var mode_value = MODES[mode];
        if (mode_value && this.isCmdConnected()) {
            this.cmdSK.send("#" + Command.Config.LedsBlink + mode_value + "\r");
            return 0;
        } else {
            console.log("Invalid blinking mode");
            return 1;
        }
    }

    configLEDColor(color) {
        var color_value = COLORS[color];
        if (color_value && this.isCmdConnected()) {
            this.cmdSK.send("#" + Command.Config.LedsColor + color_value + "\r");
            return 0;
        } else {
            console.log("Invalid Color");
            return 1;
        }
    }

    configJointOffset(leg, joint, offset) {
        if (leg >= 1 && leg <= 4 && joint >= 1 && joint <= 3 && this.isCmdConnected()) {
            this.cmdSK.send("#" + Command.Config.JointOffset + leg.toString() + joint.toString() + valueModifierCMD + offset.toString() + "\r");
            return 0;
        }
        return 1;
    }

    //// QUERY COMMANDS 
    // Queries returns an int list: [status,value]
    genericQuery(command, register) {
        return new Promise(async (resolve, reject) => {
            // Check if the interface is connected to DeskPet
            if (!this.isCmdConnected()) {
                resolve([RESPONSE.CONNECTION_ERROR, 0]);
                return;
            }

            var cmd = command;
            // Check if it is a valid command
            if (Command.isValidQuery(cmd)) {
                // Modify the cmd if it is register based command
                if (register !== null && register !== undefined) {
                    cmd = command + register;
                }
            } else if (Command.isSSC32Query(cmd)) {
                console.log(register);
                if (register !== null && register !== undefined) {
                    cmd = register + command;
                } else {
                    resolve([RESPONSE.WRONG_FORMAT, 0]);
                    return;
                }
            } else {
                resolve([RESPONSE.INVALID_COMMAND, 0]);
                return;
            }

            // Check if you are already waiting for this command, to avoid multiple queries
            if (commandPromises[cmd]) {
                resolve([RESPONSE.WAITING, 0]);
                return;
            }

            this.cmdSK.send("#" + cmd + "\r");

            // Configurar el temporizador de timeout
            const timeoutId = setTimeout(() => {
                const promiseData = commandPromises[cmd];
                if (promiseData) {
                    delete commandPromises[cmd];
                    promiseData.resolve([RESPONSE.TIMEOUT, 0]);
                }
            }, RESPONSE_TIMEOUT_MS);

            commandPromises[cmd] = { resolve, reject, timeoutId };
        });
    }

    async queryJointOffset(leg, joint) {
        if (leg >= 1 && leg <= 4 && joint >= 1 && joint <= 3) {
            return await this.genericQuery(Command.Query.JointOffset, leg.toString() + joint.toString());
        }
        return [RESPONSE.INVALID_COMMAND, 0];
    }

    queryDistance = async () => await this.genericQuery(Command.Query.Distance);

    queryButton = async () => await this.genericQuery(Command.Query.PushButton);

    queryLightSensor = async () => await this.genericQuery(Command.Query.LightSensor);

    queryLedColor = async () => await this.genericQuery(Command.Query.LedsColor);

    async queryBatteryLevel() {  // battery Level 0-100%
        const result = await this.genericQuery(Command.Query.Voltage);
        return [result[0], calculateChargeLevel(result[1])];
    }

    async queryLedColor() {
        const result = await this.genericQuery(Command.Query.LedsColor);
        return [result[0], COLORS[result[1]]];
    }

    async queryLedBlinkMode() {
        const result = await this.genericQuery(Command.Query.LedsBlink);
        return [result[0], MODES[result[1]]];
    }

    /////////////////////////////// CAMERA COMMANDS 
    queryImage() {
        if (!this.isCamConnected()) {
            return 1;
        }
        this.cameraSK.send("#" + queryImageCMD + "\r");
    }
    startStreaming() {
        if (!this.isCamConnected()) {
            return 1;
        }
        this.cameraSK.send("#" + queryImageCMD + "1\r");
    }
    stopStreaming() {
        if (!this.isCamConnected()) {
            return 1;
        }
        this.cameraSK.send("#" + queryImageCMD + "0\r");
    }

    /////////////////////////////// FACE DESCRIPTOR LOADER COMMANDS

    async loadFaces(){
        const result = await this.genericQuery(Command.Query.FaceDescriptors);
        return [result[0], result[1]];
    }

    storeFaces(labeledDescriptors){
        const descriptorString = JSON.stringify(labeledDescriptors);
        this.cmdSK.send("#" + configFaceDescriptorsCMD + descriptorString+"\r");
    }

    /////////////////////////////// MOTION COMMANDS

    //// MOTION QUERY COMMANDS  
    async queryMotion(register) {
        let reg = register;
        if (typeof register !== "string") {
            reg = register.toString();
        }
        if (MotionRegister.isValidRegister(reg)) {
            return await this.genericQuery(Command.Query.Motion, reg);
        }
        return [RESPONSE.INVALID_COMMAND, 0];
    }

    //// MOTION ACTION COMMANDS
    walk(angle, speed) {
        if (!this.isCmdConnected()) {
            return 1;
        }
        if (angle !== undefined) {
            if (speed === undefined) {
                this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Walking + valueModifierCMD + angle + "\r");
            } else {
                this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Walking + valueModifierCMD + angle + speedModifierCMD + speed + "\r");
            }
        }
        return 0;
    }

    rotationCW() {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Rotation + valueModifierCMD + "1\r");
    }

    rotationCCW() {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Rotation + valueModifierCMD + "-1\r");
    }

    stopRotation() {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Rotation + valueModifierCMD + "0\r");
    }

    roll(angle) {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Roll + valueModifierCMD + angle + "\r");
    }

    pitch(angle) {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Pitch + valueModifierCMD + angle + "\r");
    }

    yaw(angle) {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Yaw + valueModifierCMD + angle + "\r");
    }

    xBody(distance) {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.XB + valueModifierCMD + distance + "\r");
    }

    xAxisDisp(distance) {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.X + valueModifierCMD + distance + "\r");
    }

    yAxisDisp(distance) {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Y + valueModifierCMD + distance + "\r");
    }

    zAxisDisp(distance) {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Z + valueModifierCMD + distance + "\r");
    }

    setDinamycGait() {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Gait + valueModifierCMD + "1\r");
    }

    setStaticGait() {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Gait + valueModifierCMD + "0\r");
    }

    trotON() {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Trot + valueModifierCMD + "1\r");
    }

    trotOFF() {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Trot + valueModifierCMD + "0\r");
    }

    balanceON() {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Balance + valueModifierCMD + "1\r");
    }

    balanceOFF() {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Balance + valueModifierCMD + "0\r");
    }

    setMove(move) {
        if (!this.isCmdConnected()) {
            return 1;
        }
        if (Object.values(MOVES).includes(move)) {
            this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Sequence + valueModifierCMD + move + "\r");
            return 0;
        } else {
            console.log("Invalid Move");
            return 1;
        }
    }

    assemblyON() {
        if (!this.isCmdConnected()) {
            return 1;
        }
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Assembly + valueModifierCMD + "1\r");
    }

    assemblyOFF() {
        if (!this.isCmdConnected()) {
            return 1;
        }
        let cmd = "#" + Command.Set.Motion + MotionRegister.Assembly + valueModifierCMD + "0\r";
        console.log(cmd);
        this.cmdSK.send("#" + Command.Set.Motion + MotionRegister.Assembly + valueModifierCMD + "0\r");
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

// Create a new LSS instance for the DeskPet with the specified IP address.
export const deskpet = new LSS();