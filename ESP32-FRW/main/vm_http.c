#include "vm_http.h"
#include "camera.h"

static const char *TAG = "SERVER"; // TAG for debug

QueueHandle_t xQueue_ws_msg = NULL;

httpd_handle_t server = NULL;

// For testing
uint8_t counter = 0;
float mean = 0;
static const uint8_t WINDOW = 10;

volatile int stream_client_fd;
volatile bool stream_is_active = false;
TaskHandle_t xStreamHandle = NULL;

void free_ws_dkmessage(ws_dkmessage_t *var)
{
    free(var->msg);
    free(var);
}

esp_err_t ws_async_send(char *msg, int fd)
{
    httpd_ws_frame_t ws_pkt;

    // char buff[strlen(msg)];
    // memset(buff, 0, sizeof(buff));
    // strcpy(buff, msg);

    memset(&ws_pkt, 0, sizeof(httpd_ws_frame_t));
    ws_pkt.payload = (uint8_t *)msg;
    ws_pkt.len = strlen(msg);
    ws_pkt.type = HTTPD_WS_TYPE_TEXT;

    esp_err_t ret = httpd_ws_send_frame_async(server, fd, &ws_pkt);
    return ret;
}

esp_err_t ws_async_send_all(char *msg)
{
    static size_t max_clients = CONFIG_LWIP_MAX_LISTENING_TCP;
    size_t fds = max_clients;
    int client_fds[max_clients];

    esp_err_t ret = httpd_get_client_list(server, &fds, client_fds);
    if (ret != ESP_OK)
    {
        return ret;
    }
    // printf("FDS: %d \n",client_fds[i]);
    httpd_ws_frame_t ws_pkt;
    char buff[strlen(msg)];
    memset(buff, 0, sizeof(buff));
    strcpy(buff, msg);

    memset(&ws_pkt, 0, sizeof(httpd_ws_frame_t));
    ws_pkt.payload = (uint8_t *)buff;
    ws_pkt.len = strlen(buff);
    ws_pkt.type = HTTPD_WS_TYPE_TEXT;

    for (int i = 0; i < fds; i++)
    {
        int client_info = httpd_ws_get_fd_info(server, client_fds[i]);
        if (client_info == HTTPD_WS_CLIENT_WEBSOCKET)
        {
            httpd_ws_send_frame_async(server, client_fds[i], &ws_pkt);
        }
    }
    return ret;
}

// Websocket handlers
static esp_err_t ws_handler(httpd_req_t *req) // ws
{
    if (req->method == HTTP_GET)
    {
        ESP_LOGI(TAG, "Handshake done, the new connection was opened");
        return ESP_OK;
    }

    httpd_ws_frame_t ws_pkt;
    uint8_t *buf = NULL;
    memset(&ws_pkt, 0, sizeof(httpd_ws_frame_t)); // set to zero ws frame variable
    ws_pkt.type = HTTPD_WS_TYPE_TEXT;
    esp_err_t ret = httpd_ws_recv_frame(req, &ws_pkt, 0); // get len of ws packet, which is stored in ws_pkt.len

    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "httpd_ws_recv_frame failed to get frame len with %d", ret);
        return ret;
    }
    if (ws_pkt.len)
    {
        ws_dkmessage_t *received_msg = (ws_dkmessage_t *)malloc(sizeof(ws_dkmessage_t));
        buf = calloc(1, ws_pkt.len + 1); // It is freed once the message is decoded
        if (buf == NULL)
        {
            ESP_LOGE(TAG, "Failed to calloc memory for buf");
            return ESP_ERR_NO_MEM;
        }

        ws_pkt.payload = buf;

        ret = httpd_ws_recv_frame(req, &ws_pkt, ws_pkt.len);
        if (ret != ESP_OK)
        {
            ESP_LOGE(TAG, "httpd_ws_recv_frame failed with %d", ret);
            free(buf);
            free(received_msg);
            return ret;
        }

        if (buf[0] != '#' || buf[ws_pkt.len - 1] != '\r')
        { // Invalid LSS command
            ESP_LOGE(TAG, "Invalid LSS command: %s", buf);
            free(buf);
            free(received_msg);
            return ESP_FAIL;
        }

        // buf[ws_pkt.len-1] = '\0';

        if (ws_pkt.type == HTTPD_WS_TYPE_TEXT)
        {

            received_msg->msg = (char *)buf;
            received_msg->fd = httpd_req_to_sockfd(req);
            received_msg->hd = server;
            xQueueSend(xQueue_ws_msg, &received_msg, portMAX_DELAY);
        }
    }
    return ESP_OK;
}

static void send_streaming_task(void *arg)
{
    camera_fb_t *fb = NULL;
    esp_err_t res = ESP_OK;
    int fr_start = 0;
    int frame_time = 0;

    int fd = stream_client_fd;

    TickType_t xLastWakeTime;
    const TickType_t xFrequency = pdMS_TO_TICKS(100); // 100 ms para lograr 10 fps
    // Inicializar el valor de xLastWakeTime fuera del bucle
    xLastWakeTime = xTaskGetTickCount();

    httpd_ws_frame_t ws_pkt;
    memset(&ws_pkt, 0, sizeof(httpd_ws_frame_t));
    ws_pkt.type = HTTPD_WS_TYPE_BINARY;

    while (true)
    {
        fr_start = esp_timer_get_time();

        fb = esp_camera_fb_get();
        if (!fb)
        {
            ESP_LOGE(TAG, "Camera capture failed");
            continue;
        }

        if (fb->format != PIXFORMAT_JPEG)
        {
            ESP_LOGE(TAG, "CAMERA FORMAT IS NOT JPEG");
            stream_is_active = false;
            esp_camera_fb_return(fb);
            break;
        }

        if (fb->len > 0)
        {
            ws_pkt.payload = fb->buf;
            ws_pkt.len = fb->len;

            if (fd != stream_client_fd)
            {
                fd = stream_client_fd;
            }

            res = httpd_ws_send_frame_async(server, fd, &ws_pkt);
            if (res != ESP_OK)
            {
                ESP_LOGE(TAG, "FAILED TO SEND IMAGE");
                stream_is_active = false;
                esp_camera_fb_return(fb);
                break;
            }
        }

        esp_camera_fb_return(fb);

        vTaskDelayUntil(&xLastWakeTime, xFrequency); // Comment this line for max fps
        
        frame_time = esp_timer_get_time() - fr_start;
        frame_time /= 1000;

        if (counter < WINDOW)
        {
            mean += (frame_time);
            counter++;
        }
        else
        {
            mean /= WINDOW;
            ESP_LOGI(TAG, "(%.1f fps MEAN)", 1000 / mean);
            counter = 0;
            mean = 0;
        }

        if (!stream_is_active)
        {
            ESP_LOGW(TAG, "SUSPEND TASK");
            vTaskSuspend(NULL);
        }
    }
    xStreamHandle = NULL;
    vTaskDelete(NULL);
}

esp_err_t ws_camera(httpd_req_t *req) // ws
{
    if (req->method == HTTP_GET)
    {
        ESP_LOGI(TAG, "Handshake done, the new connection was opened");
        return ESP_OK;
    }

    httpd_ws_frame_t ws_pkt;
    uint8_t *buf = NULL;
    memset(&ws_pkt, 0, sizeof(httpd_ws_frame_t)); // set to zero ws frame variable
    ws_pkt.type = HTTPD_WS_TYPE_TEXT;
    esp_err_t ret = httpd_ws_recv_frame(req, &ws_pkt, 0); // get len of ws packet, which is stored in ws_pkt.len

    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "httpd_ws_recv_frame failed to get frame len with %d", ret);
        return ret;
    }

    if (ws_pkt.len)
    {
        buf = calloc(1, ws_pkt.len + 1);
        if (buf == NULL)
        {
            ESP_LOGE(TAG, "Failed to calloc memory for buf");
            return ESP_ERR_NO_MEM;
        }

        ws_pkt.payload = buf;
        ret = httpd_ws_recv_frame(req, &ws_pkt, ws_pkt.len);

        if (ret != ESP_OK)
        {
            ESP_LOGE(TAG, "httpd_ws_recv_frame failed with %d", ret);
            free(buf);
            return ret;
        }

        if (ws_pkt.type == HTTPD_WS_TYPE_TEXT)
        {
            ESP_LOGI(TAG, "ws received msg %s", (char *)ws_pkt.payload);
            char qimg_payload = *(ws_pkt.payload + strlen("#QIMG"));

            if (qimg_payload == '0')
            {
                stream_is_active = false;
                ESP_LOGW(TAG, "STOP STREAMING");
                free(buf);
                return ESP_OK;
            }
            else if (qimg_payload == '1')
            {
                stream_is_active = true;
                ESP_LOGW(TAG, "START STREAMING");
            }
            else if (qimg_payload != '\r')
            {
                ESP_LOGE(TAG, "INVALID CAMERA COMMAND");
                free(buf);
                return ESP_OK;
            }
            else
            {
                ESP_LOGW(TAG, "QUERY IMAGE");
            }

            stream_client_fd = httpd_req_to_sockfd(req);

            if (!xStreamHandle)
            {
                xTaskCreatePinnedToCore(send_streaming_task, "send_video_streaming_task", 1024 * 10, NULL, 5, &xStreamHandle, 1);
                ESP_LOGW(TAG, "CREATE TASK");
            }
            else if (eTaskGetState(xStreamHandle) == eSuspended)
            {
                vTaskResume(xStreamHandle);
                ESP_LOGW(TAG, "RESUME TASK");
            }
        }
    }
    free(buf);
    return ESP_OK;
}

//Static web resources URIs handlers
esp_err_t index_handler(httpd_req_t *req)
{
    extern const unsigned char index_html_gz_start[] asm("_binary_index_html_gz_start");
    extern const unsigned char index_html_gz_end[] asm("_binary_index_html_gz_end");
    size_t index_html_gz_len = index_html_gz_end - index_html_gz_start;
    printf("index_html_gz_len: %zd\n", index_html_gz_len);

    httpd_resp_set_type(req, "text/html");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");

    return httpd_resp_send(req, (const char *)index_html_gz_start, index_html_gz_len);
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

esp_err_t script_handler(httpd_req_t *req)
{
    extern const unsigned char script_js_gz_start[] asm("_binary_script_js_gz_start");
    extern const unsigned char script_js_gz_end[] asm("_binary_script_js_gz_end");
    size_t script_js_gz_len = script_js_gz_end - script_js_gz_start;
    httpd_resp_set_type(req, "application/javascript");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)script_js_gz_start, script_js_gz_len);
}

esp_err_t communication_handler(httpd_req_t *req)
{
    extern const unsigned char communication_js_gz_start[] asm("_binary_communication_js_gz_start");
    extern const unsigned char communication_js_gz_end[] asm("_binary_communication_js_gz_end");
    size_t communication_js_gz_len = communication_js_gz_end - communication_js_gz_start;
    httpd_resp_set_type(req, "application/javascript");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)communication_js_gz_start, communication_js_gz_len);
}

esp_err_t utils_handler(httpd_req_t *req)
{
    extern const unsigned char utils_js_gz_start[] asm("_binary_utils_js_gz_start");
    extern const unsigned char utils_js_gz_end[] asm("_binary_utils_js_gz_end");
    size_t utils_js_gz_len = utils_js_gz_end - utils_js_gz_start;
    httpd_resp_set_type(req, "application/javascript");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)utils_js_gz_start, utils_js_gz_len);
}

esp_err_t joystick_handler(httpd_req_t *req)
{
    extern const unsigned char joystick_js_gz_start[] asm("_binary_joystick_js_gz_start");
    extern const unsigned char joystick_js_gz_end[] asm("_binary_joystick_js_gz_end");
    size_t joystick_js_gz_len = joystick_js_gz_end - joystick_js_gz_start;
    httpd_resp_set_type(req, "application/javascript");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)joystick_js_gz_start, joystick_js_gz_len);
}

esp_err_t arrow_bar_left_handler(httpd_req_t *req)
{
    extern const unsigned char arrow_bar_left_svg_gz_start[] asm("_binary_arrow_bar_left_svg_gz_start");
    extern const unsigned char arrow_bar_left_svg_gz_end[] asm("_binary_arrow_bar_left_svg_gz_end");
    size_t arrow_bar_left_svg_gz_len = arrow_bar_left_svg_gz_end - arrow_bar_left_svg_gz_start;
    httpd_resp_set_type(req, "image/svg+xml");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)arrow_bar_left_svg_gz_start, arrow_bar_left_svg_gz_len);
}

esp_err_t arrow_bar_right_handler(httpd_req_t *req)
{
    extern const unsigned char arrow_bar_right_svg_gz_start[] asm("_binary_arrow_bar_right_svg_gz_start");
    extern const unsigned char arrow_bar_right_svg_gz_end[] asm("_binary_arrow_bar_right_svg_gz_end");
    size_t arrow_bar_right_svg_gz_len = arrow_bar_right_svg_gz_end - arrow_bar_right_svg_gz_start;
    httpd_resp_set_type(req, "image/svg+xml");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)arrow_bar_right_svg_gz_start, arrow_bar_right_svg_gz_len);
}

esp_err_t camera_video_handler(httpd_req_t *req)
{
    extern const unsigned char camera_video_svg_gz_start[] asm("_binary_camera_video_svg_gz_start");
    extern const unsigned char camera_video_svg_gz_end[] asm("_binary_camera_video_svg_gz_end");
    size_t camera_video_svg_gz_len = camera_video_svg_gz_end - camera_video_svg_gz_start;
    httpd_resp_set_type(req, "image/svg+xml");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)camera_video_svg_gz_start, camera_video_svg_gz_len);
}

esp_err_t gear_handler(httpd_req_t *req)
{
    extern const unsigned char gear_svg_gz_start[] asm("_binary_gear_svg_gz_start");
    extern const unsigned char gear_svg_gz_end[] asm("_binary_gear_svg_gz_end");
    size_t gear_svg_gz_len = gear_svg_gz_end - gear_svg_gz_start;
    httpd_resp_set_type(req, "image/svg+xml");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)gear_svg_gz_start, gear_svg_gz_len);
}

esp_err_t joystick_base_handler(httpd_req_t *req)
{
    extern const unsigned char joystick_base_png_gz_start[] asm("_binary_joystick_base_png_gz_start");
    extern const unsigned char joystick_base_png_gz_end[] asm("_binary_joystick_base_png_gz_end");
    size_t joystick_base_png_gz_len = joystick_base_png_gz_end - joystick_base_png_gz_start;
    httpd_resp_set_type(req, "image/png");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)joystick_base_png_gz_start, joystick_base_png_gz_len);
}

esp_err_t joystick_orange_handler(httpd_req_t *req)
{
    extern const unsigned char joystick_orange_png_gz_start[] asm("_binary_joystick_orange_png_gz_start");
    extern const unsigned char joystick_orange_png_gz_end[] asm("_binary_joystick_orange_png_gz_end");
    size_t joystick_orange_png_gz_len = joystick_orange_png_gz_end - joystick_orange_png_gz_start;
    httpd_resp_set_type(req, "image/png");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)joystick_orange_png_gz_start, joystick_orange_png_gz_len);
}

esp_err_t logo_handler(httpd_req_t *req)
{
    extern const unsigned char lynxmotion_logo_png_gz_start[] asm("_binary_lynxmotion_logo_png_gz_start");
    extern const unsigned char lynxmotion_logo_png_gz_end[] asm("_binary_lynxmotion_logo_png_gz_end");
    size_t lynxmotion_logo_png_gz_len = lynxmotion_logo_png_gz_end - lynxmotion_logo_png_gz_start;
    httpd_resp_set_type(req, "image/png");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)lynxmotion_logo_png_gz_start, lynxmotion_logo_png_gz_len);
}

esp_err_t icon_handler(httpd_req_t *req)
{
    extern const unsigned char lynxmotion_icon_32x32_png_gz_start[] asm("_binary_lynxmotion_icon_32x32_png_gz_start");
    extern const unsigned char lynxmotion_icon_32x32_png_gz_end[] asm("_binary_lynxmotion_icon_32x32_png_gz_end");
    size_t lynxmotion_icon_32x32_png_gz_len = lynxmotion_icon_32x32_png_gz_end - lynxmotion_icon_32x32_png_gz_start;
    httpd_resp_set_type(req, "image/png");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)lynxmotion_icon_32x32_png_gz_start, lynxmotion_icon_32x32_png_gz_len);
}

httpd_handle_t setup_server(void)
{
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.max_uri_handlers = 20;  // Adjust as needed
    config.lru_purge_enable = true;

    ESP_LOGI(TAG, "Starting server on port: %d", config.server_port);

    //Comunication URI for wifi manager using websocket
    httpd_uri_t ws_data_uri = {
        .uri = "/cmd",
        .method = HTTP_GET,
        .handler = ws_handler,
        .user_ctx = NULL,
        .handle_ws_control_frames = false,
        .is_websocket = true,
        .supported_subprotocol = "http"};
    
    httpd_uri_t ws_image_uri = {
        .uri = "/camera",
        .method = HTTP_GET,
        .handler = ws_camera,
        .user_ctx = NULL,
        .handle_ws_control_frames = false,
        .is_websocket = true,
        .supported_subprotocol = "http"};

    //Static files for wifi manager web page
    httpd_uri_t index_uri = {
        .uri = "/",
        .method = HTTP_GET,
        .handler = index_handler,
        .user_ctx = NULL};

    httpd_uri_t style_uri = {
        .uri = "/style.css",
        .method = HTTP_GET,
        .handler = style_handler,
        .user_ctx = NULL};

    httpd_uri_t script_uri = {
        .uri = "/script.js",
        .method = HTTP_GET,
        .handler = script_handler,
        .user_ctx = NULL};

    httpd_uri_t communication_uri = {
        .uri = "/communication.js",
        .method = HTTP_GET,
        .handler = communication_handler,
        .user_ctx = NULL};

    httpd_uri_t utils_uri = {
        .uri = "/utils.js",
        .method = HTTP_GET,
        .handler = utils_handler,
        .user_ctx = NULL};

    httpd_uri_t joystick_uri = {
        .uri = "/joystick.js",
        .method = HTTP_GET,
        .handler = joystick_handler,
        .user_ctx = NULL};

    httpd_uri_t arrow_bar_left_uri = {
        .uri = "/arrow-bar-left.svg",
        .method = HTTP_GET,
        .handler = arrow_bar_left_handler,
        .user_ctx = NULL};

    httpd_uri_t arrow_bar_right_uri = {
        .uri = "/arrow-bar-right.svg",
        .method = HTTP_GET,
        .handler = arrow_bar_right_handler,
        .user_ctx = NULL};

    httpd_uri_t camera_video_uri = {
        .uri = "/camera-video.svg",
        .method = HTTP_GET,
        .handler = camera_video_handler,
        .user_ctx = NULL};

    httpd_uri_t gear_uri = {
        .uri = "/gear.svg",
        .method = HTTP_GET,
        .handler = gear_handler,
        .user_ctx = NULL};

    httpd_uri_t joystick_base_uri = {
        .uri = "/joystick-base.png",
        .method = HTTP_GET,
        .handler = joystick_base_handler,
        .user_ctx = NULL};

    httpd_uri_t joystick_orange_uri = {
        .uri = "/joystick-orange.png",
        .method = HTTP_GET,
        .handler = joystick_orange_handler,
        .user_ctx = NULL};

    httpd_uri_t logo_uri = {
        .uri = "/lynxmotion_logo.png",
        .method = HTTP_GET,
        .handler = logo_handler,
        .user_ctx = NULL};

    httpd_uri_t icon_uri = {
        .uri = "/lynxmotion_icon_32x32.png",
        .method = HTTP_GET,
        .handler = icon_handler,
        .user_ctx = NULL};

    if (httpd_start(&server, &config) == ESP_OK)
    {
        httpd_register_uri_handler(server, &index_uri);
        httpd_register_uri_handler(server, &style_uri);
        httpd_register_uri_handler(server, &script_uri);
        httpd_register_uri_handler(server, &communication_uri);
        httpd_register_uri_handler(server, &utils_uri);
        httpd_register_uri_handler(server, &joystick_uri);
        httpd_register_uri_handler(server, &arrow_bar_left_uri);
        httpd_register_uri_handler(server, &arrow_bar_right_uri);
        httpd_register_uri_handler(server, &camera_video_uri);
        httpd_register_uri_handler(server, &gear_uri);
        httpd_register_uri_handler(server, &joystick_base_uri);
        httpd_register_uri_handler(server, &joystick_orange_uri);
        httpd_register_uri_handler(server, &logo_uri);
        httpd_register_uri_handler(server, &icon_uri);
        httpd_register_uri_handler(server, &ws_image_uri);
        httpd_register_uri_handler(server, &ws_data_uri);
        return server;
    } 
    else 
    {
        return NULL;
    }
}