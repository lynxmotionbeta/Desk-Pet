#include "uart.h"

char data_buffer[BUF_SIZE];
const char *TAG = "UART";

TickType_t start_time;
TickType_t current_time;

// Function to configure UART
esp_err_t uart_init()
{
    // UART configuration
    uart_config_t uart_config = {
        .baud_rate = UART_BAUD_RATE,
        .data_bits = UART_DATA_8_BITS,
        .parity    = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_APB,
    };
    int intr_alloc_flags = 0;

    #if CONFIG_UART_ISR_IN_IRAM
        intr_alloc_flags = ESP_INTR_FLAG_IRAM;
    #endif

    esp_err_t err;

    // Install and configure the UART driver
    err = uart_driver_install(UART_PORT_NUM, BUF_SIZE, 0, 0, NULL, intr_alloc_flags);
    if (err != ESP_OK) {
        return err; // Return the error if installation fails
    }

    // Configure UART parameters
    err = uart_param_config(UART_PORT_NUM, &uart_config);
    if (err != ESP_OK) {
        return err; // Return the error if parameter configuration fails
    }

    // Set UART pins
    err = uart_set_pin(UART_PORT_NUM, TXD, RXD, RTS, CTS);
    if (err != ESP_OK) {
        return err; // Return the error if pin configuration fails
    }

    return ESP_OK; // Return ESP_OK if initialization is successful
}

// Function to receive data from UART
char *receive_command()
{
    char *command = NULL;
    int len;
    start_time = xTaskGetTickCount(); // Start time
    size_t buffered_len;

    while (true)
    {
        // Check if the timeout has been reached
        current_time = xTaskGetTickCount();
        if ((current_time - start_time) * portTICK_PERIOD_MS >= TIMEOUT_MS)
        {
            ESP_LOGE(TAG, "Timeout reached");
            break; // Exit the function if the timeout is reached
        }

        // Read data from UART
        uart_get_buffered_data_len(UART_PORT_NUM, &buffered_len);
        if (buffered_len > 0)
        {
            len = uart_read_bytes(UART_PORT_NUM, data_buffer, 20, 0);

            if (len)
            {
                if (data_buffer[len - 1] == '\r' && data_buffer[0] == '*')
                {
                    command = (char *)malloc(len + 1);
                    strncpy(command, data_buffer, len + 1);
                    command[len] = '\0';
                    break;
                }
            }
        }
    }
    // printf("Received CMD: %s\n",command);
    return command; // In case of no valid command or timeout
}