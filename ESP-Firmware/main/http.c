#include "http.h"

#define ECHO_TEST_TXD (18)
#define ECHO_TEST_RXD (17)
#define ECHO_TEST_RTS (UART_PIN_NO_CHANGE)
#define ECHO_TEST_CTS (UART_PIN_NO_CHANGE)

#define ECHO_UART_PORT_NUM      (1)
#define ECHO_UART_BAUD_RATE     (9600)
#define ECHO_TASK_STACK_SIZE    (2048)
#define BUF_SIZE (1024)

#define NETWORKS_EXAMPLE "{\"networks\":[{\"ssid\":\"TP-LINK_377F9B_EXT\"},{\"ssid\":\"TP-LINK_377F9B\"},{\"ssid\":\"POTATONET\"}]}"
#define PART_BOUNDARY "123456789000000000000987654321"
static const char *_STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char *_STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char *_STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

static const uint8_t WINDOW = 30;

static const char * service_name = "_esp-cam";
static const char * proto = "_tcp";
static char framesize[4];

// For testing
uint8_t counter = 0;
float mean = 0;

/*
 * This handler echos back the received ws data
 * and triggers an async send if certain message received
 */
esp_err_t ws_handler(httpd_req_t *req)
{
    uint8_t buf[128] = {0};
    httpd_ws_frame_t ws_pkt;
    memset(&ws_pkt, 0, sizeof(httpd_ws_frame_t));
    ws_pkt.payload = buf;
    ws_pkt.type = HTTPD_WS_TYPE_TEXT;

    esp_err_t ret = httpd_ws_recv_frame(req, &ws_pkt, 128);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "httpd_ws_recv_frame failed with %d", ret);
        return ret;
    }
    ESP_LOGI(TAG, "Got packet with message: %s", ws_pkt.payload);
    ESP_LOGI(TAG, "Packet type: %d", ws_pkt.type);

    if (ws_pkt.type == HTTPD_WS_TYPE_TEXT &&
        strcmp((char *)ws_pkt.payload, "Scan") == 0)
    {
        char * buf2 = NETWORKS_EXAMPLE;
        httpd_ws_frame_t ws_pkt2;
        memset(&ws_pkt2, 0, sizeof(httpd_ws_frame_t));
        ws_pkt2.payload = (uint8_t*)buf2;
        ws_pkt2.type = HTTPD_WS_TYPE_TEXT;
        ws_pkt2.len = strlen(buf2);
        printf("\n payload: %s", ws_pkt2.payload);
        ret = httpd_ws_send_frame(req, &ws_pkt2);
        if (ret != ESP_OK)
        {
            ESP_LOGE(TAG, "httpd_ws_send_frame failed with %d", ret);
        }
    }
    return ret;
}

esp_err_t jpg_stream_httpd_handler(httpd_req_t *req)
{
    camera_fb_t *fb = NULL;
    esp_err_t res = ESP_OK;
    size_t _jpg_buf_len;
    uint8_t *_jpg_buf;
    char *part_buf[64];
    static int64_t last_frame = 0;

    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin","*");

    if (!last_frame)
    {
        last_frame = esp_timer_get_time();
    }

    res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
    if (res != ESP_OK)
    {
        return res;
    }

    //Vertical and horizontal flip
    sensor_t *s = esp_camera_sensor_get();
    s->set_vflip(s, 1);
    s->set_hmirror(s, 1);      

    while (true)
    {
        fb = esp_camera_fb_get();
        if (!fb)
        {
            ESP_LOGE(TAG, "Camera capture failed");
            res = ESP_FAIL;
            break;
        }
        if (fb->format != PIXFORMAT_JPEG)
        {
            bool jpeg_converted = frame2jpg(fb, 80, &_jpg_buf, &_jpg_buf_len);
            if (!jpeg_converted)
            {
                ESP_LOGE(TAG, "JPEG compression failed");
                esp_camera_fb_return(fb);
                res = ESP_FAIL;
            }
        }
        else
        {
            _jpg_buf_len = fb->len;
            _jpg_buf = fb->buf;
        }

        if (res == ESP_OK)
        {
            res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));

            size_t hlen = snprintf((char *)part_buf, 64, _STREAM_PART, _jpg_buf_len);

            res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);

            res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
        }
        if (fb->format != PIXFORMAT_JPEG)
        {
            free(_jpg_buf);
        }
        esp_camera_fb_return(fb);
        if (res != ESP_OK)
        {
            break;
        }
        int64_t fr_end = esp_timer_get_time();
        int64_t frame_time = fr_end - last_frame;
        last_frame = fr_end;
        frame_time /= 1000;

        // ESP_LOGI(TAG, "MJPG: %uKB %ums (%.1ffps)",
        // (uint32_t)(_jpg_buf_len/1024),
        // (uint32_t)frame_time, 1000.0 / (uint32_t)frame_time);

        if (counter < WINDOW)
        {
            mean += (1000.0 / (uint32_t)frame_time);
            counter++;
        }
        else
        {
            mean /= WINDOW;
            ESP_LOGI(TAG, "(%.1f fps MEAN)", mean);
            counter = 0;
            mean = 0;
        }
    }

    last_frame = 0;
    return res;
}

typedef struct
{
    httpd_req_t *req;
    size_t len;
} jpg_chunking_t;

size_t jpg_encode_stream(void *arg, size_t index, const void *data, size_t len)
{
    jpg_chunking_t *j = (jpg_chunking_t *)arg;
    if (!index)
    {
        j->len = 0;
    }
    if (httpd_resp_send_chunk(j->req, (const char *)data, len) != ESP_OK)
    {
        return 0;
    }
    j->len += len;
    return len;
}

esp_err_t jpg_httpd_handler(httpd_req_t *req)
{
    camera_fb_t *fb = NULL;
    esp_err_t res = ESP_OK;
    size_t fb_len = 0;
    int64_t fr_start = esp_timer_get_time();

    fb = esp_camera_fb_get();
    if (!fb)
    {
        ESP_LOGE("CAMERA WEB SERVER", "Camera capture failed");
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }
    res = httpd_resp_set_type(req, "image/jpeg");
    if (res == ESP_OK)
    {
        res = httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
        if (fb->format == PIXFORMAT_JPEG)
        {
            fb_len = fb->len;
            res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
        }
        else
        {
            jpg_chunking_t jchunk = {req, 0};
            res = frame2jpg_cb(fb, 80, jpg_encode_stream, &jchunk) ? ESP_OK : ESP_FAIL;
            httpd_resp_send_chunk(req, NULL, 0);
            fb_len = jchunk.len;
        }
    }
    esp_camera_fb_return(fb);
    int64_t fr_end = esp_timer_get_time();
    ESP_LOGI("CAMERA WEB SERVER", "JPG: %uKB %ums", (uint32_t)(fb_len / 1024), (uint32_t)((fr_end - fr_start) / 1000));
    return res;
}

httpd_uri_t ws = {
    .uri = "/ws",
    .method = HTTP_GET,
    .handler = ws_handler,
    .user_ctx = NULL,
    .is_websocket = true};

httpd_uri_t capture_uri = {
    .uri = "/capture",
    .method = HTTP_GET,
    .handler = jpg_httpd_handler,
    .user_ctx = NULL};

httpd_uri_t stream_uri = {
    .uri = "/streaming",
    .method = HTTP_GET,
    .handler = jpg_stream_httpd_handler,
    .user_ctx = NULL};

httpd_uri_t index_uri = {
    .uri = "/",
    .method = HTTP_GET,
    .handler = index_handler,
    .user_ctx = NULL};

httpd_uri_t logo_uri = {
    .uri = "/lynxmotion_logo.png",
    .method = HTTP_GET,
    .handler = logo_handler,
    .user_ctx = NULL};

httpd_uri_t style_uri = {
    .uri = "/style.css",
    .method = HTTP_GET,
    .handler = style_handler,
    .user_ctx = NULL};

httpd_uri_t js_uri = {
    .uri = "/script.js",
    .method = HTTP_GET,
    .handler = js_handler,
    .user_ctx = NULL};

httpd_uri_t loading_uri = {
    .uri = "/loading.gif",
    .method = HTTP_GET,
    .handler = loading_handler,
    .user_ctx = NULL};

httpd_uri_t cmd_uri = {
    .uri = "/control",
    .method = HTTP_GET,
    .handler = cmd_handler,
    .user_ctx = NULL};
    

httpd_handle_t start_webserver(void)
{
    httpd_handle_t server = NULL;
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.max_uri_handlers = 10;
    config.lru_purge_enable = true;

    // Start the httpd server
    ESP_LOGI("HTTP", "Starting server on port: %d", config.server_port);
    if (httpd_start(&server, &config) == ESP_OK)
    {
        // Set URI handlers
        ESP_LOGI("HTTP", "Registering URI handlers");
        httpd_register_uri_handler(server, &capture_uri);
        httpd_register_uri_handler(server, &stream_uri);
        httpd_register_uri_handler(server, &index_uri);
        httpd_register_uri_handler(server, &logo_uri);
        httpd_register_uri_handler(server, &style_uri);
        httpd_register_uri_handler(server, &js_uri);
        httpd_register_uri_handler(server, &loading_uri);
        httpd_register_uri_handler(server, &ws);
        httpd_register_uri_handler(server, &cmd_uri);
        // httpd_register_uri_handler(server, &mdns_uri);
        return server;
    }

    ESP_LOGI("HTTP", "Error starting server!");
    return NULL;
}

void stop_webserver(httpd_handle_t server)
{
    httpd_stop(server);
}

void disconnect_handler(void *arg, esp_event_base_t event_base, int32_t event_id, void *event_data)
{
    httpd_handle_t *server = (httpd_handle_t *)arg;
    if (*server)
    {
        ESP_EARLY_LOGI("HTTP", "Stopping webserver");
        stop_webserver(*server);
        *server = NULL;
    }
}

void connect_handler(void *arg, esp_event_base_t event_base, int32_t event_id, void *event_data)
{
    httpd_handle_t *server = (httpd_handle_t *)arg;
    if (*server == NULL)
    {
        ESP_EARLY_LOGI("HTTP", "Starting webserver");
        *server = start_webserver();
    }
}

void http_main()
{
    static httpd_handle_t server = NULL;
    ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &connect_handler, &server));
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, WIFI_EVENT_STA_DISCONNECTED, &disconnect_handler, &server));
    server = start_webserver();
    init_uart();
}

esp_err_t index_handler(httpd_req_t *req)
{
    extern const unsigned char wifi_config_html_gz_start[] asm("_binary_wifi_config_html_gz_start");
    extern const unsigned char wifi_config_html_gz_end[] asm("_binary_wifi_config_html_gz_end");
    size_t wifi_config_html_gz_len = wifi_config_html_gz_end - wifi_config_html_gz_start;
    printf("wifi_config_html_gz_len: %zd\n", wifi_config_html_gz_len);

    httpd_resp_set_type(req, "text/html");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");

    return httpd_resp_send(req, (const char *)wifi_config_html_gz_start, wifi_config_html_gz_len);
}

esp_err_t style_handler(httpd_req_t *req)
{
    extern const unsigned char style_css_gz_start[] asm("_binary_style_css_gz_start");
    extern const unsigned char style_css_gz_end[] asm("_binary_style_css_gz_end");
    size_t style_css_gz_len = style_css_gz_end - style_css_gz_start;
    printf("style_css_len: %zd\n", style_css_gz_len);

    httpd_resp_set_type(req, "text/css");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");

    return httpd_resp_send(req, (const char *)style_css_gz_start, style_css_gz_len);
}

esp_err_t js_handler(httpd_req_t *req)
{
    extern const unsigned char script_js_gz_start[] asm("_binary_script_js_gz_start");
    extern const unsigned char script_js_gz_end[] asm("_binary_script_js_gz_end");
    size_t script_js_gz_len = script_js_gz_end - script_js_gz_start;
    printf("script_js_len: %zd\n", script_js_gz_len);

    httpd_resp_set_type(req, "text/js");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");

    return httpd_resp_send(req, (const char *)script_js_gz_start, script_js_gz_len);
}

esp_err_t logo_handler(httpd_req_t *req)
{

    extern const unsigned char lynxmotion_logo_png_gz_start[] asm("_binary_lynxmotion_logo_png_gz_start");
    extern const unsigned char lynxmotion_logo_png_gz_end[] asm("_binary_lynxmotion_logo_png_gz_end");
    const size_t lynxmotion_logo_png_gz_size = (lynxmotion_logo_png_gz_end - lynxmotion_logo_png_gz_start);
    httpd_resp_set_type(req, "image/png");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    
    httpd_resp_send(req, (const char *)lynxmotion_logo_png_gz_start, lynxmotion_logo_png_gz_size);
    return ESP_OK;
}

esp_err_t loading_handler(httpd_req_t *req)
{

    extern const unsigned char loading_gif_gz_start[] asm("_binary_loading_gif_gz_start");
    extern const unsigned char loading_gif_gz_end[] asm("_binary_loading_gif_gz_end");
    const size_t loading_gif_gz_size = (loading_gif_gz_end - loading_gif_gz_start);
    httpd_resp_set_type(req, "image/png");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    
    httpd_resp_send(req, (const char *)loading_gif_gz_start, loading_gif_gz_size);
    return ESP_OK;
}

void app_mdns_update_framesize(int size)
{
    snprintf(framesize, 4, "%d", size);
    if(mdns_service_txt_item_set(service_name, proto, "framesize", (char*)framesize)){
        ESP_LOGE(TAG, "mdns_service_txt_item_set() framesize Failed");
    }
}

esp_err_t parse_get(httpd_req_t *req, char **obuf)
{
    char *buf = NULL;
    size_t buf_len = 0;

    buf_len = httpd_req_get_url_query_len(req) + 1;
    if (buf_len > 1) {
        buf = (char *)malloc(buf_len);
        if (!buf) {
            httpd_resp_send_500(req);
            return ESP_FAIL;
        }
        if (httpd_req_get_url_query_str(req, buf, buf_len) == ESP_OK) {
            *obuf = buf;
            return ESP_OK;
        }
        free(buf);
    }
    httpd_resp_send_404(req);
    return ESP_FAIL;
}

esp_err_t cmd_handler(httpd_req_t *req)
{
    char *buf = NULL;
    char variable[32];
    char value[32];

    if (parse_get(req, &buf) != ESP_OK) {
        return ESP_FAIL;
    }
    if (httpd_query_key_value(buf, "var", variable, sizeof(variable)) != ESP_OK ||
        httpd_query_key_value(buf, "val", value, sizeof(value)) != ESP_OK) {
        free(buf);
        httpd_resp_send_404(req);
        return ESP_FAIL;
    }
    free(buf);

    int val = atoi(value);
    ESP_LOGI(TAG, "%s = %d", variable, val);
    sensor_t *s = esp_camera_sensor_get();
    int res = 0;

    // Configure a temporary buffer for the incoming data
    uint8_t *data = (uint8_t *) malloc(BUF_SIZE);

    if (!strcmp(variable, "framesize")) {
        if (s->pixformat == PIXFORMAT_JPEG) {
            res = s->set_framesize(s, (framesize_t)val);
            if (res == 0) {
                app_mdns_update_framesize(val);
            }
        }
    }
    else if (!strcmp(variable, "brightness"))
        res = s->set_brightness(s, val);
    else if (!strcmp(variable, "contrast"))
        res = s->set_contrast(s, val);
    else if (!strcmp(variable, "saturation"))
        res = s->set_saturation(s, val);
    else if (!strcmp(variable, "D")){
        ESP_LOGI("Motion", "#M%d\r", val);
        data[0] = '#';
        data[1] = 'M';
        data[2] = value[0];
        data[3] = '\r';
        uart_write_bytes(ECHO_UART_PORT_NUM, (const uint8_t *)data, 4);
    }
    else if (!strncmp(variable, "P", 1))
        ESP_LOGI("Position", "%s%d", variable, val);

    else {
        ESP_LOGI(TAG, "Unknown command: %s", variable);
        res = -1;
    }

    if (res < 0) {
        return httpd_resp_send_500(req);
    }

    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, NULL, 0);
}

void init_uart()
{
    /* Configure parameters of an UART driver,
     * communication pins and install the driver */
    uart_config_t uart_config = {
        .baud_rate = ECHO_UART_BAUD_RATE,
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

    ESP_ERROR_CHECK(uart_driver_install(ECHO_UART_PORT_NUM, BUF_SIZE * 2, 0, 0, NULL, intr_alloc_flags));
    ESP_ERROR_CHECK(uart_param_config(ECHO_UART_PORT_NUM, &uart_config));
    ESP_ERROR_CHECK(uart_set_pin(ECHO_UART_PORT_NUM, ECHO_TEST_TXD, ECHO_TEST_RXD, ECHO_TEST_RTS, ECHO_TEST_CTS));
}