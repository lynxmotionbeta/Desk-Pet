#ifndef _CAMERA_H_
#define _CAMERA_H_

#include "driver/gpio.h"
#include "driver/ledc.h"
#include "esp_camera.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <esp_log.h>
#include "vl53l0x.h"


#define LED_PIN 8 
#define CAM_PIN_PWDN 18  //Power down
#define CAM_PIN_RESET -1 //Reset (software reset will be performed)
#define CAM_PIN_XCLK 6
#define CAM_PIN_SIOD 4
#define CAM_PIN_SIOC 5

#define CAM_PIN_D7 9   //D9
#define CAM_PIN_D6 10   //D8
#define CAM_PIN_D5 11   //D7
#define CAM_PIN_D4 12   //D6
#define CAM_PIN_D3 13   //D5
#define CAM_PIN_D2 14   //D4
#define CAM_PIN_D1 21   //D3
#define CAM_PIN_D0 47   //D2
#define CAM_PIN_VSYNC 15
#define CAM_PIN_HREF 16
#define CAM_PIN_PCLK 7

//Camera functions
esp_err_t camera_init();

// Camera module Leds functions
esp_err_t ledc_init();
uint8_t brightness_adjustment(camera_fb_t* fb);
void set_led_brightness(uint8_t brightness);

//ToF distance sensor functions
esp_err_t distance_sensor_init();
void distance_sensor_deinit();
uint8_t read_distance(uint16_t *d);
void distance_sensor_test(uint16_t t_seg);

#endif