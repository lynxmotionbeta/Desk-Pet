#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "esp_system.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "nvs.h"

#include "esp_littlefs.h"

#include "vm_wifi.h"
#include "vm_http.h"
#include "camera.h"
#include "uart.h"
#include "commands.h"

#define COMMAND_COUNT(arr) (sizeof(arr) / sizeof(arr[0]))

#define FACE_PATH "/littlefs/face_descriptor.txt"
FILE *f;

static const char *TAG = "DESKPET_MAIN";
TaskHandle_t uart_task_handle = NULL;
QueueHandle_t xQueue_uart = NULL;

////// UART FUNCTIONS

// Function to check if a character is a digit
bool is_digit(char c)
{
  return (c >= '0' && c <= '9');
}

bool is_letter(char c)
{
  return (c >= 'A' && c <= 'Z');
}

// Function to find the start and end positions of the command
bool is_query_command(const char *input, char *cmd)
{
  uint8_t len = strlen(input);
  uint8_t i;

  // Search for the 'Q'
  for (i = 0; i < len; i++)
  {
    if (is_letter(input[i]))
    {
      if (input[i] != 'Q')
        return false; // Not a query command

      *cmd = 'Q';
      break;
    }
  }
  // If 'Q' is found, search for the first digit
  for (i = 1; i < len; i++)
  {
    if (is_digit(input[i]) || input[i] == '\r')
    {
      *(cmd++) = '\0';
      break;
    }
    else
    {
      *(cmd++) = input[i]; // The position before the digit is the end
    }
  }
  return (true);
}

// UART Task
void uart_cmd_task(void *arg)
{
  char cmd[6];
  ws_dkmessage_t *uart_ws_cmd_queue;
  char *reply;

  while (true)
  {

    if (uxQueueMessagesWaiting(xQueue_uart) > 0)
    {
      xQueueReceive(xQueue_uart, &uart_ws_cmd_queue, portMAX_DELAY);

      // Send the command via UART
      uart_write_bytes(UART_PORT_NUM, uart_ws_cmd_queue->msg, strlen(uart_ws_cmd_queue->msg));

      if (is_query_command(uart_ws_cmd_queue->msg, cmd))
      {
        reply = receive_command();
        if (reply != NULL)
        {
          if (strncmp(uart_ws_cmd_queue->msg + 1, cmd, strlen(cmd)) == 0)
          {
            ESP_LOGI(TAG, "reply %s", reply);
            ws_async_send(reply, uart_ws_cmd_queue->fd);
          }
          free(reply);
        }
        else
        {
          ESP_LOGE(TAG, "No Response Received");
        }
      }
      free_ws_dkmessage(uart_ws_cmd_queue);
    }
    vTaskDelay(pdMS_TO_TICKS(10));
  }
  vTaskDelete(NULL);
}

////// DESKPET FUNCTION HANDLERS

void load_network_credentials(char **ssid, char **pass)
{
  // Open NVS handle
  nvs_handle_t nvs_wifi_data_handler;
  esp_err_t err = nvs_open("wifi_data", NVS_READONLY, &nvs_wifi_data_handler);
  if (err != ESP_OK)
  {
    ESP_LOGE(TAG,"Error (%s) opening NVS handle!\n", esp_err_to_name(err));
    return;
  }

  // Read SSID from NVS
  size_t required_size;
  err = nvs_get_str(nvs_wifi_data_handler, "ssid", NULL, &required_size);
  if (err != ESP_OK && err != ESP_ERR_NVS_NOT_FOUND)
  {
    ESP_LOGE(TAG,"Error (%s) reading SSID from NVS!\n", esp_err_to_name(err));
    return;
  }
  *ssid = (char *)malloc(required_size);
  err = nvs_get_str(nvs_wifi_data_handler, "ssid", *ssid, &required_size);
  if (err != ESP_OK)
  {
    ESP_LOGE(TAG,"Error (%s) reading SSID from NVS!\n", esp_err_to_name(err));
    return;
  }

  // Read PASS from NVS
  err = nvs_get_str(nvs_wifi_data_handler, "pass", NULL, &required_size);
  if (err != ESP_OK)
  {
    ESP_LOGE(TAG,"Error (%s) reading PASS from NVS!\n", esp_err_to_name(err));
    return;
  }
  *pass = (char *)malloc(required_size);
  err = nvs_get_str(nvs_wifi_data_handler, "pass", *pass, &required_size);
  if (err != ESP_OK && err != ESP_ERR_NVS_NOT_FOUND)
  {
    ESP_LOGE(TAG,"Error (%s) reading PASS from NVS!\n", esp_err_to_name(err));
    return;
  }

  if (err != ESP_OK && err != ESP_ERR_NVS_NOT_FOUND)
  {
    ESP_LOGE(TAG,"Error (%s) reading PASS from NVS!\n", esp_err_to_name(err));
    return;
  }

  ESP_LOGI(TAG, "SSID loaded: %s", *ssid);
  ESP_LOGI(TAG, "PASS loaded: %s", *pass);

  // Close NVS handle
  nvs_close(nvs_wifi_data_handler);
}

void ws_available_networks(const ws_dkmessage_t *ws_msg)
{
  int fd = ws_msg->fd;
  uint16_t ap_count = 0;
  wifi_ap_record_t *list = wifi_scan(&ap_count);
  uint16_t message_size = 7 + ((2 + 4) * ap_count) + 1; // 7 = * + ap_count(4digits) + @ + \r // 2= @+@ // 4 = RSSI(4digit)

  for (int i = 0; i < ap_count; i++)
  {
    message_size += sizeof(list[i].ssid);
  }

  char *msg = malloc(sizeof(char) * (message_size));
  if (msg == NULL)
  {
    ESP_LOGE(TAG, "Failed to calloc memory for WS message");
    // return ESP_ERR_NO_MEM;
  }
  snprintf(msg, sizeof(LSS_QueryAvailableNetworks) + 6, "*%s%d", LSS_QueryAvailableNetworks, ap_count);

  char pack[50];
  for (int i = 0; i < ap_count; i++)
  {
    snprintf(pack, sizeof(list[i].ssid) + 7, "@%s@%d", (char *)list[i].ssid, list[i].rssi);
    strncat(msg, pack, strlen(pack));
  }
  strcat(msg, "\r");

  ESP_LOGI(TAG, "DETECTED NETWORKS -> %s", msg);
  ws_async_send(msg, fd);
  free(list);
  free(msg);

  // return ESP_OK;
}

void ws_connection_status(const ws_dkmessage_t *ws_msg)
{
  int fd = ws_msg->fd;
  char *msg = NULL;

  wifi_config_t wifi_config;
  esp_wifi_get_config(ESP_IF_WIFI_STA, &wifi_config);

  esp_netif_t *netif = esp_netif_get_handle_from_ifkey("WIFI_STA_DEF");
  if (netif)
  {
    esp_netif_ip_info_t ip_info;
    esp_err_t err = esp_netif_get_ip_info(netif, &ip_info);
    if (err == ESP_OK && ip_info.ip.addr != 0)
    {
      // printf("IP address: " IPSTR "\n", IP2STR(&ip_info.ip));
      // printf("Netmask: " IPSTR "\n", IP2STR(&ip_info.netmask));
      // printf("Gateway: " IPSTR "\n", IP2STR(&ip_info.gw));
      char *ip_address = ip4addr_ntoa((const ip4_addr_t *)&ip_info.ip);

      if (strstr((char *)wifi_config.sta.ssid, "\r") != NULL)
      {
        ESP_LOGE(TAG, ">>>>>> tiene un retorno de carro ");
      }

      /////////////
      uint16_t message_size = strlen(LSS_QueryNetworkStatus) + strlen((char *)wifi_config.sta.ssid) + strlen(ip_address) + 6;
      msg = malloc(sizeof(char) * (message_size));
      snprintf(msg, message_size, "*%s1@%s@%s\r", LSS_QueryNetworkStatus, (char *)wifi_config.sta.ssid, ip_address);
      /////////////
    }
    else
    {
      /////////
      uint16_t message_size = strlen(LSS_QueryNetworkStatus) + strlen((char *)wifi_config.sta.ssid) + strlen("0.0.0.0") + 6;
      msg = malloc(sizeof(char) * (message_size));
      snprintf(msg, message_size, "*%s0@%s@0.0.0.0\r", LSS_QueryNetworkStatus, (char *)wifi_config.sta.ssid);
      /////////
    }

    ESP_LOGI(TAG, "CONNECTION STATUS %s", msg);
    esp_err_t ret = ws_async_send(msg, fd);
    if (ret != ESP_OK)
    {
      ESP_LOGE(TAG, "WS Error sending message");
    }

    if (msg != NULL)
    {
      free(msg);
    }
  }
}

void store_network_credentials(const ws_dkmessage_t *ws_msg)
{
  char *network = ws_msg->msg;
  // Decode message
  ESP_LOGI(TAG, "NETWORK MESSAGE:%s", network);

  char *token = strtok(network, "@");
  char *SSID = strtok(NULL, "@");
  token = strtok(NULL, "\r");
  char *PASS = token;
  if (PASS == NULL)
    PASS = "";
  ESP_LOGW(TAG, "DECODED SSID: %s", SSID);
  ESP_LOGW(TAG, "DECODED PASS: %s", PASS);

  // Open NVS handle
  nvs_handle_t nvs_wifi_data_handler;
  esp_err_t err = nvs_open("wifi_data", NVS_READWRITE, &nvs_wifi_data_handler);
  if (err != ESP_OK)
  {
    ESP_LOGE(TAG, "Error (%s) opening NVS handle!\n", esp_err_to_name(err));
    return;
  }

  // Write SSID to NVS
  err = nvs_set_str(nvs_wifi_data_handler, "ssid", SSID);
  if (err != ESP_OK)
  {
    printf("Error (%s) writing SSID to NVS!\n", esp_err_to_name(err));
    return;
  }

  // Write PASS to NVS
  err = nvs_set_str(nvs_wifi_data_handler, "pass", PASS);
  if (err != ESP_OK)
  {
    printf("Error (%s) writing PASS to NVS!\n", esp_err_to_name(err));
    return;
  }

  // Commit changes to flash
  err = nvs_commit(nvs_wifi_data_handler);
  if (err != ESP_OK)
  {
    printf("Error (%s) committing changes to NVS!\n", esp_err_to_name(err));
    return;
  }

  // Close NVS handle
  nvs_close(nvs_wifi_data_handler);

  // RESTART TO CONNECT AT STARTUP
  vTaskDelay(pdMS_TO_TICKS(10));
  esp_restart();
}

void ws_send_distance_reading(const ws_dkmessage_t *ws_msg)
{
  int fd = ws_msg->fd;
  uint16_t distance = 0;
  read_distance(&distance);

  uint8_t message_size = 1 + strlen(LSS_QueryDistance) + 6 + 1 + 1;
  char *msg = malloc(sizeof(char) * (message_size));
  snprintf(msg, message_size, "*%s%d\r", LSS_QueryDistance, distance);

  ws_async_send(msg, fd);
  free(msg);
}

void led_brightness(const ws_dkmessage_t *ws_msg)
{
  uint8_t value = strtol(ws_msg->msg + strlen(LSS_SetFrontalLeds) + 1, NULL, 10);
  ESP_LOGW(TAG, "LED VALUE: %d", value);
  set_led_brightness(value);
}

void store_face_descriptor_file(const ws_dkmessage_t *ws_msg)
{
  char *data = ws_msg->msg + 1 + strlen(LSS_ConfigFaceDescriptor);
  f = fopen(FACE_PATH, "w");
  fprintf(f, data);
  fclose(f);
}

void load_face_descriptor_file(const ws_dkmessage_t *ws_msg)
{
  int fd = ws_msg->fd;
  char *content = NULL;
  struct stat st;
  if (stat(FACE_PATH, &st) == 0)
  {
    // Open test file for reading
    ESP_LOGI(TAG, "Reading FACE file");
    f = fopen(FACE_PATH, "r");
    if (f == NULL)
    {
      ESP_LOGE(TAG, "Failed to open file for reading");
      return;
    }

    fseek(f, 0, SEEK_END);
    long fileSize = ftell(f);
    fseek(f, 0, SEEK_SET);

    uint8_t cmd =  strlen(LSS_QueryFaceDescriptor);

    content = (char *)malloc(fileSize+cmd+4);
    if (content == NULL)
    {
      ESP_LOGE(TAG, "Failed to alloc memory");
      fclose(f);
      return;
    }
    
    snprintf(content,cmd+3, "*%s1", LSS_QueryFaceDescriptor);
    long readChars = fread(content+cmd+2, 1, fileSize, f);
    snprintf(content+fileSize+cmd+1,fileSize+cmd+4, "\r");

    if (readChars != fileSize)
    {
      ESP_LOGE(TAG, "Error reading file, different sizes: readChars %ld, fileSize: %ld", readChars, fileSize);
    }

    fclose(f);
  }
  else
  {
    uint8_t message_size = 1 + strlen(LSS_QueryFaceDescriptor) + 1 + 2;
    content = (char *)malloc(message_size);
    snprintf(content, message_size, "*%s0\r", LSS_QueryFaceDescriptor);
    ESP_LOGE(TAG, "no face file detected");
  }

  esp_err_t ret = ws_async_send(content, fd);
  if (ret != ESP_OK)
  {
    ESP_LOGE(TAG, "WS Error sending message");
  }

  if (content != NULL)
  {
    free(content);
  }
}

////// ESP STATES

// Structure for mapping commands to functions
typedef struct
{
  const char *command;
  void (*function)(const ws_dkmessage_t *ws_msg);
} CommandMapping;

// Commands - Functions Array
const CommandMapping ESP_Functions[] = {
    {LSS_QueryAvailableNetworks, ws_available_networks},
    {LSS_QueryNetworkStatus, ws_connection_status},
    {LSS_ConfigWiFi, store_network_credentials},
    {LSS_QueryDistance, ws_send_distance_reading},
    {LSS_SetFrontalLeds, led_brightness},
    {LSS_ConfigFaceDescriptor, store_face_descriptor_file},
    {LSS_QueryFaceDescriptor, load_face_descriptor_file},
};

const uint8_t numCommands = COMMAND_COUNT(ESP_Functions);
uint8_t cmd_len[COMMAND_COUNT(ESP_Functions)];

uint8_t ws_cmd_handler(const ws_dkmessage_t *ws_msg)
{
  for (size_t i = 0; i < sizeof(ESP_Functions) / sizeof(ESP_Functions[0]); i++)
  {
    if (strncmp(ws_msg->msg + 1, ESP_Functions[i].command, cmd_len[i]) == 0)
    {
      ESP_LOGI(TAG, "%s: %s", ESP_Functions[i].command, ws_msg->msg);
      ESP_Functions[i].function(ws_msg);
      ESP_LOGI(TAG, "It is a command handled by the ESP32 %s", ESP_Functions[i].command);
      return 1; // It is a command handled by the ESP32
    }
  }
  ESP_LOGI(TAG, "It is not an ESP command and must be sent to RP2040 %s", ws_msg->msg);
  return 0;
}

void deskpet_states(void)
{
  xQueue_ws_msg = xQueueCreate(QUEUE_WS_LENGTH, WS_MSG_SIZE);
  if (xQueue_ws_msg != NULL)
  {
    ws_dkmessage_t *ws_received_msg;
    while (true)
    {
      if (uxQueueMessagesWaiting(xQueue_ws_msg) > 0)
      {
        xQueueReceive(xQueue_ws_msg, &ws_received_msg, portMAX_DELAY);

        // LSS Servo command
        if (isdigit(ws_received_msg->msg[1]))
        {
          ESP_LOGI(TAG, "Servo CMD received: %s", ws_received_msg->msg);
          // return ESP_OK;
        }

        if (ws_cmd_handler(ws_received_msg))
        { // it is an ESP CMD
          free_ws_dkmessage(ws_received_msg);
        }
        else
        {
          xQueueSend(xQueue_uart, &ws_received_msg, portMAX_DELAY);
        }
      }
      vTaskDelay(pdMS_TO_TICKS(10));
    }
  }
}

bool wait_for_wifi_initialization(NetworkStatus_t **netinfo)
{
  const TickType_t timeout_ms = pdMS_TO_TICKS(5 * 60000); // 5 minutes in milliseconds
  TickType_t start_time = xTaskGetTickCount();
  TickType_t current_time;
  while (true)
  {
    if (uxQueueMessagesWaiting(xQueue_wifi) > 0)
    {
      xQueueReceive(xQueue_wifi, netinfo, portMAX_DELAY);
      return true;
    }
    current_time = xTaskGetTickCount();
    if ((current_time - start_time) >= timeout_ms)
      return false;

    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

esp_err_t initialize_component(esp_err_t (*init_func)(void), const char *component_name)
{
  ESP_LOGI(TAG, "Initializing %s...", component_name);
  esp_err_t err = init_func();
  if (err != ESP_OK)
  {
    ESP_LOGE(TAG, "Failed to initialize %s", component_name);
  }
  else
  {
    ESP_LOGI(TAG, "%s initialized successfully", component_name);
  }
  vTaskDelay(pdMS_TO_TICKS(100)); // Optional delay after initialization
  return err;
}

esp_err_t deskpet_init(void)
{
  // Update CMDs len
  for (uint8_t i = 0; i < numCommands; i++)
  {
    cmd_len[i] = strlen(ESP_Functions[i].command);
  }

  esp_err_t err = ESP_OK;

  // CAMERA INITIALIZATION
  err = initialize_component(camera_init, "Camera");
  // if (err != ESP_OK)
  //   return err;

  // CAMERA LEDs INIT
  err = initialize_component(ledc_init, "LED Controller");
  // if (err != ESP_OK)
  //   return err;

  // DISTANCE TOF SENSOR INIT
  err = initialize_component(distance_sensor_init, "Distance Sensor");
  // if (err != ESP_OK)
  //   return err;

  // UART COMUNICATION WITH MOTION CONTROLLER INIT
  err = initialize_component(uart_init, "UART Communication");
  // if (err != ESP_OK)
  //   return err;

  // WIFI QUEUE
  xQueue_wifi = xQueueCreate(QUEUE_LENGTH, ITEM_SIZE);
  if (xQueue_wifi == NULL)
  {
    ESP_LOGE(TAG, "Failed to create WIFI Queue");
    return ESP_FAIL;
  }

  // LOAD LAST STORED WIFI CREDENTIALS
  char *ssid = NULL;
  char *pass = NULL;
  load_network_credentials(&ssid, &pass);

  wifi_init(ssid, pass);

  free(ssid);
  free(pass);

  // Wait for WIFI INITIALIZATION
  NetworkStatus_t *netinfo;
  if (wait_for_wifi_initialization(&netinfo))
  {
    if (netinfo->connected)
    {
      ESP_LOGI(TAG, "got ip:" IPSTR, IP2STR(&netinfo->ip));
    }
    else
    {
      ESP_LOGE(TAG, "Could not connect to network");
    }
    free(netinfo);
  }
  else
  {
    return ESP_FAIL;
  }

  // WEB SERVER INITIALIZATION
  ESP_LOGI(TAG, "INITIALIZING WEB SERVER");
  httpd_handle_t ws_server = setup_server();
  if (ws_server == NULL)
  {
    ESP_LOGE(TAG, "WEB SERVER INITIALIZATION ERROR");
    return ESP_FAIL;
  }

  // UART QUEUE
  xQueue_uart = xQueueCreate(10, WS_MSG_SIZE);
  if (xQueue_uart == NULL)
  {
    ESP_LOGE(TAG, "Failed to create UART Queue");
    return ESP_FAIL;
  }

  // UART RP2040 TASK INIT
  if (xTaskCreate(uart_cmd_task, "uart_task", 1024 * 10, NULL, 9, &uart_task_handle) == pdPASS)
  {
    ESP_LOGI(TAG, "UART Communication Started successfully");
  }
  else
  {
    ESP_LOGE(TAG, "Failed to start UART Communication");
    vQueueDelete(xQueue_uart);
    return ESP_FAIL;
  }

  ESP_LOGI(TAG, "DeskPet initialization completed successfully");
  return err;
}

void app_main(void)
{
  // Initialize NVS
  ESP_LOGI(TAG, "Initializing NVS");
  esp_err_t ret = nvs_flash_init();
  if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND)
  {
    ESP_ERROR_CHECK(nvs_flash_erase());
    ret = nvs_flash_init();
  }
  ESP_ERROR_CHECK(ret);

  ESP_LOGI(TAG, "Initializing LittleFS");

  esp_vfs_littlefs_conf_t conf = {
      .base_path = "/littlefs",
      .partition_label = "littlefs",
      .format_if_mount_failed = true,
      .dont_mount = false,
  };

  ret = esp_vfs_littlefs_register(&conf);

  if (ret != ESP_OK)
  {
    if (ret == ESP_FAIL)
    {
      ESP_LOGE(TAG, "Failed to mount or format filesystem");
    }
    else if (ret == ESP_ERR_NOT_FOUND)
    {
      ESP_LOGE(TAG, "Failed to find LittleFS partition");
    }
    else
    {
      ESP_LOGE(TAG, "Failed to initialize LittleFS (%s)", esp_err_to_name(ret));
    }
    return;
  }

  struct stat st;
  // if (stat(FACE_PATH, &st) == 0)
  // {
  //   // Delete it if it exists
  //   unlink(FACE_PATH);
  //   ESP_LOGW(TAG, "/littlefs/hello.txt DELETED");
  // }else{
  //   ESP_LOGW(TAG, "/littlefs/hello.txt dont found");
  // }

  // Get partition size
  size_t total = 0, used = 0;
  ret = esp_littlefs_info(conf.partition_label, &total, &used);
  if (ret != ESP_OK)
  {
    ESP_LOGE(TAG, "Failed to get LittleFS partition information (%s)", esp_err_to_name(ret));
  }
  else
  {
    ESP_LOGI(TAG, "Partition size: total: %d, used: %d", total, used);
  }

  if (stat(FACE_PATH, &st) == 0)
  {
    // Open test file for reading
    ESP_LOGI(TAG, "Reading FACE file");
    f = fopen(FACE_PATH, "r");
    if (f == NULL)
    {
      ESP_LOGE(TAG, "Failed to open file for reading");
      return;
    }

    fseek(f, 0, SEEK_END);
    long fileSize = ftell(f);
    fseek(f, 0, SEEK_SET);

    char *content = (char *)malloc(fileSize + 1);
    if (content == NULL)
    {
      ESP_LOGE(TAG, "Failed to alloc memory");
      fclose(f);
      return;
    }

    // Leer el contenido del archivo en el búfer
    long readChars = fread(content, 1, fileSize, f);
    if (readChars != fileSize)
    {
      ESP_LOGE(TAG, "Error reading file, different sizes: readChars %ld, fileSize: %ld", readChars, fileSize);
    }
    content[fileSize] = '\0'; // Agregar el carácter nulo al final

    free(content);
    fclose(f);
  }
  else
  {
    ESP_LOGE(TAG, "no face file detected");
  }
  /////////////////////////////////////

  ESP_ERROR_CHECK(esp_event_loop_create_default());

  // Initialize Deskpet
  if (deskpet_init() == ESP_OK)
  {
    ESP_LOGI(TAG, "DeskPet initialized correctly");
    deskpet_states();
    // xTaskCreate(deskpet_states, "DeskPet states monitoring", 4096, NULL, tskIDLE_PRIORITY + 1, NULL);
  }
  else
  {
    ESP_LOGE(TAG, "Error initiating DeskPet");
  }
}
