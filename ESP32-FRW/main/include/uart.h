#ifndef _UART_H_
#define _UART_H_

#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "driver/gpio.h"
#include "sdkconfig.h"
#include "esp_log.h"
#include <string.h>

#define TXD (17)
#define RXD (18)
#define RTS (-1) //UART_PIN_NO_CHANGE
#define CTS (-1) //UART_PIN_NO_CHANGE

#define UART_PORT_NUM      (1)
#define UART_BAUD_RATE     (115200)
#define TASK_STACK_SIZE    (1024 * 2)

#define BUF_SIZE (1024)

#define TIMEOUT_MS 100 // Timeout of 5 seconds in milliseconds

// Function to configure UART
esp_err_t uart_init();

// Function to send commands to RP2040
//void send_command(uint16_t position);

// Function to receive data from UART
char* receive_command();


#endif