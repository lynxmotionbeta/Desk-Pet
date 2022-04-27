#ifndef _WIFI_H_
#define _WIFI_H_

#include <esp_log.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event_loop.h"
#include "nvs_flash.h"
#include "sdkconfig.h"

#include "lwip/err.h"
#include "lwip/sys.h"
#include "esp_netif.h"
#include "mdns.h"

#define WIFI_SSID      "Robotech_EXT"
#define WIFI_PASS      "deg.1812"
#define MAXIMUM_RETRY  5
#define WIFI_AP_SSID   "Deskpet"
#define WIFI_AP_PASS   ""
#define MAX_STA_CONN   1
#define IP_ADDR    "192.168.4.1"
#define WIFI_AP_CHANNEL "0"


void wifi_init_softap();
void wifi_init_sta();
static esp_err_t event_handler(void *ctx, system_event_t *event);
void wifi_main();

#endif