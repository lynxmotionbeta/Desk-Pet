idf_component_register(
                    SRCS "camera.c" "vm_http.c" "DESKPET_VISION_MODULE.c" "vm_wifi.c" "uart.c"
                    INCLUDE_DIRS "include/"
                    EMBED_FILES "static/wifi_config.html.gz" "static/style.css.gz" "static/script.js.gz" "static/lynxmotion_logo.png.gz" "static/loading.gif.gz" "static/lynxmotion_icon_32x32.png.gz"
                    REQUIRES esp_http_server nvs_flash spiffs esp32-camera esp_netif esp_wifi lwip esp32-vl53l0x log)
