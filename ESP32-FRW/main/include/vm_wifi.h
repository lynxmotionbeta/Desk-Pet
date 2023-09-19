#ifndef _WIFI_H_
#define _WIFI_H_

#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"

#include "lwip/err.h"
#include "lwip/sys.h"
#include "lwip/ip4_addr.h"

//static void event_handler(void* arg, esp_event_base_t event_base,int32_t event_id, void* event_data);
//void wifi_init_sta(void);

#define QUEUE_LENGTH (2)
#define ITEM_SIZE (sizeof(NetworkStatus_t))


extern QueueHandle_t xQueue_wifi; //= xQueueCreate(QUEUE_LENGTH, ITEM_SIZE);

typedef struct {
    bool connected;  
    ip4_addr_t ip;
    ip4_addr_t netmask;
} NetworkStatus_t;

//extern wifi_config_t wifi_config;
wifi_ap_record_t* wifi_scan(uint16_t *nets);
void wifi_init(const char* ssid_sta, const char* pass_sta);

#endif