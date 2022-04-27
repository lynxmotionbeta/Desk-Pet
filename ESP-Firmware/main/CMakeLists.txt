idf_component_register(
    SRCS "camera.c" "main.c" "wifi.c" "http.c"
    INCLUDE_DIRS "include"
    EMBED_FILES "static/wifi_config.html.gz" "static/style.css.gz" "static/script.js.gz" "static/lynxmotion_logo.png.gz""static/loading.gif.gz")

set(COMPONENT_REQUIRES
    esp32-camera
    nvs_flash
    esp_http_server
    mdns
    )

# set(COMPONENT_EMBED_TXTFILES
#         "static/wifi_config.html")

#register_component()