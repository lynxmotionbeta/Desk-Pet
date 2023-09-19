#ifndef COMMANDS_H
#define COMMANDS_H

// Action commands
const char* LSS_SetFrontalLeds = "FL";

// Queries handled by the ESP
const char* LSS_QueryAvailableNetworks = "QANET";
const char* LSS_QueryNetworkStatus = "QNET";

const char* LSS_QueryDistance = "QX";

// Config commands
const char* LSS_ConfigWiFi = "CNET";

#endif
