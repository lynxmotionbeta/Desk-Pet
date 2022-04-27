#ifndef _CAMERA_H_
#define _CAMERA_H_

#include <esp_log.h>
#include "esp_camera.h"

#define LED_PIN 6 
#define CAM_PIN_PWDN 7  //Power down
#define CAM_PIN_RESET -1 //Reset (software reset will be performed)
#define CAM_PIN_XCLK 1
#define CAM_PIN_SIOD 8
#define CAM_PIN_SIOC 9

#define CAM_PIN_D7 38   //D9
#define CAM_PIN_D6 21   //D8
#define CAM_PIN_D5 40   //D7
#define CAM_PIN_D4 39   //D6
#define CAM_PIN_D3 42   //D5
#define CAM_PIN_D2 41   //D4
#define CAM_PIN_D1 37   //D3
#define CAM_PIN_D0 36   //D2
#define CAM_PIN_VSYNC 4
#define CAM_PIN_HREF 3
#define CAM_PIN_PCLK 33

static camera_config_t camera_config;
esp_err_t init_camera();
void camera_main();

#endif