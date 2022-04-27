#ifndef _HTTP_H_
#define _HTTP_H_

#include <esp_log.h>

#include "esp_camera.h"
#include "esp_event_loop.h"
#include "esp_http_server.h"
#include "mdns.h"
#include <cJSON.h>

#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "driver/gpio.h"
#include "sdkconfig.h"

#define TAG "HTTP"

esp_err_t jpg_stream_httpd_handler(httpd_req_t *req);
size_t jpg_encode_stream(void *arg, size_t index, const void *data, size_t len);
esp_err_t jpg_httpd_handler(httpd_req_t *req);
httpd_handle_t start_webserver(void);
void stop_webserver(httpd_handle_t server);
void disconnect_handler(void *arg, esp_event_base_t event_base, int32_t event_id, void *event_data);
void connect_handler(void *arg, esp_event_base_t event_base, int32_t event_id, void *event_data);
void http_main();
esp_err_t index_handler(httpd_req_t *req);
esp_err_t style_handler(httpd_req_t *req);
esp_err_t logo_handler(httpd_req_t *req);
esp_err_t js_handler(httpd_req_t *req);
void ws_async_send(void *arg);
esp_err_t trigger_async_send(httpd_handle_t handle, httpd_req_t *req);
esp_err_t ws_handler(httpd_req_t *req);
esp_err_t loading_handler(httpd_req_t *req);
void app_mdns_update_framesize(int size);
esp_err_t parse_get(httpd_req_t *req, char **obuf);
esp_err_t cmd_handler(httpd_req_t *req);
void init_uart();
#endif