#include <esp_system.h>
#include <nvs_flash.h>
#include <sys/param.h>
#include <string.h>

#include "camera.h"
#include "wifi.h"
#include "http.h"

static const int btn_number = 45;

void IRAM_ATTR isr()
{
    if (gpio_get_level(45)){
        ESP_EARLY_LOGI("BUTTON", "POWER DOWN");
        gpio_set_level(10, 1);
    }
    else{
        // ESP_EARLY_LOGI("BUTTON", "POWER UP");
        gpio_set_level(10, 0);
    }
}

void app_main()
{
    camera_main();
    wifi_main();
    http_main();

    //Power down camera using GPIO 45 as interrupt button
    gpio_set_pull_mode(45, GPIO_PULLUP_PULLDOWN);
    gpio_set_level(45, 0);
    gpio_set_intr_type(45, GPIO_INTR_ANYEDGE);
    gpio_isr_handler_add(45, isr, (void*) &btn_number);
}  