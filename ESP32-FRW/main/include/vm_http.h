#ifndef _HTTP_H_
#define _HTTP_H_

#include <stdio.h>
#include <stdlib.h>
#include <string.h> 
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "esp_system.h"
#include "esp_spi_flash.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "esp_spiffs.h"


#define QUEUE_WS_LENGTH 5
#define WS_MSG_SIZE sizeof(ws_dkmessage_t)


extern QueueHandle_t xQueue_ws_msg;

// typedef struct {
//     char* msg_type;  
//     char* msg;
//     int fd;
//     httpd_handle_t hd;
// } ws_dkmessage_t;

typedef struct {
    char* msg;
    int fd;
    httpd_handle_t hd;
} ws_dkmessage_t;

void free_ws_dkmessage(ws_dkmessage_t *var);
httpd_handle_t setup_server(void);
esp_err_t ws_async_send(char *msg, int fd);
esp_err_t ws_async_send_all(char* msg);

#endif