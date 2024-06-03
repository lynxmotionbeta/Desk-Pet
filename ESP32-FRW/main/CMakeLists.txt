idf_component_register(
    SRCS "camera.c" "vm_http.c" "DESKPET_VISION_MODULE.c" "vm_wifi.c" "uart.c"
    INCLUDE_DIRS "include/"
    EMBED_FILES 
        "static/style.css.gz"
        "static/script.js.gz"
        "static/communication.js.gz"
        "static/utils.js.gz"
        "static/joystick.js.gz"
        "static/arrow-bar-left.svg.gz"
        "static/arrow-bar-right.svg.gz"
        "static/camera-video.svg.gz"
        "static/gear.svg.gz"
        "static/joystick-base.png.gz"
        "static/joystick-orange.png.gz"
        "static/lynxmotion_logo.png.gz"
        "static/lynxmotion_icon_32x32.png.gz"
        "static/index.html.gz"
    REQUIRES esp_http_server nvs_flash esp32-camera esp_littlefs esp_netif esp_wifi lwip esp32-vl53l0x log mdns esp_partition)
                    